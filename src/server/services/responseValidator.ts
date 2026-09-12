import { logPromptVersion } from './promptVersion';

export interface ValidatedCompanionResponse {
  message: string;
  suggestions: string[];
  timestamp: string;
}

const FALLBACK_RESPONSE: ValidatedCompanionResponse = {
  message: "I'm sorry, I couldn't process that response.",
  suggestions: [],
  timestamp: new Date().toISOString(),
};

interface ParsedResponse {
  message?: string;
  suggestions?: string[];
  timestamp?: string;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function validateTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) throw new Error();
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function validateCompanionResponse(rawResponse: string, context?: string): ValidatedCompanionResponse {
  let parsed: ParsedResponse;

  try {
    parsed = JSON.parse(rawResponse);
  } catch (error) {
    logPromptVersion('json_parse_failed', { context, error: String(error), rawLength: rawResponse.length });
    return FALLBACK_RESPONSE;
  }

  const message = isString(parsed.message) && parsed.message.trim() ? parsed.message.trim() : FALLBACK_RESPONSE.message;

  let suggestions: string[] = [];
  if (isStringArray(parsed.suggestions)) {
    suggestions = parsed.suggestions
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  const timestamp = isString(parsed.timestamp) ? validateTimestamp(parsed.timestamp) : new Date().toISOString();

  const validated: ValidatedCompanionResponse = { message, suggestions, timestamp };

  logPromptVersion('response_validated', {
    messageLength: message.length,
    suggestionsCount: suggestions.length,
  });

  return validated;
}