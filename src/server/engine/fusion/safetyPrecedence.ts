/**
 * Universal Crisis & Safety Precedence Subsystem
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Implements absolute safety precedence across all modalities:
 * If crisis indicators or self-harm markers appear in ANY active modality
 * (e.g., text journal, companion dialogue, voice transcript, or check-in notes),
 * the safety gate triggers immediately.
 *
 * Calm vocal acoustics, positive self-report sliders, or low stress scores
 * CANNOT suppress, neutralize, or mask crisis markers.
 */

import { WellnessSignal, StateEvidenceItem } from '../types';
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from '../interventionEngine/safety';

export interface SafetyPrecedenceEvaluation {
  isCrisisDetected: boolean;
  matchedTrigger?: string;
  helplineNotice?: string;
  crisisSignalId?: string;
  crisisModality?: string;
  crisisEvidenceItem?: StateEvidenceItem;
}

/**
 * Deterministically evaluates all active signals for crisis markers.
 */
export function evaluateSafetyPrecedence(
  signals: WellnessSignal[],
  additionalContextText?: string
): SafetyPrecedenceEvaluation {
  // 1. Check additional context text if provided
  if (additionalContextText) {
    const textScreen = screenForCrisis(additionalContextText);
    if (textScreen.isCrisisDetected) {
      return {
        isCrisisDetected: true,
        matchedTrigger: textScreen.matchedTrigger,
        helplineNotice: textScreen.helplineNotice || CRISIS_HELPLINE_MESSAGE,
        crisisEvidenceItem: {
          id: `ev-crisis-context-${Date.now()}`,
          source: 'baseline',
          observation: 'Immediate crisis markers identified in user reflection; 24/7 resources provided.',
          dimension: 'stress',
          contribution: 'elevating',
          directionText: 'Crisis Precedence Triggered',
          weight: 1.0,
          confidence: 1.0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // 2. Scan every active signal
  for (const signal of signals) {
    // Check features text
    const textsToScreen: string[] = [];
    if (signal.features.sentimentSummary) textsToScreen.push(signal.features.sentimentSummary);
    if (signal.features.triggers) textsToScreen.push(...signal.features.triggers);
    if (signal.features.themes) textsToScreen.push(...signal.features.themes);
    if (signal.features.somaticSensations) textsToScreen.push(...signal.features.somaticSensations);

    // Check custom fields that may be passed in features
    const anyFeatures = signal.features as Record<string, any>;
    if (typeof anyFeatures.notes === 'string') textsToScreen.push(anyFeatures.notes);
    if (typeof anyFeatures.transcript === 'string') textsToScreen.push(anyFeatures.transcript);
    if (typeof anyFeatures.content === 'string') textsToScreen.push(anyFeatures.content);

    for (const text of textsToScreen) {
      const screen = screenForCrisis(text);
      if (screen.isCrisisDetected) {
        return {
          isCrisisDetected: true,
          matchedTrigger: screen.matchedTrigger,
          helplineNotice: screen.helplineNotice || CRISIS_HELPLINE_MESSAGE,
          crisisSignalId: signal.id,
          crisisModality: signal.modality,
          crisisEvidenceItem: {
            id: `ev-crisis-${signal.id}`,
            source: signal.modality,
            observation: 'Crisis indicators identified in user input; safety precedence engaged.',
            dimension: 'stress',
            contribution: 'elevating',
            directionText: 'Immediate Safety Protocol',
            weight: 1.0,
            confidence: 1.0,
            timestamp: signal.timestamp,
            referenceId: signal.sourceId || signal.id,
          },
        };
      }
    }
  }

  return {
    isCrisisDetected: false,
  };
}
