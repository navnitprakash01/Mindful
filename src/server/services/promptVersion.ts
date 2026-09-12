export const PROMPT_VERSION = '1.0.0';

export const PROMPT_CONFIG = {
  MAX_JOURNAL_ENTRIES: 5,
  MAX_CONVERSATION_MESSAGES: 10,
  MAX_JOURNAL_SUMMARY_CHARS: 200,
  MAX_THEMES_PER_ENTRY: 5,
  MAX_USER_MESSAGE_CHARS: 4000,
  GEMINI_TIMEOUT_MS: 20000,
  MAX_RETRIES: 1,
  RETRY_BASE_DELAY_MS: 500,
} as const;

export function logPromptVersion(operation: string, metadata?: Record<string, unknown>): void {
  console.log(`[Prompt v${PROMPT_VERSION}] ${operation}`, metadata ? JSON.stringify(metadata) : '');
}