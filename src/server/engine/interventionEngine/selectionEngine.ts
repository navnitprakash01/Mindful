/**
 * Intervention Selection Engine
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Deterministic multi-factor scoring:
 * Suitability = 0.50 * StateFit + 0.25 * PatternFit + 0.25 * HistoryFit - CooldownPenalty
 *
 * Guaranteed non-clinical, zero-fabrication, and non-causal language.
 */

import { PersonalState, StateDimensionKey } from '../types';
import { PersonalPattern } from '../patternEngine/types';
import { INTERVENTION_LIBRARY } from './library';
import { screenForCrisis } from './safety';
import {
  InterventionDefinition,
  InterventionRecommendation,
  InterventionSession,
} from './types';

export interface SelectionContext {
  currentState: PersonalState | null;
  recentPatterns?: PersonalPattern[];
  sessionHistory?: InterventionSession[];
  currentTimestamp?: Date | string;
  textContext?: string | null;
}

/**
 * Evaluates state fit score (0.0 to 1.0) for a given intervention against current state snapshot.
 */
function computeStateFit(
  intervention: InterventionDefinition,
  state: PersonalState,
  currentHour: number
): { score: number; reasons: string[] } {
  let score = 0.5; // neutral baseline
  const reasons: string[] = [];

  // 1. Check time-of-day contextual alignment
  if (intervention.category === 'wind_down') {
    if (currentHour >= 20 || currentHour < 5) {
      score += 0.55;
      reasons.push('Evening hours align with parasympathetic wind-down');
    } else if (currentHour >= 9 && currentHour <= 17) {
      score -= 0.40; // Penalty for midday wind-down
    }
  } else if (currentHour >= 21 || currentHour < 5) {
    // Non-evening daytime resets (like focus sprint or desk postural reset) receive an evening discount
    if (intervention.category === 'focus' || intervention.category === 'activation' || intervention.category === 'recovery') {
      score -= 0.25;
    }
  }

  // 2. Check each suitable range requirement
  for (const req of intervention.suitableRanges) {
    const val = state[req.dimension];
    if (typeof val !== 'number') continue;

    if (req.direction === 'downregulate') {
      // Intended to lower an elevated dimension (e.g. stress, fatigue, cognitiveLoad)
      if (req.min !== undefined && val >= req.min) {
        const magnitude = Math.min(1.0, (val - req.min) / 40);
        score += 0.4 * (1 + magnitude);
        reasons.push(`${req.dimension.charAt(0).toUpperCase() + req.dimension.slice(1)} is currently elevated (${Math.round(val)}/100)`);
      } else if (req.min !== undefined && val < req.min - 15) {
        score -= 0.25;
      }
    } else if (req.direction === 'elevate') {
      // Intended to raise a depleted dimension (e.g. mood, energy, focus)
      if (req.max !== undefined && val <= req.max) {
        const magnitude = Math.min(1.0, (req.max - val) / 40);
        score += 0.4 * (1 + magnitude);
        reasons.push(`${req.dimension.charAt(0).toUpperCase() + req.dimension.slice(1)} is currently depleted (${Math.round(val)}/100)`);
      } else if (req.max !== undefined && val > req.max + 15) {
        score -= 0.25;
      }
    }
  }

  // 3. Category-specific heuristics
  if (intervention.id === 'focus-reset') {
    if (state.focus <= 45 && state.energy >= 35) {
      score += 0.25;
      reasons.push('Focus is scattered while base energy remains available');
    } else if (state.energy < 30) {
      score -= 0.30; // Cannot sprint focus when physically exhausted
    }
  }

  if (intervention.id === 'somatic-recovery') {
    if (state.fatigue >= 60) {
      score += 0.30;
      reasons.push('Fatigue level is high; somatic recovery provides non-cognitive relief');
    }
  }

  if (intervention.id === 'cognitive-unload') {
    if (state.cognitiveLoad >= 60) {
      score += 0.30;
      reasons.push('Cognitive load is high; offloading working memory clears attentional bottlenecks');
    }
  }

  if (intervention.id === 'behavioral-activation') {
    if (state.energy <= 40 && state.fatigue < 75) {
      score += 0.25;
      reasons.push('Gentle physical movement stimulates baseline vitality');
    }
  }

  // Bound to 0.0 - 1.0
  const boundedScore = Math.max(0.0, Math.min(1.0, score));
  return { score: boundedScore, reasons };
}

