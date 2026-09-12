/**
 * Typed Provenance DAG Graph Builder
 * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
 *
 * Dynamically constructs a traversable, user-scoped Directed Acyclic Graph (DAG)
 * connecting:
 * Signal -> Modality -> Fusion State -> Pattern -> Recommendation -> Action -> Outcome -> Learning
 *
 * NON-NEGOTIABLE SECURITY & PRIVACY INVARIANTS:
 * 1. Multi-tenant isolation: every node is bounded to authenticated userId; cross-user signals rejected.
 * 2. Privacy minimization: raw body text from journals/notes is NEVER embedded in graph summaries.
 * 3. Crisis root precedence: if crisis is detected, crisis root node takes absolute priority.
 * 4. Read-time dynamic assembly: zero graph database or background sync workers needed.
 */

import {
  PersonalState,
  StateDimensionKey,
  WellnessSignal,
  STATE_DIMENSION_CONFIG,
  PersonalBaseline,
  NeutralBaseline,
} from '../types';
import { PersonalPattern } from '../patternEngine/types';
import {
  InterventionRecommendation,
  InterventionSession,
  InterventionEffectiveness,
} from '../interventionEngine/types';
import {
  EvidenceGraph,
  GraphNode,
  GraphEdge,
} from './types';
import { UncertaintyEngine } from './uncertaintyEngine';

export interface GraphBuilderContext {
  userId: string;
  currentState: PersonalState | null;
  signals: WellnessSignal[];
  patterns?: PersonalPattern[];
  recommendation?: InterventionRecommendation | null;
  recentSessions?: InterventionSession[];
  effectiveness?: Record<string, InterventionEffectiveness>;
  baseline?: PersonalBaseline | NeutralBaseline;
  referenceTime?: Date;
}

