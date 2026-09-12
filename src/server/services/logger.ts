import { PROMPT_VERSION } from './promptVersion';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  operation: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const sensitiveKeys = ['content', 'message', 'journal', 'conversation', 'text', 'prompt', 'userMessage'];

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatEntry(entry: LogEntry): string {
  const { timestamp, level, operation, message, metadata } = entry;
  const base = `[${timestamp}] [${level.toUpperCase()}] [Prompt v${PROMPT_VERSION}] ${operation}: ${message}`;
  if (metadata) {
    return base + ' | ' + JSON.stringify(sanitize(metadata));
  }
  return base;
}

export const logger = {
  info(operation: string, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      operation,
      message,
      metadata,
    };
    console.log(formatEntry(entry));
  },

  warn(operation: string, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      operation,
      message,
      metadata,
    };
    console.warn(formatEntry(entry));
  },

  error(operation: string, message: string, error?: Error | string, metadata?: Record<string, unknown>): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      operation,
      message: `${message}: ${errorObj.message}`,
      metadata: {
        ...metadata,
        error: {
          name: errorObj.name,
          message: errorObj.message,
          stack: errorObj.stack,
        },
      },
    };
    console.error(formatEntry(entry));
  },

  gemini(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.info(`gemini:${operation}`, message, metadata);
  },

  retry(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.warn(`retry:${operation}`, message, metadata);
  },

  timeout(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.error(`timeout:${operation}`, message, undefined, metadata);
  },

  validation(operation: string, message: string, metadata?: Record<string, unknown>): void {
    this.warn(`validation:${operation}`, message, metadata);
  },
};