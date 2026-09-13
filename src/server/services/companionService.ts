import { isValidUuid, shouldEmitCompanionSignal } from '../engine/providers';
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from '../engine/interventionEngine/safety';
import { memoryService } from './memoryService';
import { geminiClient, escapeXml } from './geminiClient';
import { SignalExtractor } from '../engine/signalExtractor';
import { stateService } from './stateService';

export { escapeXml };

export interface UnifiedCompanionResponse {
  message: string;
  reply: string;
  suggestions: string[];
  suggestedPathways: string[];
  timestamp: string;
  isCrisisDetected?: boolean;
}

const DEFAULT_PATHWAYS = [
  'Guide me through a calming breath',
  'Help me reframe this feeling',
  'I want to reflect on my day',
];

export const companionService = {
  /**
   * Authoritative Companion interaction pipeline:
   * 1. Ingress SafetyScreening (Absolute safety boundary)
   * 2. Passive Memory Context resolution
   * 3. Centralized geminiClient execution with resilient fallback
   * 4. Canonical WellnessSignal extraction (only when legitimately warranted)
   * 5. StateService ingestion
   */
  async chat(
    userId: string,
    message: string,
    conversation: any[] = [],
    mode: string = 'Empathetic Listener'
  ): Promise<UnifiedCompanionResponse> {
    const trimmedMessage = (message || '').trim();
    if (!trimmedMessage) {
      throw new Error('EMPTY_MESSAGE');
    }

    // ─── 1. ABSOLUTE INGRESS SAFETY SCREENING ────────────────────────────
    const crisis = screenForCrisis(trimmedMessage);
    if (crisis.isCrisisDetected) {
      const helplineNotice = crisis.helplineNotice || CRISIS_HELPLINE_MESSAGE;
      const crisisSuggestions = ['Call 988', 'Crisis Text Line', 'Reach out for help'];
      return {
        message: helplineNotice,
        reply: helplineNotice,
        suggestions: crisisSuggestions,
        suggestedPathways: crisisSuggestions,
        timestamp: new Date().toISOString(),
        isCrisisDetected: true,
      };
    }

    // ─── 2. RESOLVE ACTIVE MEMORIES ──────────────────────────────────────
    let memories: Array<{ category: string; summary: string }> = [];
    if (userId && isValidUuid(userId)) {
      try {
        const activeMemories = await memoryService.resolveActiveMemoryContext(userId, 5);
        memories = activeMemories.map((m) => ({ category: m.category, summary: m.summary }));
      } catch {
        // Continue safely without memory if service unavailable
      }
    }

    // ─── 3. NORMALIZE CONVERSATION HISTORY ────────────────────────────────
    const normalizedConversation: Array<{ role: string; content: string; timestamp?: string }> = Array.isArray(conversation)
      ? conversation
          .filter((item: any) => item && (item.text || item.content))
          .map((item: any) => ({
            role: item.sender === 'user' || item.role === 'user' ? 'user' : 'assistant',
            content: item.text || item.content,
            timestamp: item.timestamp,
          }))
      : [];

    // ─── 4. EXECUTE VIA CENTRALIZED GEMINI CLIENT ────────────────────────
    let response: { message: string; suggestions?: string[]; timestamp: string };
    try {
      response = await geminiClient.chat(
        userId,
        trimmedMessage,
        normalizedConversation,
        mode,
        undefined, // journalContext resolved internally if authenticated
        memories
      );
    } catch (err) {
      console.warn('[CompanionService] Fallback to resilient offline response:', err);
      response = {
        message: 'I am present with you. How can I support your inner peace and clarity today?',
        suggestions: DEFAULT_PATHWAYS,
        timestamp: new Date().toISOString(),
      };
    }

    const reply = response.message;
    const pathways = response.suggestions && response.suggestions.length > 0
      ? response.suggestions
      : DEFAULT_PATHWAYS;

    // ─── 5. CANONICAL SIGNAL EXTRACTION (ONLY WHEN LEGITIMATELY SUPPORTED)
    if (userId && isValidUuid(userId)) {
      try {
        const historyCount = normalizedConversation.length || 1;
        if (shouldEmitCompanionSignal(trimmedMessage, historyCount)) {
          const companionSignal = SignalExtractor.fromCompanionSession({
            userId,
            mode,
            recentMessagesCount: historyCount,
          });
          await stateService.ingestSignal(companionSignal);
        }
      } catch (sigErr) {
        console.warn('[CompanionService] Signal ingestion notice:', sigErr);
      }
    }

    return {
      message: reply,
      reply,
      suggestions: pathways,
      suggestedPathways: pathways,
      timestamp: response.timestamp || new Date().toISOString(),
      isCrisisDetected: false,
    };
  },
};