export class GraphBuilder {
  /**
   * Dynamically constructs the Evidence Graph DAG from active domain records
   */
  public static build(context: GraphBuilderContext): EvidenceGraph {
    const {
      userId,
      currentState,
      signals = [],
      patterns = [],
      recommendation,
      recentSessions = [],
      effectiveness = {},
      baseline,
      referenceTime = new Date(),
    } = context;

    const nodes: Record<string, GraphNode> = {};
    const edges: GraphEdge[] = [];
    const nowIso = referenceTime.toISOString();

    // 1. Enforce Multi-Tenant Isolation: filter out any rogue signals/sessions with foreign userIds
    const safeSignals = signals.filter((s) => s.userId === userId);
    const safePatterns = patterns.filter((p) => p.userId === userId);
    const safeSessions = recentSessions.filter((s) => s.userId === userId);

    let rootNodeId = 'node-state-root';

    // 2. Universal Crisis Root Precedence
    if (currentState?.isCrisisDetected) {
      rootNodeId = 'node-crisis-root';
      nodes[rootNodeId] = {
        id: rootNodeId,
        type: 'crisis',
        label: 'Immediate Safety Support',
        summary:
          currentState.crisisNotice ||
          'Mindful detected language indicating an immediate safety concern; 24/7 lifeline support is available.',
        timestamp: currentState.timestamp || nowIso,
        confidence: 1.0,
        userId,
        metadata: {
          matchedTrigger: currentState.matchedCrisisTrigger || 'crisis_detected',
          lifeline: '988 Suicide & Crisis Lifeline (Call or Text 988)',
          isUrgent: true,
        },
      };
    } else {
      // Normal overall state root node
      nodes[rootNodeId] = {
        id: rootNodeId,
        type: 'fusion_state',
        label: 'Current Personal State',
        summary: currentState
          ? `Overall state calibrated with ${currentState.activeSignalsCount} active observation(s) across ${Object.keys(currentState.sourceSummary).length} modalities.`
          : 'Stabilizing at baseline rhythm.',
        timestamp: currentState?.timestamp || nowIso,
        confidence: currentState?.confidence ?? 0.0,
        userId,
        metadata: {
          activeSignalsCount: currentState?.activeSignalsCount ?? 0,
          clustersCount: currentState?.clustersCount ?? 0,
        },
      };
    }

    // 3. Raw Signal Nodes (Privacy Minimized)
    const signalNodeMap = new Map<string, string>(); // signalId -> nodeId

    for (const signal of safeSignals) {
      const nodeId = `node-sig-${signal.id}`;
      signalNodeMap.set(signal.id, nodeId);

      // DATA MINIMIZATION: Never copy raw private text or raw audio into graph summaries
      let sanitizedSummary = formatSanitizedSignalSummary(signal);

      nodes[nodeId] = {
        id: nodeId,
        type: 'raw_signal',
        label: formatModalityLabel(signal.modality),
        summary: sanitizedSummary,
        timestamp: signal.timestamp,
        confidence: signal.reliabilityWeight,
        modality: signal.modality,
        userId,
        metadata: {
          sourceId: signal.sourceId,
          reliabilityWeight: signal.reliabilityWeight,
          triggers: signal.features.triggers || [],
          themes: signal.features.themes || [],
        },
      };

      // If crisis triggered from this signal, link to crisis root
      if (currentState?.isCrisisDetected && (signal.features as any).isCrisisDetected) {
        edges.push({
          sourceNodeId: nodeId,
          targetNodeId: rootNodeId,
          type: 'overrides',
          label: 'Triggered immediate crisis protocol',
        });
      }
    }

    // 4. Dimension & Modality Fusion Nodes
    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    for (const dimKey of dimensionKeys) {
      const dimNodeId = `node-dim-${dimKey}`;
      const dimState = currentState?.dimensions[dimKey];
      const meta = STATE_DIMENSION_CONFIG[dimKey];

      nodes[dimNodeId] = {
        id: dimNodeId,
        type: 'fusion_state',
        label: meta.label,
        summary: dimState
          ? `${meta.label} estimated at ${dimState.value}/100 (${dimState.trend} vs baseline).`
          : `${meta.label} at baseline (${meta.neutralDefault}/100).`,
        timestamp: currentState?.timestamp || nowIso,
        confidence: dimState?.confidence ?? 0.0,
        userId,
        metadata: {
          value: dimState?.value ?? meta.neutralDefault,
          confidence: dimState?.confidence ?? 0.0,
          baselineDeviation: dimState?.baselineDeviation ?? 0,
          trend: dimState?.trend ?? 'stable',
          consistencyScore: dimState?.consistencyScore ?? null,
          divergenceDetected: dimState?.divergenceDetected ?? false,
        },
      };

      // Edge from dimension to overall state root
      if (!currentState?.isCrisisDetected) {
        edges.push({
          sourceNodeId: dimNodeId,
          targetNodeId: rootNodeId,
          type: 'fused_into',
          label: 'Constitutes personal state',
        });
      }

      // Modality estimates contributing to this dimension
      if (dimState?.modalityBreakdown) {
        for (const [mod, est] of Object.entries(dimState.modalityBreakdown)) {
          if (!est) continue;
          const modNodeId = `node-mod-${dimKey}-${mod}`;
          nodes[modNodeId] = {
            id: modNodeId,
            type: 'modality_estimate',
            label: `${formatModalityLabel(mod)} (${meta.label})`,
            summary: `${formatModalityLabel(mod)} estimated ${dimKey} at ${est.value}/100 (weight ${est.weight}).`,
            confidence: est.confidence,
            modality: mod,
            userId,
            metadata: {
              value: est.value,
              weight: est.weight,
            },
          };

          edges.push({
            sourceNodeId: modNodeId,
            targetNodeId: dimNodeId,
            type: 'consolidated_into',
            weight: est.weight,
          });

          // Connect active raw signals of this modality to the modality estimate
          for (const sigId of dimState.contributingSignalIds) {
            const sig = safeSignals.find((s) => s.id === sigId);
            if (sig && sig.modality === mod) {
              const sigNodeId = signalNodeMap.get(sigId);
              if (sigNodeId) {
                edges.push({
                  sourceNodeId: sigNodeId,
                  targetNodeId: modNodeId,
                  type: 'extracted_from',
                });
              }
            }
          }
        }
      }
    }

    // 5. Pattern Nodes
    const patternNodeMap = new Map<string, string>(); // patternKey -> nodeId

    for (const pattern of safePatterns) {
      const patNodeId = `node-pat-${pattern.id}`;
      patternNodeMap.set(pattern.patternKey, patNodeId);

      nodes[patNodeId] = {
        id: patNodeId,
        type: 'pattern',
        label: pattern.title,
        summary: pattern.description,
        timestamp: pattern.lastObservedAt,
        confidence: pattern.confidence,
        userId,
        metadata: {
          type: pattern.type,
          strength: pattern.strength,
          observationCount: pattern.observationCount,
          supportingCount: pattern.evidence.supportingCount,
          supportingObservationIds: pattern.evidence.supportingObservationIds || [],
          supportingDates: pattern.evidence.sampleContexts || [],
        },
      };

      // Connect supporting raw signals if observation IDs are recorded
      if (pattern.evidence.supportingObservationIds) {
        for (const obsId of pattern.evidence.supportingObservationIds) {
          const sigNodeId = signalNodeMap.get(obsId);
          if (sigNodeId) {
            edges.push({
              sourceNodeId: sigNodeId,
              targetNodeId: patNodeId,
              type: 'associates_with',
              label: 'Observed in session',
            });
          }
        }
      }
    }

    // 6. Recommendation Node
    if (recommendation && recommendation.intervention) {
      const recNodeId = `node-rec-${recommendation.intervention.id}`;
      nodes[recNodeId] = {
        id: recNodeId,
        type: 'recommendation',
        label: recommendation.intervention.title,
        summary: recommendation.reasons.join(' | ') || recommendation.intervention.shortDescription,
        confidence: recommendation.confidence,
        userId,
        metadata: {
          interventionId: recommendation.intervention.id,
          suitabilityScore: recommendation.suitabilityScore,
          category: recommendation.intervention.category,
          durationMinutes: recommendation.intervention.durationMinutes,
          reasons: recommendation.reasons,
        },
      };

      // Link state dimensions to recommendation
      for (const targetDim of recommendation.intervention.targetDimensions) {
        const dimNodeId = `node-dim-${targetDim}`;
        if (nodes[dimNodeId]) {
          edges.push({
            sourceNodeId: dimNodeId,
            targetNodeId: recNodeId,
            type: 'justifies',
            label: 'State alignment',
          });
        }
      }

      // Link relevant patterns to recommendation
      if (recommendation.evidence?.patternKeys) {
        for (const patKey of recommendation.evidence.patternKeys) {
          const patNodeId = patternNodeMap.get(patKey);
          if (patNodeId) {
            edges.push({
              sourceNodeId: patNodeId,
              targetNodeId: recNodeId,
              type: 'justifies',
              label: 'Pattern relevance',
            });
          }
        }
      }
    }

    // 7. Recent Sessions, Outcomes, and Learning Nodes
    for (const session of safeSessions.slice(0, 5)) {
      const sessNodeId = `node-sess-${session.id}`;
      nodes[sessNodeId] = {
        id: sessNodeId,
        type: 'session_action',
        label: `Session: ${session.interventionId}`,
        summary: `Status: ${session.status} (duration: ${session.durationSeconds || 0}s).`,
        timestamp: session.startedAt,
        userId,
        metadata: {
          sessionId: session.id,
          interventionId: session.interventionId,
          status: session.status,
        },
      };

      // Outcome delta node if session completed
      if (session.status === 'completed' && session.dimensionDeltas) {
        const outNodeId = `node-out-${session.id}`;
        const deltaSummaries = Object.entries(session.dimensionDeltas)
          .map(([dim, val]) => `${dim}: ${val > 0 ? '+' : ''}${val}`)
          .join(', ');

        nodes[outNodeId] = {
          id: outNodeId,
          type: 'outcome_delta',
          label: `Outcome (${session.interventionId})`,
          summary: deltaSummaries || 'Completed reset session.',
          timestamp: session.completedAt || session.startedAt,
          userId,
          metadata: {
            dimensionDeltas: session.dimensionDeltas,
            perceivedUsefulness: session.perceivedUsefulness,
          },
        };

        edges.push({
          sourceNodeId: sessNodeId,
          targetNodeId: outNodeId,
          type: 'resulted_in',
        });

        // Learning summary node from effectiveness
        const eff = effectiveness[session.interventionId];
        if (eff) {
          const learnNodeId = `node-learn-${session.interventionId}`;
          if (!nodes[learnNodeId]) {
            nodes[learnNodeId] = {
              id: learnNodeId,
              type: 'learning_summary',
              label: `Learned: ${session.interventionId}`,
              summary: eff.factualSummary,
              userId,
              metadata: {
                completedCount: eff.completedCount,
                avgUsefulness: eff.avgUsefulness,
                hasEnoughHistory: eff.hasEnoughHistory,
              },
            };
          }

          edges.push({
            sourceNodeId: outNodeId,
            targetNodeId: learnNodeId,
            type: 'informs',
          });
        }
      }
    }

    // 8. Decompose Uncertainty
    const uncertaintyDecomposition = currentState
      ? UncertaintyEngine.decompose(currentState, safeSignals, baseline, referenceTime)
      : ({} as any);

    return {
      userId,
      generatedAt: nowIso,
      rootNodeId,
      nodes,
      edges,
      uncertaintyDecomposition,
    };
  }
}