/**
 * Evaluates pattern fit score (0.0 to 1.0) based on validated longitudinal patterns.
 */
function computePatternFit(
  intervention: InterventionDefinition,
  patterns: PersonalPattern[]
): { score: number; reasons: string[] } {
  if (!patterns || patterns.length === 0) {
    return { score: 0.5, reasons: [] };
  }

  let score = 0.5;
  const reasons: string[] = [];

  for (const pattern of patterns) {
    // Only consider active/validated patterns with sufficient confidence
    if (pattern.confidence < 0.4 || pattern.status === 'inactive') continue;

    // Check if pattern relates to target dimensions
    const isRelevant = intervention.targetDimensions.some((d) => 
      pattern.patternKey.toLowerCase().includes(d.toLowerCase()) ||
      pattern.description.toLowerCase().includes(d.toLowerCase())
    );

    if (isRelevant) {
      score += 0.2 * pattern.confidence;
      reasons.push(`Observed pattern: ${pattern.title}`);
    }
  }

  return { score: Math.max(0.0, Math.min(1.0, score)), reasons };
}

/**
 * Evaluates history fit score (0.0 to 1.0) based on previous completions and usefulness ratings.
 */
function computeHistoryFit(
  interventionId: string,
  history: InterventionSession[]
): { score: number; reasons: string[] } {
  if (!history || history.length === 0) {
    return { score: 0.5, reasons: [] };
  }

  const pastForIntervention = history.filter((s) => s.interventionId === interventionId);
  if (pastForIntervention.length === 0) {
    return { score: 0.5, reasons: [] };
  }

  const completed = pastForIntervention.filter((s) => s.status === 'completed');
  if (completed.length === 0) {
    return { score: 0.35, reasons: ['Previously started but not completed'] };
  }

  let totalUsefulness = 0;
  let ratedCount = 0;
  for (const s of completed) {
    if (typeof s.perceivedUsefulness === 'number') {
      totalUsefulness += s.perceivedUsefulness;
      ratedCount++;
    }
  }

  const reasons: string[] = [];
  let score = 0.5;

  if (ratedCount > 0) {
    const avgRating = totalUsefulness / ratedCount;
    // Map 1-5 rating to 0.1 - 0.9 score
    score = (avgRating - 1) / 4;
    reasons.push(`Previously rated ${avgRating.toFixed(1)}/5 over ${ratedCount} session${ratedCount > 1 ? 's' : ''}`);
  } else {
    score = 0.6; // Completed without rating is a positive signal
    reasons.push(`Previously completed ${completed.length} time${completed.length > 1 ? 's' : ''}`);
  }

  return { score: Math.max(0.0, Math.min(1.0, score)), reasons };
}

/**
 * Evaluates cooldown penalty.
 * Returns positive penalty value if within cooldown period.
 */
