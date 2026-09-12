import { logger } from './logger';
import { validateCompanionResponse } from './responseValidator';
import { buildOptimizedPromptContext } from './promptOptimizer';
import { PROMPT_CONFIG } from './promptVersion';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';

const CONFIG = PROMPT_CONFIG;

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG = {
  maxRetries: CONFIG.MAX_RETRIES,
  baseDelayMs: CONFIG.RETRY_BASE_DELAY_MS,
  timeoutMs: CONFIG.GEMINI_TIMEOUT_MS,
};

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'mindful-companion' } },
  });
}

function buildSystemPrompt(mode: string): string {
  const basePrompt = `You are Mindful AI Companion, a supportive and calm presence for emotional wellness conversations. 

Guidelines:
- Be warm, non-judgmental, and supportive
- Encourage reflection through thoughtful questions
- Never diagnose, provide medical advice, or pretend to be a therapist
- Avoid saying "I read your journals" or "I see your journals"
- If journal context is provided, reference it naturally: "I remember you've been feeling..." or "You mentioned earlier..."
- Prefer open-ended questions over assumptions
- Keep responses concise but meaningful (2-4 sentences)
- Never diagnose or provide clinical advice`;

  const modePrompts: Record<string, string> = {
    'Empathetic Listener': '\n\nMode: Empathetic Listener - Focus on presence, validation, and gentle exploration.',
    'Mindful Coach': '\n\nMode: Mindful Coach - Offer gentle guidance, practical micro-habits, and forward momentum.',
    'Stoic Philosopher': '\n\nMode: Stoic Philosopher - Share grounded wisdom, perspective on control, and calm acceptance.',
    'CBT Reframer': '\n\nMode: CBT Reframer - Help gently identify cognitive patterns and offer alternative perspectives.',
  };

  return basePrompt + (modePrompts[mode] || modePrompts['Empathetic Listener']);
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function callGeminiWithTimeout(
  ai: any,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number
): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('GEMINI_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const apiPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    }).then((res: any) => res.text || '{}');

    const result = await Promise.race([apiPromise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string,
  config: { maxRetries: number; baseDelayMs: number; timeoutMs: number }
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const ai = getAiClient();
      if (!ai) throw new Error('Gemini API not configured');

      const result = await callGeminiWithTimeout(
        getAiClient(),
        systemPrompt,
        userPrompt,
        20000
      );
      if (attempt > 0) {
        logger.retry('gemini', 'Retry successful', { attempt: attempt + 1 });
      }
      return result;
    } catch (error) {
      const lastError = error instanceof Error ? error : new Error(String(error));

      const isTimeout = lastError.message === 'GEMINI_TIMEOUT';
      const isRetryable = isTimeout || 
        lastError.message.includes('500') || 
        lastError.message.includes('503') || 
        lastError.message.includes('504');

      if (attempt < 1 && (lastError.message === 'GEMINI_TIMEOUT' || 
        lastError.message.includes('500') || 
        lastError.message.includes('503') || 
        lastError.message.includes('504'))) {
        const delay = 500 * Math.pow(2, attempt);
        logger.retry('gemini', `Attempt ${attempt + 1} failed, retrying`, { 
          delayMs: 500 * Math.pow(2, attempt), 
          error: error instanceof Error ? error.message : String(error) 
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw lastError || new Error('Gemini request failed after retries');
    }
  }

  throw new Error('Gemini request failed after retries');
}

async function getJournalContext(userId: string) {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('created_at, emotion, ai_summary, ai_analysis, tags, mood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return { entries: [], hasContext: false };
    }

    const entries = data.map((row: any) => ({
      date: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      emotion: row.emotion || row.mood || 'Reflective',
      summary: row.ai_summary || row.ai_analysis || 'Journal entry',
      themes: row.tags || [],
    }));

    return { entries, hasContext: entries.length > 0 };
  } catch {
    return { entries: [], hasContext: false };
  }
}

async function callGemini(
  userId: string,
  message: string,
  conversation: Array<{ role: string; content: string; timestamp?: string }>,
  mode: string,
  journalContext: { entries: any[]; hasContext: boolean }
): Promise<{ message: string; suggestions?: string[]; timestamp: string }> {
  const systemPrompt = buildSystemPrompt(mode);

  const { userPrompt } = buildOptimizedPromptContext(
    mode,
    conversation.slice(-10),
    { entries: journalContext.entries, hasContext: journalContext.hasContext },
    message,
    ''
  );

  const fullUserPrompt = `${userPrompt}

Respond as the Mindful AI Companion. Return ONLY valid JSON with this exact structure:
{
  "message": "string (your response)",
  "suggestions": ["string", "string", "string"] (optional, up to 3 follow-up suggestions),
  "timestamp": "ISO string"
}`;

  let responseText: string;
  try {
    responseText = await callGeminiWithRetry(buildSystemPrompt(mode), 
      `${userPrompt}

Respond as the Mindful AI Companion. Return ONLY valid JSON with this exact structure:
{
  "message": "string (your response)",
  "suggestions": ["string", "string", "string"] (optional, up to 3 follow-up suggestions),
  "timestamp": "ISO string"
}`, 
      { maxRetries: 1, baseDelayMs: 500, timeoutMs: 20000 }
    );
  } catch (error) {
    logger.error('gemini', 'All retry attempts failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  const { validateCompanionResponse } = await import('./responseValidator');
  const validated = validateCompanionResponse(responseText, 'gemini_chat');

  return validated;
}

export const geminiClient = {
  async chat(
    userId: string,
    message: string,
    conversation: Array<{ role: string; content: string; timestamp?: string }>,
    mode: string = 'Empathetic Listener'
  ): Promise<{ message: string; suggestions?: string[]; timestamp: string }> {
    const startTime = Date.now();

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new Error('EMPTY_MESSAGE');
    }
    if (trimmedMessage.length > 4000) {
      throw new Error('MESSAGE_TOO_LONG');
    }

    const journalContext = await getJournalContext(userId);

    try {
      const result = await callGemini(userId, trimmedMessage, conversation, mode, journalContext);

      const latency = Date.now() - startTime;
      logger.gemini('chat_completed', 'Request completed', {
        latencyMs: latency,
        promptLength: trimmedMessage.length,
        responseLength: result.message.length,
        hasJournalContext: journalContext.hasContext,
        mode,
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('gemini_chat', 'Request failed', error instanceof Error ? error : new Error(String(error)), {
        latencyMs: latency,
        mode,
        userMessageLength: message.length,
      });

      if (error instanceof Error && error.message === 'EMPTY_MESSAGE') {
        return {
          message: "I didn't catch that. Could you share what's on your mind?",
          suggestions: ['Try again', 'Take a deep breath'],
          timestamp: new Date().toISOString(),
        };
      }
      if (error instanceof Error && error.message === 'MESSAGE_TOO_LONG') {
        return {
          message: "Your message is a bit long. Could you share the key points?",
          suggestions: ['Summarize your thoughts', 'Focus on one thing'],
          timestamp: new Date().toISOString(),
        };
      }

      return {
        message: "I'm having trouble responding right now. Please try again.",
        suggestions: ['Try again', 'Talk more', 'Breathing exercise'],
        timestamp: new Date().toISOString(),
      };
    }
  },
};