/**
 * Strips private diary sentences and replaces with high-level observational topic summaries
 */
function formatSanitizedSignalSummary(signal: WellnessSignal): string {
  switch (signal.modality) {
    case 'text_journal': {
      const themes = signal.features.themes?.filter(Boolean);
      if (themes && themes.length > 0) {
        return `Journal reflection touching on ${themes.join(', ')}.`;
      }
      return 'Journal reflection logged.';
    }
    case 'mood_checkin': {
      const triggers = signal.features.triggers?.filter(Boolean);
      const sensations = signal.features.somaticSensations?.filter(Boolean);
      let text = 'Self-reported check-in';
      if (triggers && triggers.length > 0) text += ` with context: ${triggers.join(', ')}`;
      if (sensations && sensations.length > 0) text += ` (${sensations.join(', ')})`;
      return text + '.';
    }
    case 'voice_transcript': {
      return 'Voice observation acoustic analysis.';
    }
    case 'companion_session': {
      return 'Dialogue interaction with AI Companion.';
    }
    case 'intervention_outcome': {
      return `Post-reset outcome reflection for ${signal.features.triggers?.[0] || 'intervention'}.`;
    }
    default:
      return `${signal.modality.replace('_', ' ')} observation.`;
  }
}

function formatModalityLabel(modality: string): string {
  switch (modality) {
    case 'mood_checkin':
      return 'Self-Report Check-In';
    case 'text_journal':
      return 'Journal Reflection';
    case 'voice_transcript':
      return 'Voice Observation';
    case 'companion_session':
      return 'Companion Dialogue';
    case 'intervention_outcome':
      return 'Intervention Outcome';
    default:
      return modality.replace(/_/g, ' ');
  }
}
