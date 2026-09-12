/**
 * Proactive Decision Engine
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Implements a strict, deterministic multi-gate policy pipeline.
 * This is a DECISION POLICY layer, NOT a wellness scoring engine.
 *
 * Evaluation sequence:
 * 1. SAFETY (Crisis check)
 * 2. USER OPT-IN
 * 3. QUIET HOURS
 * 4. DAILY FREQUENCY CAP
 * 5. COOLDOWN
 * 6. ACTIVE INTERVENTION IN PROGRESS
 * 7. RECENT DISMISSAL
 * 8. EVIDENCE SUFFICIENCY
 * 9. ACTION SELECTION
 *
 * Silence is the default state of the engine.
 */

import { PersonalState } from '../types';
import { PersonalPattern } from '../patternEngine/types';
import { InterventionSession } from '../interventionEngine/types';
import { screenForCrisis } from '../interventionEngine/safety';
import { PersonalMemory } from '../../services/memoryService';
import {
  ProactiveDecision,
  ProactiveEvent,
  ProactiveSettings,
  ProactiveActionType,
} from './types';
import {
  POLICY_VERSION,
  POLICY_LIMITS,
  DEFAULT_PROACTIVE_SETTINGS,
  isQuietHours,
} from './policyRules';

export interface ProactiveEvaluationContext {
  userId: string;
  currentState: PersonalState | null;
  patterns: PersonalPattern[];
  activeMemories: PersonalMemory[];
  recentEvents: ProactiveEvent[];
  activeInterventionSession?: InterventionSession | null;
  settings?: Partial<ProactiveSettings>;
  now?: Date;
  textContext?: string | null;
}

