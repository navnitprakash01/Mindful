/**
 * Safety & Crisis Screening Module
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Deterministic screening for crisis indicators, acute distress, or self-harm keywords.
 * If detected, immediately bypasses normal intervention recommendation and provides
 * direct access to 24/7 crisis lifelines.
 */

import { CrisisScreeningResult } from './types';

// Deterministic regex patterns for acute distress, self-harm, or suicidal ideation
const CRISIS_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /suicid|kill myself|want to die|end my life|end it all|better off dead/i, label: 'suicidal_ideation' },
  { regex: /self-harm|self harm|cutting myself|hurt myself|burn myself|overdose/i, label: 'self_harm' },
  { regex: /no reason to live|don't want to live|give up on living|can't go on anymore/i, label: 'severe_hopelessness' },
  { regex: /hopelessness|emergency|crisis|danger to myself/i, label: 'acute_crisis' }
];

export const CRISIS_HELPLINE_MESSAGE = 
  'If you are experiencing overwhelming distress, thoughts of self-harm, or a crisis, please reach out for immediate support. You are not alone and help is available 24/7:\n\n' +
  '• National Suicide and Crisis Lifeline: Call or text 988 (USA & Canada)\n' +
  '• Crisis Text Line: Text HOME to 741741\n' +
  '• The Trevor Project (LGBTQ youth): Call 1-866-488-7386 or text START to 678-678\n' +
  '• International Lifelines: Visit https://findahelpline.com or https://befrienders.org\n' +
  '• In immediate danger: Please call your local emergency services (e.g., 911, 999, 112).';

/**
 * Deterministically screens any input text for crisis markers.
 *
 * @param text Optional user input, notes, or contextual text to screen
 * @returns CrisisScreeningResult indicating if crisis was detected and helpline instructions
 */
export function screenForCrisis(text?: string | null): CrisisScreeningResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      isCrisisDetected: false
    };
  }

  const cleanText = text.trim();

  for (const { regex, label } of CRISIS_PATTERNS) {
    if (regex.test(cleanText)) {
      return {
        isCrisisDetected: true,
        matchedTrigger: label,
        helplineNotice: CRISIS_HELPLINE_MESSAGE
      };
    }
  }

  return {
    isCrisisDetected: false
  };
}
