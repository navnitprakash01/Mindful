/**
 * Deterministic Explanation Builder
 * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
 *
 * Translates Typed Provenance DAG structures into deterministic, human-readable explanations.
 *
 * NON-NEGOTIABLE CORE INVARIANTS:
 * 1. STRICTLY NON-CAUSAL: Never use causal or diagnostic language ('caused by', 'proves',
 *    'diagnosed', 'treatment', 'prescribed'). Always use observational and associative
 *    language ('observed alongside', 'associated with', 'coincided with', 'aligned with').
 * 2. SEPARATE MEASURED VS REPORTED: Distinctly separate objectively measured state deltas
 *    from subjective user-reported usefulness ratings.
 * 3. TRANSPARENT UNCERTAINTY: Directly present sample scarcity, temporal decay, and cross-modal
 *    divergence to the user without obscuring confidence limits.
 * 4. CRISIS PRIORITY: If crisis is detected, crisis notice and 988 Lifeline are prioritized at root.
 */

import {
  PersonalState,
  StateDimensionKey,
  STATE_DIMENSION_CONFIG,
  WellnessSignal,
} from '../types';
import { PersonalPattern } from '../patternEngine/types';
import {
  InterventionRecommendation,
  InterventionSession,
  InterventionEffectiveness,
} from '../interventionEngine/types';
import {
  DimensionExplanation,
  EvidenceGraph,
  ExplanationTree,
  OutcomeExplanation,
  PatternExplanation,
  RecommendationExplanation,
} from './types';

export interface ExplanationBuilderContext {
  userId: string;
  graph: EvidenceGraph;
  currentState: PersonalState | null;
  signals?: WellnessSignal[];
  patterns?: PersonalPattern[];
  recommendation?: InterventionRecommendation | null;
  recentSessions?: InterventionSession[];
  effectiveness?: Record<string, InterventionEffectiveness>;
}

export class ExplanationBuilder {
  /**
   * Generates a fully populated, deterministic ExplanationTree from graph nodes and context
   */
  public static build(context: ExplanationBuilderContext): ExplanationTree {
    const {
      userId,
      graph,
      currentState,
      signals = [],
      patterns = [],
      recommendation,
      recentSessions = [],
      effectiveness = {},
    } = context;

    const safeSignals = signals.filter((s) => s.userId === userId);
    const safePatterns = patterns.filter((p) => p.userId === userId);
    const safeSessions = recentSessions.filter((s) => s.userId === userId);

    const isCrisisDetected = currentState?.isCrisisDetected ?? false;
    const crisisNotice = currentState?.crisisNotice;

    // 1. Build Dimension Explanations
    const dimensions = this.buildDimensionExplanations(
      currentState,
      safeSignals,
      graph
    );

    // 2. Build Pattern Explanations (strictly non-causal)
    const patternExplanations = this.buildPatternExplanations(safePatterns);

    // 3. Build Recommendation Explanation
    const recommendationExplanation = recommendation
      ? this.buildRecommendationExplanation(recommendation)
      : undefined;

    // 4. Build Recent Outcomes (separating measured deltas from reported usefulness)
    const recentOutcomes = this.buildOutcomeExplanations(
      safeSessions,
      effectiveness
    );

    return {
      userId,
      generatedAt: graph.generatedAt,
      dimensions,
      patterns: patternExplanations,
      recommendation: recommendationExplanation,
      recentOutcomes,
      crisisNotice,
      isCrisisDetected,
    };
  }

