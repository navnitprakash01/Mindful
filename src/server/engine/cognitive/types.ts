/**
 * Cognitive Engine Domain Types & Contracts
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Strict Non-Clinical Scope:
 * - Telemetry is behavioral only; zero clinical or psychiatric diagnostic inferences.
 * - ZERO KEYLOGGING: No characters, keystrokes, clipboard, screenshots, or text content.
 * - Dimensional Boundary: Influences ONLY cognitiveLoad, focus, fatigue, and energy.
 *   Under NO circumstances does session_cognitive modify mood valence.
 */

export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'discarded';

export type FocusSessionType = 'pomodoro_25' | 'deep_work_50' | 'flow_90' | 'custom';

export interface CognitiveTelemetryWindow {
  intervalSeconds: number;
  attentionalShiftCount: number;
  activeTypingSeconds: number;
  typingCadenceEntropy: number; // Coefficient of variation [0.0, 2.0]
  subjectiveDifficulty?: number; // 1-5 scale (optional)
}

export interface CognitiveMetrics {
  sessionDurationMinutes: number;
  attentionalShiftRate: number; // Attentional shifts per minute
  typingCadenceEntropy: number; // Mean cadence entropy [0.0, 2.0]
  activeTypingRatio: number; // [0.0, 1.0]
  subjectiveDifficulty?: number; // 1-5
}

export interface CognitiveEstimate {
  cognitiveLoad: number; // [10, 95]
  focus: number; // [10, 95]
  fatigue: number; // [0, 100]
  energy: number; // [0, 100]
  confidence: number; // [0.10, 0.85]
  reliabilityWeight: number; // 0.70
  sentimentSummary: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  sessionType: FocusSessionType;
  plannedDurationMinutes: number;
  activityLabel?: string;
  status: FocusSessionStatus;
  startedAt: string;
  completedAt?: string;
  lastHeartbeatAt?: string;
  heartbeatCount: number;
  aggregatedTelemetry: {
    totalIntervalSeconds: number;
    totalAttentionalShifts: number;
    totalActiveTypingSeconds: number;
    cadenceEntropySamples: number[];
    latestSubjectiveDifficulty?: number;
  };
  summaryMetrics?: CognitiveMetrics;
  finalEstimate?: CognitiveEstimate;
}

export interface StartSessionInput {
  sessionType: FocusSessionType;
  plannedDurationMinutes: number;
  activityLabel?: string;
}

export interface CompleteSessionInput {
  sessionId: string;
  totalDurationMinutes?: number;
  summaryMetrics?: Partial<CognitiveMetrics>;
  selfReportedStrain?: number; // 1-5 scale or 10-95
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Forbidden telemetry keywords that would indicate invasive tracking or keylogging.
 * If any of these keys exist in the payload, the request is immediately rejected.
 */
export const FORBIDDEN_KEYLOG_FIELDS = [
  'key',
  'code',
  'keycode',
  'char',
  'characters',
  'text',
  'content',
  'value',
  'password',
  'clipboard',
  'screenshot',
  'screen',
  'url',
  'title',
  'documenttitle',
  'history',
  'appname',
  'application',
  'windowtitle',
  'rawkeystrokes',
  'keystrokes',
  'keys',
];

/**
 * Recursively inspect an object to verify that no forbidden keylogger / text fields are present.
 */
export function assertNoKeyloggingPayload(obj: unknown): ValidationResult {
  if (!obj || typeof obj !== 'object') {
    return { isValid: true };
  }

  for (const [rawKey, val] of Object.entries(obj as Record<string, unknown>)) {
    const keyLower = rawKey.toLowerCase();
    for (const forbidden of FORBIDDEN_KEYLOG_FIELDS) {
      if (
        keyLower === forbidden ||
        keyLower.startsWith(forbidden + '_') ||
        keyLower.endsWith('_' + forbidden) ||
        keyLower.includes(forbidden)
      ) {
        return {
          isValid: false,
          error: `Security violation: Forbidden field '${rawKey}' rejected. Mindful operates with zero-keylogging.`,
        };
      }
    }

    if (typeof val === 'object' && val !== null) {
      const nestedResult = assertNoKeyloggingPayload(val);
      if (!nestedResult.isValid) return nestedResult;
    }
  }

  return { isValid: true };
}

/**
 * Validates session start payload.
 */
export function validateStartSessionInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const noKeyResult = assertNoKeyloggingPayload(input);
  if (!noKeyResult.isValid) return noKeyResult;

  const data = input as Partial<StartSessionInput>;
  const validTypes: FocusSessionType[] = ['pomodoro_25', 'deep_work_50', 'flow_90', 'custom'];

