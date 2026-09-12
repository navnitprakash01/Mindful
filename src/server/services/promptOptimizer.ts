import type { JournalContextEntry, JournalContext, ConversationMessage } from '../types/companion';
import { PROMPT_CONFIG, logPromptVersion } from './promptVersion';

const CONFIG = PROMPT_CONFIG;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function deduplicateThemes(themes: string[]): string[] {
  const seen = new Set<string>();
  return themes.filter((theme) => {
    const normalized = theme.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function cleanEntry(entry: JournalContextEntry): JournalContextEntry {
  return {
    date: entry.date,
    emotion: entry.emotion.trim(),
    summary: truncate(entry.summary.trim(), CONFIG.MAX_JOURNAL_SUMMARY_CHARS),
    themes: deduplicateThemes(entry.themes.map((t) => t.trim()).filter(Boolean)).slice(0, CONFIG.MAX_THEMES_PER_ENTRY),
  };
}

export function optimizeJournalContext(context: JournalContext): JournalContext {
  if (!context.hasContext || !context.entries.length) {
    return { entries: [], hasContext: false };
  }

  const validEntries = context.entries
    .filter((e) => e.emotion || e.summary)
    .map(cleanEntry)
    .slice(0, CONFIG.MAX_JOURNAL_ENTRIES);

  logPromptVersion('journal_context_optimized', {
    originalCount: context.entries.length,
    optimizedCount: validEntries.length,
    hasContext: validEntries.length > 0,
  });

  return {
    entries: validEntries,
    hasContext: validEntries.length > 0,
  };
}

export function optimizeConversation(messages: Array<{ role: string; content: string; timestamp?: string }>): Array<{ role: string; content: string; timestamp?: string }> {
  if (!messages.length) return [];

  const validMessages = messages
    .filter((m) => m.content?.trim())
    .slice(-CONFIG.MAX_CONVERSATION_MESSAGES);

  return validMessages;
}

export function buildOptimizedPromptContext(
  mode: string,
  conversation: Array<{ role: string; content: string; timestamp?: string }>,
  journalContext: JournalContext,
  currentMessage: string,
  systemPrompt: string
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const optimizedJournal = optimizeJournalContext(journalContext);
  const optimizedConversation = optimizeConversation(
    conversation.slice(-CONFIG.MAX_CONVERSATION_MESSAGES)
  );

  let userPrompt = '';

  if (optimizedJournal.hasContext) {
    userPrompt += 'Recent Journal Context:\n';
    optimizedJournal.entries.forEach((entry, i) => {
      userPrompt += `${i + 1}. ${entry.date} — ${entry.emotion}\n`;
      userPrompt += `   Summary: ${entry.summary}\n`;
      if (entry.themes.length > 0) {
        userPrompt += `   Themes: ${entry.themes.join(', ')}\n`;
      }
    });
    userPrompt += '\n';
  }

  if (conversation.length > 0) {
    userPrompt += 'Recent Conversation:\n';
    conversation.slice(-10).forEach((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Companion';
      userPrompt += `${role}: ${msg.content}\n`;
    });
    userPrompt += '\n';
  }

  userPrompt += `Current User Message: ${currentMessage.trim()}\n\n`;
  userPrompt += 'Respond as the Mindful AI Companion. Return ONLY valid JSON with this exact structure:\n';
  userPrompt += '{\n';
  userPrompt += '  "message": "string (your response)",\n';
  userPrompt += '  "suggestions": ["string", "string", "string"] (optional, up to 3 follow-up suggestions),\n';
  userPrompt += '  "timestamp": "ISO string"\n';
  userPrompt += '}';

  logPromptVersion('prompt_built', {
    promptLength: systemPrompt.length + userPrompt.length,
    journalEntries: journalContext.entries.length,
    conversationMessages: conversation.length,
    currentMessageLength: currentMessage.length,
  });

  return { systemPrompt, userPrompt };
}