  /**
   * Explains each of the 6 state dimensions deterministically
   */
  private static buildDimensionExplanations(
    currentState: PersonalState | null,
    signals: WellnessSignal[],
    graph: EvidenceGraph
  ): Record<StateDimensionKey, DimensionExplanation> {
    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    const result: Partial<Record<StateDimensionKey, DimensionExplanation>> = {};

    for (const dimKey of dimensionKeys) {
      const config = STATE_DIMENSION_CONFIG[dimKey];
      const dimState = currentState?.dimensions[dimKey];
      const uncertainty = graph.uncertaintyDecomposition[dimKey] || [];

      const value = dimState?.value ?? config.neutralDefault;
      const confidence = dimState?.confidence ?? 0;
      const trend = dimState?.trend ?? 'stable';

      // Identify contributing sources / modalities
      const contributingSources: string[] = [];
      let crossModalSummary: string | undefined;

      if (dimState && dimState.contributingSignalIds.length > 0) {
        const contributingSigs = signals.filter((s) =>
          dimState.contributingSignalIds.includes(s.id)
        );
        const modalities = Array.from(
          new Set(contributingSigs.map((s) => s.modality))
        );
        contributingSources.push(...modalities.map(formatModalityName));

        // Cross-modal consistency evaluation
        if (modalities.length > 1) {
          if (dimState.divergenceDetected) {
            crossModalSummary =
              'Modalities exhibited divergent signals (e.g. differing acoustic vs reported markers).';
          } else if (
            dimState.consistencyScore !== null &&
            dimState.consistencyScore >= 0.7
          ) {
            crossModalSummary =
              'High cross-modal agreement observed across independent signals.';
          } else {
            crossModalSummary =
              'Moderate cross-modal alignment across contributing signals.';
          }
        } else if (modalities.length === 1) {
          crossModalSummary =
            'Single modality observation; awaiting multi-source corroboration.';
        }
      } else {
        crossModalSummary =
          'No recent direct observations; state reflects baseline equilibrium.';
      }

      // Generate headline & detailed explanation (strictly non-causal)
      const headline = this.generateDimensionHeadline(dimKey, value, trend);
      const detailedExplanation = this.generateDimensionDetail(
        dimKey,
        value,
        dimState?.baselineDeviation ?? 0,
        trend,
        contributingSources,
        confidence
      );

      result[dimKey] = {
        dimension: dimKey,
        value,
        confidence,
        trend,
        headline,
        detailedExplanation,
        contributingSources,
        crossModalSummary,
        uncertaintyFactors: uncertainty,
      };
    }

    return result as Record<StateDimensionKey, DimensionExplanation>;
  }

  private static generateDimensionHeadline(
    dimKey: StateDimensionKey,
    value: number,
    trend: 'improving' | 'stable' | 'declining'
  ): string {
    const config = STATE_DIMENSION_CONFIG[dimKey];
    const trendLabel =
      trend === 'improving'
        ? 'improving relative to baseline'
        : trend === 'declining'
        ? 'trending downward'
        : 'holding steady';

    let level = 'moderate';
    if (value >= 70) level = 'elevated';
    else if (value <= 30) level = 'low';

    return `${config.label} is currently ${level} (${value}/100), ${trendLabel}.`;
  }

  private static generateDimensionDetail(
    dimKey: StateDimensionKey,
    value: number,
    baselineDeviation: number,
    trend: string,
    sources: string[],
    confidence: number
  ): string {
    const config = STATE_DIMENSION_CONFIG[dimKey];
    const sourceText =
      sources.length > 0
        ? `Informed by recent ${sources.join(' and ')} observation(s).`
        : 'Derived from your established personal baseline without recent signals.';

    const devText =
      Math.abs(baselineDeviation) >= 10
        ? `Observed ${Math.abs(baselineDeviation)} points ${
            baselineDeviation > 0 ? 'above' : 'below'
          } typical baseline.`
        : 'Aligns closely with typical baseline levels.';

    const confText =
      confidence >= 0.7
        ? 'High confidence based on corroborated observations.'
        : confidence >= 0.4
        ? 'Moderate confidence with room for additional corroboration.'
        : 'Preliminary estimate with high uncertainty.';

    return `${config.label} is estimated at ${value}/100. ${devText} ${sourceText} ${confText}`;
  }

  /**
   * Explains recurring patterns with supporting observation counts and dates (strictly non-causal)
   */
  private static buildPatternExplanations(
    patterns: PersonalPattern[]
  ): PatternExplanation[] {
    return patterns.map((p) => {
      const dates = p.evidence?.sampleContexts || [];
      const supportingCount = p.evidence?.supportingCount || 0;
      const observationCount = p.observationCount || 0;

      // Strictly observational summary — never asserts causation
      let summary = `Observed in ${supportingCount} out of ${observationCount} qualifying periods.`;
      if (dates.length > 0) {
        summary += ` Frequently coincided on recent dates: ${dates.slice(0, 3).join(', ')}.`;
      }

      return {
        patternId: p.id,
        title: p.title,
        summary: `${p.description} (${summary})`,
        supportingDates: dates,
        supportingCount,
        observationCount,
        supportingObservationIds: p.evidence?.supportingObservationIds,
        confidence: p.confidence,
        isCausalClaim: false as const,
      };
    });
  }