export class ProactiveDecisionEngine {
  public static evaluate(context: ProactiveEvaluationContext): ProactiveDecision {
    const now = context.now || new Date();
    const evaluatedAt = now.toISOString();
    const settings: ProactiveSettings = {
      ...DEFAULT_PROACTIVE_SETTINGS,
      ...context.settings,
    };

    // ─── GATE 1: SAFETY PRECEDENCE ──────────────────────────────────────────
    // Crisis, self-harm, or emergency markers immediately halt proactive contact.
    // Proactive intelligence must never override or dilute crisis screening.
    const crisisCheck = screenForCrisis(context.textContext);
    if (crisisCheck.isCrisisDetected) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'crisis_active',
        rationale: 'Active crisis indicator detected. Safety precedence triggers immediate lifeline support.',
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // Also screen contextual triggers in current state if present
    if (context.currentState?.contextualTriggers?.length) {
      for (const trigger of context.currentState.contextualTriggers) {
        if (screenForCrisis(trigger).isCrisisDetected) {
          return {
            shouldSurface: false,
            decisionType: 'suppressed',
            suppressionReason: 'crisis_active',
            rationale: 'Crisis marker in contextual triggers. Suppressing proactive outreach.',
            evidenceReferences: [],
            evaluatedAt,
            policyVersion: POLICY_VERSION,
          };
        }
      }
    }

    // ─── GATE 2: USER PROACTIVE OPT-IN ──────────────────────────────────────
    // Default is OFF. Explicit opt-in required.
    if (!settings.enabled) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'opt_in_disabled',
        rationale: 'Proactive intelligence is disabled in user settings. Mindful remains silent.',
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // ─── GATE 3: QUIET HOURS CHECK ──────────────────────────────────────────
    if (
      isQuietHours(
        now,
        settings.quietHoursStart,
        settings.quietHoursEnd,
        settings.userTimezone
      )
    ) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'quiet_hours_active',
        rationale: `Current time is within quiet hours (${settings.quietHoursStart}:00 - ${settings.quietHoursEnd}:00). Preserving user peace.`,
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // ─── GATE 4: GLOBAL FREQUENCY CAP ───────────────────────────────────────
    const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
    const surfacedPast24h = context.recentEvents.filter(
      (e) => e.decision === 'surfaced' && new Date(e.createdAt).getTime() >= oneDayAgo
    );
    if (surfacedPast24h.length >= settings.frequencyCapPerDay) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'frequency_cap_reached',
        rationale: `Daily frequency limit reached (${surfacedPast24h.length}/${settings.frequencyCapPerDay} per 24h). Preventing notification fatigue.`,
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // ─── GATE 5: COOLDOWN ENFORCEMENT ───────────────────────────────────────
    const lastSurfaced = context.recentEvents
      .filter((e) => e.decision === 'surfaced')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (lastSurfaced) {
      const msSinceLast = now.getTime() - new Date(lastSurfaced.createdAt).getTime();
      const hoursSinceLast = msSinceLast / (1000 * 60 * 60);
      if (hoursSinceLast < POLICY_LIMITS.DEFAULT_COOLDOWN_HOURS) {
        const remainingHours = Number(
          (POLICY_LIMITS.DEFAULT_COOLDOWN_HOURS - hoursSinceLast).toFixed(1)
        );
        return {
          shouldSurface: false,
          decisionType: 'suppressed',
          suppressionReason: 'cooldown_active',
          cooldownHoursRemaining: remainingHours,
          rationale: `Within ${POLICY_LIMITS.DEFAULT_COOLDOWN_HOURS}h cooldown window (${remainingHours}h remaining).`,
          evidenceReferences: [lastSurfaced.id],
          evaluatedAt,
          policyVersion: POLICY_VERSION,
        };
      }
    }

    // ─── GATE 6: ACTIVE INTERVENTION IN PROGRESS ────────────────────────────
    if (
      context.activeInterventionSession &&
      context.activeInterventionSession.status === 'started'
    ) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'active_intervention_in_progress',
        rationale: 'User is currently engaged in an active intervention session. Suppressing interruption.',
        evidenceReferences: [context.activeInterventionSession.id],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // ─── GATE 7: RECENT DISMISSAL ───────────────────────────────────────────
    const lastDismissed = context.recentEvents
      .filter((e) => e.decision === 'dismissed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (lastDismissed) {
      const msSinceDismissal = now.getTime() - new Date(lastDismissed.createdAt).getTime();
      const hoursSinceDismissal = msSinceDismissal / (1000 * 60 * 60);
      if (hoursSinceDismissal < POLICY_LIMITS.DISMISSAL_SUPPRESSION_HOURS) {
        return {
          shouldSurface: false,
          decisionType: 'suppressed',
          suppressionReason: 'recent_dismissal',
          rationale: `User dismissed a previous proactive prompt ${hoursSinceDismissal.toFixed(1)}h ago. Respecting dismissal buffer (${POLICY_LIMITS.DISMISSAL_SUPPRESSION_HOURS}h).`,
          evidenceReferences: [lastDismissed.id],
          evaluatedAt,
          policyVersion: POLICY_VERSION,
        };
      }
    }

    // ─── GATE 8: EVIDENCE SUFFICIENCY ───────────────────────────────────────
    // State confidence must be sufficient (not cold-start or uncalibrated)
    if (!context.currentState || context.currentState.overallConfidence < POLICY_LIMITS.MIN_STATE_CONFIDENCE) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'low_confidence_state',
        rationale: `State confidence (${context.currentState?.overallConfidence ?? 0}) is below minimum threshold (${POLICY_LIMITS.MIN_STATE_CONFIDENCE}). Baseline calibrating.`,
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // Check for validated mature patterns
    const maturePatterns = context.patterns.filter(
      (p) =>
        p.status === 'validated' &&
        p.confidence >= POLICY_LIMITS.MIN_PATTERN_CONFIDENCE &&
        p.observationCount >= POLICY_LIMITS.MIN_PATTERN_OBSERVATION_COUNT
    );

    // Check for meaningful state deviation from baseline
    const significantDeviations: string[] = [];
    if (context.currentState.dimensions) {
      for (const [dimKey, dimEst] of Object.entries(context.currentState.dimensions)) {
        if (dimEst && Math.abs(dimEst.baselineDeviation) >= 12 && dimEst.confidence >= 0.50) {
          significantDeviations.push(`${dimKey} (${dimEst.baselineDeviation > 0 ? '+' : ''}${Math.round(dimEst.baselineDeviation)} pts)`);
        }
      }
    }

    // Requires validated pattern OR strong state deviation with multiple contributing signals
    const hasSufficientEvidence =
      maturePatterns.length > 0 ||
      (significantDeviations.length > 0 && (context.currentState.activeSignalsCount || 0) >= 2);

    if (!hasSufficientEvidence) {
      return {
        shouldSurface: false,
        decisionType: 'suppressed',
        suppressionReason: 'insufficient_evidence',
        rationale: 'Insufficient longitudinal or state evidence to justify reaching out. Silence preserved.',
        evidenceReferences: [],
        evaluatedAt,
        policyVersion: POLICY_VERSION,
      };
    }

    // ─── GATE 9: ACTION SELECTION ───────────────────────────────────────────
    const evidenceRefs: string[] = [];
    maturePatterns.forEach((p) => evidenceRefs.push(p.id));
    context.activeMemories.forEach((m) => evidenceRefs.push(m.id));

    let actionType: ProactiveActionType = 'gentle_state_reflection';
    let headline = 'Mindful Check-In';
    let message = 'Would you like to take a quiet moment to observe how you are feeling?';
    let suggestedInterventionId: string | undefined = undefined;

    // Check if a pattern suggests a specific time-of-day check-in
    if (maturePatterns.length > 0) {
      const topPattern = maturePatterns[0];
      actionType = 'pattern_check_in';
      headline = 'Recurring Pattern Reflection';
      message = `Mindful noticed a recurring pattern (${topPattern.title.toLowerCase()}). Would a gentle check-in help support your rhythm?`;
    }

    // Check user preference memory to suggest a tailored intervention
    const preferenceMemories = context.activeMemories.filter((m) => m.category === 'preference');
    const goalMemories = context.activeMemories.filter((m) => m.category === 'goal');
    const affinityMemories = context.activeMemories.filter((m) => m.category === 'learned_affinity');

    if (context.currentState.stress >= 60 || context.currentState.fatigue >= 60) {
      actionType = 'intervention_suggestion';
      // Pick intervention matching user affinities or preferences
      if (affinityMemories.some((m) => m.key.includes('breath') || m.summary.toLowerCase().includes('breath'))) {
        suggestedInterventionId = 'box-breathing';
        headline = 'Gentle Breathing Reset';
        message = 'Your signals indicate elevated somatic tension. You previously rated box breathing highly — would you like to take 2 minutes to reset?';
      } else if (preferenceMemories.some((m) => m.summary.toLowerCase().includes('short') || m.summary.toLowerCase().includes('quick'))) {
        suggestedInterventionId = 'focus-reset';
        headline = 'Quick Micro-Reset';
        message = 'Noticed elevated cognitive demand. Would a 3-minute focus reset be helpful right now?';
      } else {
        suggestedInterventionId = 'box-breathing';
        headline = 'Pacing Suggestion';
        message = 'Your recent signals suggest a demanding period. A brief grounding reset is available whenever you are ready.';
      }
    }

    // Transparent, non-manipulative rationale
    const rationaleParts: string[] = [];
    if (maturePatterns.length > 0) {
      rationaleParts.push(`Validated pattern: ${maturePatterns[0].title}`);
    }
    if (significantDeviations.length > 0) {
      rationaleParts.push(`State shifts: ${significantDeviations.join(', ')}`);
    }
    if (goalMemories.length > 0) {
      rationaleParts.push(`Active goal: ${goalMemories[0].summary}`);
    }
    const rationale = rationaleParts.join(' | ') || 'Evidence aligns with helpful check-in opportunity.';

    return {
      shouldSurface: true,
      decisionType: 'surfaced',
      actionType,
      headline,
      message,
      rationale,
      evidenceReferences: evidenceRefs,
      suggestedInterventionId,
      evaluatedAt,
      policyVersion: POLICY_VERSION,
    };
  }
}