function computeCooldownPenalty(
  intervention: InterventionDefinition,
  history: InterventionSession[],
  now: Date
): number {
  if (!history || history.length === 0) return 0;

  const pastSessions = history
    .filter((s) => s.interventionId === intervention.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (pastSessions.length === 0) return 0;

  const mostRecent = pastSessions[0];
  const hoursSince = (now.getTime() - new Date(mostRecent.startedAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < intervention.cooldownHours) {
    // Penalty is higher the fresher the session was
    const remainingRatio = (intervention.cooldownHours - hoursSince) / intervention.cooldownHours;
    return 0.45 * remainingRatio;
  }

  return 0;
}

/**
 * Primary deterministic recommendation selector.
 */
export function selectIntervention(context: SelectionContext): InterventionRecommendation {
  const {
    currentState,
    recentPatterns = [],
    sessionHistory = [],
    currentTimestamp = new Date(),
    textContext = null,
  } = context;

  const now = typeof currentTimestamp === 'string' ? new Date(currentTimestamp) : currentTimestamp;
  const currentHour = now.getHours();

  // 1. Screen for crisis first
  const crisisCheck = screenForCrisis(textContext);

  // 2. Handle cold start or low confidence state
  const isColdOrLowConfidence =
    !currentState ||
    currentState.confidence < 0.25 ||
    (currentState.activeSignalsCount !== undefined && currentState.activeSignalsCount === 0);

  const libraryList = Object.values(INTERVENTION_LIBRARY);

  if (isColdOrLowConfidence) {
    // Return gentle default recommendation without guessing
    const defaultIntervention = INTERVENTION_LIBRARY['breathing-reset'] || libraryList[0];
    const alts = libraryList.filter((i) => i.id !== defaultIntervention.id).slice(0, 2);

    return {
      intervention: defaultIntervention,
      suitabilityScore: 0.5,
      reasons: [
        'Observation confidence is currently low or calibrating.',
        'A gentle reset provides an anchor while your personal rhythm calibrates.',
        'Completing a quick check-in will tailor future recommendations.',
      ],
      confidence: currentState ? currentState.confidence : 0.1,
      isColdOrLowConfidence: true,
      alternativeInterventions: alts,
      safetyNotice: crisisCheck.isCrisisDetected ? crisisCheck.helplineNotice : undefined,
      evidence: {
        stateSnapshotId: currentState?.id,
        stateDimensions: [],
        patternKeys: recentPatterns.map((p) => p.patternKey),
        sessionIds: sessionHistory.slice(0, 5).map((s) => s.id),
        factors: [
          {
            factor: 'state_fit',
            contribution: 0.5,
            explanation: 'Gentle baseline recommendation during calibration',
          },
        ],
      },
    };
  }

  // 3. Compute score for each intervention in the library
  const scored = libraryList.map((intervention) => {
    const stateFit = computeStateFit(intervention, currentState!, currentHour);
    const patternFit = computePatternFit(intervention, recentPatterns);
    const historyFit = computeHistoryFit(intervention.id, sessionHistory);
    const cooldownPenalty = computeCooldownPenalty(intervention, sessionHistory, now);

    const totalScore =
      0.50 * stateFit.score +
      0.25 * patternFit.score +
      0.25 * historyFit.score -
      cooldownPenalty;

    const reasons = [
      ...stateFit.reasons,
      ...patternFit.reasons,
      ...historyFit.reasons,
    ];

    if (reasons.length === 0) {
      reasons.push(`Targeted to support ${intervention.targetDimensions.join(' and ')}`);
    }

    return {
      intervention,
      score: Math.max(0.01, Math.min(0.99, totalScore)),
      reasons,
      stateFit,
      patternFit,
      historyFit,
      cooldownPenalty,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const alternatives = scored.slice(1, 3).map((s) => s.intervention);

  const evidence = {
    stateSnapshotId: currentState.id,
    stateDimensions: top.intervention.targetDimensions.map((d) => ({
      dimension: d,
      value: currentState[d] ?? 50,
      contribution: Number((0.50 * top.stateFit.score).toFixed(2)),
    })),
    patternKeys: recentPatterns.map((p) => p.patternKey),
    sessionIds: sessionHistory.slice(0, 5).map((s) => s.id),
    factors: [
      {
        factor: 'state_fit' as const,
        contribution: Number((0.50 * top.stateFit.score).toFixed(2)),
        explanation: top.stateFit.reasons[0] || 'Current dimension alignment',
      },
      {
        factor: 'pattern_fit' as const,
        contribution: Number((0.25 * top.patternFit.score).toFixed(2)),
        explanation: top.patternFit.reasons[0] || 'Longitudinal pattern alignment',
      },
      {
        factor: 'history_fit' as const,
        contribution: Number((0.25 * top.historyFit.score).toFixed(2)),
        explanation: top.historyFit.reasons[0] || 'Past outcome usefulness',
      },
      ...(top.cooldownPenalty > 0
        ? [
            {
              factor: 'cooldown' as const,
              contribution: -Number(top.cooldownPenalty.toFixed(2)),
              explanation: 'Recent session cooldown penalty',
            },
          ]
        : []),
    ],
  };

  return {
    intervention: top.intervention,
    suitabilityScore: Number(top.score.toFixed(2)),
    reasons: top.reasons.slice(0, 3), // concise 1-3 reasons
    confidence: currentState.confidence,
    isColdOrLowConfidence: false,
    alternativeInterventions: alternatives,
    safetyNotice: crisisCheck.isCrisisDetected ? crisisCheck.helplineNotice : undefined,
    evidence,
  };
}