  /**
   * Explains why a specific intervention was selected based on state, patterns, and history
   */
  private static buildRecommendationExplanation(
    rec: InterventionRecommendation
  ): RecommendationExplanation {
    const stateFactors: string[] = [];
    const patternFactors: string[] = [];
    const historyFactors: string[] = [];

    for (const reason of rec.reasons) {
      const lower = reason.toLowerCase();
      if (lower.includes('pattern') || lower.includes('cycle') || lower.includes('frequently')) {
        patternFactors.push(reason);
      } else if (lower.includes('helpful') || lower.includes('past') || lower.includes('history') || lower.includes('completion')) {
        historyFactors.push(reason);
      } else {
        stateFactors.push(reason);
      }
    }

    if (rec.evidence?.factors) {
      for (const f of rec.evidence.factors) {
        if (!rec.reasons.includes(f.explanation)) {
          if (f.factor === 'pattern_fit') {
            patternFactors.push(f.explanation);
          } else if (f.factor === 'history_fit') {
            historyFactors.push(f.explanation);
          } else {
            stateFactors.push(f.explanation);
          }
        }
      }
    }

    const primaryRationale =
      rec.reasons[0] ||
      `Selected ${rec.intervention.title} based on current state indicators.`;

    return {
      interventionId: rec.intervention.id,
      title: rec.intervention.title,
      suitabilityScore: rec.suitabilityScore,
      primaryRationale,
      stateFactors: stateFactors.length > 0 ? stateFactors : ['Current state dimension alignment'],
      patternFactors,
      historyFactors,
    };
  }

  /**
   * Builds outcome explanations, explicitly distinguishing measured state changes from user feedback
   */
  private static buildOutcomeExplanations(
    sessions: InterventionSession[],
    effectiveness: Record<string, InterventionEffectiveness>
  ): OutcomeExplanation[] {
    const completedSessions = sessions
      .filter((s) => s.status === 'completed')
      .slice(0, 5);

    return completedSessions.map((session) => {
      const deltas = session.dimensionDeltas || {};

      // 1. Measured Objective Changes
      const deltaEntries = Object.entries(deltas);
      let measuredSummary = 'No measurable state change detected immediately after session.';
      if (deltaEntries.length > 0) {
        const deltaParts = deltaEntries.map(([dim, val]) => {
          const num = Number(val);
          const sign = num > 0 ? '+' : '';
          return `${formatDimensionName(dim)} ${sign}${num} pts`;
        });
        measuredSummary = `Measured pre/post change: ${deltaParts.join(', ')}.`;
      }

      // 2. User Reported Rating (distinct from measured change)
      let userRatingSummary: string | undefined;
      if (session.perceivedUsefulness !== undefined && session.perceivedUsefulness !== null) {
        userRatingSummary = `User rated usefulness: ${session.perceivedUsefulness}/5.`;
      }

      // 3. Inferred Effectiveness Context
      const eff = effectiveness[session.interventionId];
      let inferredSummary = 'Preliminary intervention result.';
      if (eff && eff.hasEnoughHistory) {
        inferredSummary = `Aggregated historical pattern: ${eff.factualSummary}`;
      } else if (eff) {
        inferredSummary = `Early observation: completed ${eff.completedCount} time(s).`;
      }

      return {
        sessionId: session.id,
        interventionId: session.interventionId,
        measuredDeltas: deltas,
        measuredSummary,
        userRating: session.perceivedUsefulness,
        userRatingSummary,
        inferredSummary,
      };
    });
  }
}

function formatModalityName(modality: string): string {
  switch (modality) {
    case 'mood_checkin':
      return 'check-in';
    case 'text_journal':
      return 'journal';
    case 'voice_transcript':
      return 'voice';
    case 'companion_session':
      return 'companion';
    case 'camera_behavior':
      return 'camera';
    case 'intervention_outcome':
      return 'outcome';
    default:
      return modality.replace('_', ' ');
  }
}

function formatDimensionName(dimension: string): string {
  switch (dimension) {
    case 'cognitiveLoad':
      return 'Cognitive Load';
    default:
      return dimension.charAt(0).toUpperCase() + dimension.slice(1);
  }
}