  if (!data.sessionType || !validTypes.includes(data.sessionType)) {
    return { isValid: false, error: `Invalid sessionType. Must be one of: ${validTypes.join(', ')}` };
  }

  if (typeof data.plannedDurationMinutes !== 'number' || !Number.isFinite(data.plannedDurationMinutes)) {
    return { isValid: false, error: 'plannedDurationMinutes must be a finite number' };
  }

  if (data.plannedDurationMinutes < 5 || data.plannedDurationMinutes > 180) {
    return { isValid: false, error: 'plannedDurationMinutes must be between 5 and 180 minutes' };
  }

  if (data.activityLabel !== undefined) {
    if (typeof data.activityLabel !== 'string' || data.activityLabel.length > 80) {
      return { isValid: false, error: 'activityLabel must be a string with maximum 80 characters' };
    }
  }

  return { isValid: true };
}

/**
 * Validates telemetry window heartbeat payload.
 */
export function validateTelemetryWindow(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Telemetry payload must be an object' };
  }

  const noKeyResult = assertNoKeyloggingPayload(input);
  if (!noKeyResult.isValid) return noKeyResult;

  const data = input as Record<string, unknown>;

  // Validate intervalSeconds
  if (typeof data.intervalSeconds !== 'number' || !Number.isFinite(data.intervalSeconds)) {
    return { isValid: false, error: 'intervalSeconds must be a finite number' };
  }
  if (data.intervalSeconds < 5 || data.intervalSeconds > 3600) {
    return { isValid: false, error: 'intervalSeconds must be between 5 and 3600' };
  }

  // Validate attentionalShiftCount
  if (typeof data.attentionalShiftCount !== 'number' || !Number.isFinite(data.attentionalShiftCount)) {
    return { isValid: false, error: 'attentionalShiftCount must be a finite number' };
  }
  if (data.attentionalShiftCount < 0 || data.attentionalShiftCount > 300) {
    return { isValid: false, error: 'attentionalShiftCount must be between 0 and 300' };
  }

  // Validate activeTypingSeconds
  if (typeof data.activeTypingSeconds !== 'number' || !Number.isFinite(data.activeTypingSeconds)) {
    return { isValid: false, error: 'activeTypingSeconds must be a finite number' };
  }
  if (data.activeTypingSeconds < 0 || data.activeTypingSeconds > data.intervalSeconds) {
    return { isValid: false, error: 'activeTypingSeconds must be non-negative and <= intervalSeconds' };
  }

  // Validate typingCadenceEntropy
  if (typeof data.typingCadenceEntropy !== 'number' || !Number.isFinite(data.typingCadenceEntropy)) {
    return { isValid: false, error: 'typingCadenceEntropy must be a finite number' };
  }
  if (data.typingCadenceEntropy < 0.0 || data.typingCadenceEntropy > 2.0) {
    return { isValid: false, error: 'typingCadenceEntropy must be between 0.0 and 2.0' };
  }

  // Validate optional subjectiveDifficulty
  if (data.subjectiveDifficulty !== undefined) {
    if (typeof data.subjectiveDifficulty !== 'number' || !Number.isFinite(data.subjectiveDifficulty)) {
      return { isValid: false, error: 'subjectiveDifficulty must be a finite number' };
    }
    if (data.subjectiveDifficulty < 1 || data.subjectiveDifficulty > 5) {
      return { isValid: false, error: 'subjectiveDifficulty must be between 1 and 5' };
    }
  }

  return { isValid: true };
}

/**
 * Validates session completion payload.
 */
export function validateCompleteSessionInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const noKeyResult = assertNoKeyloggingPayload(input);
  if (!noKeyResult.isValid) return noKeyResult;

  const data = input as Partial<CompleteSessionInput>;

  if (!data.sessionId || typeof data.sessionId !== 'string') {
    return { isValid: false, error: 'sessionId is required and must be a string' };
  }

  if (data.totalDurationMinutes !== undefined) {
    if (typeof data.totalDurationMinutes !== 'number' || !Number.isFinite(data.totalDurationMinutes)) {
      return { isValid: false, error: 'totalDurationMinutes must be a finite number' };
    }
    if (data.totalDurationMinutes < 0 || data.totalDurationMinutes > 300) {
      return { isValid: false, error: 'totalDurationMinutes must be between 0 and 300 minutes' };
    }
  }

  if (data.selfReportedStrain !== undefined) {
    if (typeof data.selfReportedStrain !== 'number' || !Number.isFinite(data.selfReportedStrain)) {
      return { isValid: false, error: 'selfReportedStrain must be a finite number' };
    }
    if (data.selfReportedStrain < 1 || data.selfReportedStrain > 100) {
      return { isValid: false, error: 'selfReportedStrain must be between 1 and 100' };
    }
  }

  return { isValid: true };
}
