/**
 * Correlation Detection & Evidence Damping Engine
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Prevents double-counting and artificial certainty inflation from repeated,
 * co-occurring, or highly correlated observations (e.g., three mood logs in 5 minutes,
 * or voice and journal from the same reflection session).
 *
 * Mathematical Damping Schedule:
 * - Rank 0 (Primary):   1.00x weight
 * - Rank 1 (Secondary): 0.50x weight
 * - Rank 2 (Tertiary):  0.25x weight
 * - Rank >= 3:          0.10x weight
 *
 * Full provenance is retained across all clustered signals.
 */

import { WellnessSignal } from '../types';
import { CorrelationCluster, TemporalSignal } from './types';

export const CORRELATION_CONFIG = {
  CORRELATION_WINDOW_MINUTES: 15,
  SAME_MODALITY_BURST_MINUTES: 5,
  DAMPING_FACTORS: [1.0, 0.50, 0.25, 0.10] as const,
};

function hasArrayOverlap(a?: string[], b?: string[]): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  const setA = new Set(a.map((s) => s.trim().toLowerCase()));
  return b.some((item) => setA.has(item.trim().toLowerCase()));
}

/**
 * Evaluates whether two signals are correlated based on temporal proximity and shared context
 */
export function areSignalsCorrelated(
  s1: WellnessSignal,
  s2: WellnessSignal
): { correlated: boolean; reason?: string } {
  const t1 = new Date(s1.timestamp).getTime();
  const t2 = new Date(s2.timestamp).getTime();
  if (isNaN(t1) || isNaN(t2)) {
    return { correlated: false };
  }

  const diffMinutes = Math.abs(t1 - t2) / (1000 * 60);

  // Beyond maximum correlation window, signals are treated as independent events
  if (diffMinutes > CORRELATION_CONFIG.CORRELATION_WINDOW_MINUTES) {
    return { correlated: false };
  }

  // 1. Same source session or origin ID
  if (s1.sourceId && s2.sourceId && s1.sourceId === s2.sourceId) {
    return { correlated: true, reason: 'shared_source_session' };
  }

  // 2. Same modality rapid burst (<= 5 minutes)
  if (s1.modality === s2.modality && diffMinutes <= CORRELATION_CONFIG.SAME_MODALITY_BURST_MINUTES) {
    return { correlated: true, reason: 'same_modality_rapid_burst' };
  }

  // 3. Shared contextual triggers
  if (hasArrayOverlap(s1.features.triggers, s2.features.triggers)) {
    return { correlated: true, reason: 'shared_contextual_triggers' };
  }

  // 4. Shared somatic sensations
  if (hasArrayOverlap(s1.features.somaticSensations, s2.features.somaticSensations)) {
    return { correlated: true, reason: 'shared_somatic_sensations' };
  }

  // 5. Shared thematic context
  if (hasArrayOverlap(s1.features.themes, s2.features.themes)) {
    return { correlated: true, reason: 'shared_thematic_context' };
  }

  return { correlated: false };
}

function getMaxConfidence(signal: WellnessSignal): number {
  let max = 0.5;
  for (const dim of Object.values(signal.estimates)) {
    if (dim && typeof dim.confidence === 'number') {
      if (dim.confidence > max) max = dim.confidence;
    }
  }
  return max;
}

/**
 * Cluster active temporal signals and apply diminishing-marginal-weight damping.
 * Returns both the clusters and a lookup map of signalId -> final effective weight.
 */
export function clusterAndDampSignals(temporalSignals: TemporalSignal[]): {
  clusters: CorrelationCluster[];
  effectiveWeightMap: Map<string, number>;
} {
  if (temporalSignals.length === 0) {
    return { clusters: [], effectiveWeightMap: new Map() };
  }

  // Connected component clustering
  const n = temporalSignals.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  const pairwiseReasons = new Map<string, string>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const res = areSignalsCorrelated(temporalSignals[i].signal, temporalSignals[j].signal);
      if (res.correlated) {
        union(i, j);
        if (res.reason) {
          pairwiseReasons.set(`${i}-${j}`, res.reason);
        }
      }
    }
  }

  // Group by root
  const groups = new Map<number, TemporalSignal[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) || [];
    list.push(temporalSignals[i]);
    groups.set(root, list);
  }

  const clusters: CorrelationCluster[] = [];
  const effectiveWeightMap = new Map<string, number>();

  let clusterIndex = 1;
  for (const group of groups.values()) {
    // Sort signals inside cluster: primary has highest reliability * maxConfidence, then freshest
    group.sort((a, b) => {
      const scoreA = (a.signal.reliabilityWeight ?? 1.0) * getMaxConfidence(a.signal);
      const scoreB = (b.signal.reliabilityWeight ?? 1.0) * getMaxConfidence(b.signal);
      if (Math.abs(scoreB - scoreA) > 0.05) {
        return scoreB - scoreA;
      }
      return new Date(b.signal.timestamp).getTime() - new Date(a.signal.timestamp).getTime();
    });

    const primarySignal = group[0].signal;
    const dampedWeights = new Map<string, number>();
    const reasons = new Set<string>();

    group.forEach((item, rank) => {
      const dampingFactor =
        rank === 0
          ? CORRELATION_CONFIG.DAMPING_FACTORS[0]
          : rank === 1
          ? CORRELATION_CONFIG.DAMPING_FACTORS[1]
          : rank === 2
          ? CORRELATION_CONFIG.DAMPING_FACTORS[2]
          : CORRELATION_CONFIG.DAMPING_FACTORS[3];

      const finalWeight = item.decayWeight * dampingFactor;
      dampedWeights.set(item.signal.id, finalWeight);
      effectiveWeightMap.set(item.signal.id, finalWeight);
    });

    if (group.length > 1) {
      reasons.add('temporal_proximity_cluster');
    }

    clusters.push({
      clusterId: `cluster-${clusterIndex++}`,
      signals: group.map((g) => g.signal),
      primarySignal,
      dampedWeights,
      reasons: Array.from(reasons),
    });
  }

  return { clusters, effectiveWeightMap };
}
