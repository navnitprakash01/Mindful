/**
 * Inner Observatory Pure Layout & Presentation Helpers
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Provides pure mathematical 3D coordinate transformations, constellation layout,
 * state-responsive sanctuary themes, and factual narrative helpers.
 *
 * STRICT ZERO-FABRICATION PRINCIPLE:
 * - Missing days have no synthetic points or interpolated psychological states.
 * - Unknown or zero-confidence dimensions are explicitly communicated, not fabricated.
 */

import {
  PersonalState,
  StateDimensionKey,
  MoodLog,
} from '../types';
import { DaySlot } from './emotionalRhythm';

export interface ConstellationNode {
  key: StateDimensionKey;
  label: string;
  value: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  color: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  contributingSignalIds: string[];
  isKnown: boolean;
  isPrimary: boolean;
}

export interface ConstellationConnection {
  from: 'center' | StateDimensionKey;
  to: StateDimensionKey;
  opacity: number;
  strokeWidth: number;
  color: string;
  isPrimary: boolean;
}

export interface StateTheme {
  auraGradient: string;
  orbGradient: string;
  borderColor: string;
  glowColor: string;
  breathingDuration: number;
  particleSpeed: number;
  ambientVibe: 'calm' | 'radiant' | 'focused' | 'recovery' | 'stress' | 'baseline';
}

export interface StateConstellation {
  center: {
    label: string;
    statusLabel: string;
    stateSentence: string;
    overallConfidence: number;
    activeSignalsCount: number;
    isCold: boolean;
    color: string;
    pulseRate: number;
    theme: StateTheme;
  };
  nodes: ConstellationNode[];
  connections: ConstellationConnection[];
}

export interface HistoricalObservationPoint {
  index: number;
  dateKey: string;
  dayLabel: string;
  fullDateLabel: string;
  isToday: boolean;
  moodType: MoodLog['moodType'];
  energyLevel: number; // 1-10
  notes: string;
  triggers: string[];
  physicalSensations: string[];
  x: number;
  y: number;
}

export interface HistoricalRhythmData {
  isEmpty: boolean;
  points: HistoricalObservationPoint[];
  totalSlots: number;
  recordedCount: number;
  pathD: string;
  averageEnergy: number | null;
}

export interface CurrentStateSummary {
  title: string;
  description: string;
  stateSentence: string;
  primaryDimensions: {
    key: StateDimensionKey;
    label: string;
    value: number;
    color: string;
  }[];
  confidencePct: number;
  confidenceLabel: 'High' | 'Moderate' | 'Low' | 'Establishing baseline';
  isCold: boolean;
  activeSignalsCount: number;
}

export interface DimensionMetricSummary {
  key: StateDimensionKey;
  label: string;
  value: number;
  confidence: number;
  confidencePct: number;
  trend: 'improving' | 'stable' | 'declining';
  color: string;
  description: string;
  isKnown: boolean;
  isPrimary: boolean;
}

export const DIMENSION_METADATA: Record<
  StateDimensionKey,
  {
    label: string;
    color: string;
    description: string;
    baseCoord: [number, number, number];
    isPrimary: boolean;
  }
> = {
  focus: {
    label: 'Focus',
    color: '#c0c4ea',
    description: 'Mental clarity & directional attention',
    baseCoord: [0, -130, 25],
    isPrimary: true,
  },
  mood: {
    label: 'Mood',
    color: '#6ee7b7',
    description: 'Emotional valence & inner equilibrium',
    baseCoord: [-165, -20, 15],
    isPrimary: true,
  },
  energy: {
    label: 'Energy',
    color: '#38bdf8',
    description: 'Physical vitality & physiological readiness',
    baseCoord: [165, -20, 25],
    isPrimary: true,
  },
  stress: {
    label: 'Stress',
    color: '#f4a8c0',
    description: 'Sympathetic arousal & ambient pressure',
    baseCoord: [120, 110, -35],
    isPrimary: false,
  },
  fatigue: {
    label: 'Fatigue',
    color: '#fbbf24',
    description: 'Somatic weariness & recovery need',
    baseCoord: [-120, 110, -25],
    isPrimary: false,
  },
  cognitiveLoad: {
    label: 'Cognitive Load',
    color: '#a78bfa',
    description: 'Working memory saturation & complexity',
    baseCoord: [45, -75, -60],
    isPrimary: false,
  },
};

/**
 * Derives qualitative state description from real mathematical dimensions.
 */
function deriveStateTitle(state: PersonalState | null, isCold: boolean): { title: string; desc: string } {
  if (!state || isCold || state.overallConfidence === 0) {
    return {
      title: 'Establishing Baseline',
      desc: 'Mindful is learning your baseline rhythm as you check in.',
    };
  }

  const mood = state.dimensions?.mood?.value ?? state.mood ?? 50;
  const stress = state.dimensions?.stress?.value ?? state.stress ?? 50;
  const energy = state.dimensions?.energy?.value ?? state.energy ?? 50;
  const focus = state.dimensions?.focus?.value ?? state.focus ?? 50;

  if (stress > 65) {
    return {
      title: 'Elevated Activation',
      desc: 'Ambient stress load is higher than usual. Grounding moments can restore equilibrium.',
    };
  }
  if (mood >= 70 && energy >= 65) {
    return {
      title: 'Radiant Vitality',
      desc: 'High emotional valence and energetic readiness are mutually reinforcing.',
    };
  }
  if (mood >= 65 && focus >= 65) {
    return {
      title: 'Calm Equilibrium',
      desc: 'Balanced valence and steady clarity create an expansive flow state.',
    };
  }
  if (energy < 40 && stress < 45) {
    return {
      title: 'Gentle Recovery',
      desc: 'Low energetic expenditure suggests your body is naturally resting.',
    };
  }
  if (mood < 45) {
    return {
      title: 'Reflective Inwardness',
      desc: 'Lower valence invites self-compassion and gentle pacing.',
    };
  }

  return {
    title: 'Steady Equilibrium',
    desc: 'Wellness signals are balanced close to your personal resting baseline.',
  };
}

/**
 * Generates an empathetic, human-centered summary sentence.
 * e.g., "Calm, energized, and focused."
 */
export function deriveStateSentence(state: PersonalState | null): string {
  const isCold = !state || state.overallConfidence === 0;
  if (isCold) {
    return 'Establishing your baseline rhythm.';
  }

  const mood = state.dimensions?.mood?.value ?? state.mood ?? 50;
  const stress = state.dimensions?.stress?.value ?? state.stress ?? 50;
  const energy = state.dimensions?.energy?.value ?? state.energy ?? 50;
  const focus = state.dimensions?.focus?.value ?? state.focus ?? 50;

  if (stress > 65) {
    return 'Heightened intensity with elevated demand.';
  }
  if (mood >= 70 && energy >= 65 && focus >= 65) {
    return 'Calm, energized, and focused.';
  }
  if (mood >= 70 && energy >= 65) {
    return 'Vibrant energy and positive emotional lift.';
  }
  if (mood >= 65 && focus >= 65) {
    return 'Calm equilibrium and steady mental clarity.';
  }
  if (energy < 40 && stress < 45) {
    return 'Gentle recovery and low physical exertion.';
  }
  if (mood < 45) {
    return 'Reflective inwardness and gentle pacing.';
  }

  return 'Steady equilibrium across your core dimensions.';
}

/**
 * Derives state-responsive environmental theme (aura, breathing cycle, particle speed).
 */
export function deriveStateTheme(personalState: PersonalState | null): StateTheme {
  const isCold = !personalState || personalState.overallConfidence === 0;
  if (isCold) {
    return {
      auraGradient: 'radial-gradient(circle at 50% 50%, rgba(108,114,232,0.18) 0%, transparent 70%)',
      orbGradient: 'linear-gradient(135deg, rgba(108,114,232,0.40) 0%, rgba(13,15,26,0.95) 100%)',
      borderColor: 'rgba(108,114,232,0.45)',
      glowColor: '#6c72e8',
      breathingDuration: 4.2,
      particleSpeed: 0.8,
      ambientVibe: 'baseline',
    };
  }

  const mood = personalState.dimensions?.mood?.value ?? personalState.mood ?? 50;
  const stress = personalState.dimensions?.stress?.value ?? personalState.stress ?? 50;
  const energy = personalState.dimensions?.energy?.value ?? personalState.energy ?? 50;
  const focus = personalState.dimensions?.focus?.value ?? personalState.focus ?? 50;

  if (stress > 65) {
    return {
      auraGradient: 'radial-gradient(circle at 50% 45%, rgba(244,168,192,0.22) 0%, rgba(108,114,232,0.12) 45%, transparent 75%)',
      orbGradient: 'linear-gradient(135deg, rgba(244,168,192,0.35) 0%, rgba(108,114,232,0.30) 50%, rgba(13,15,26,0.95) 100%)',
      borderColor: 'rgba(244,168,192,0.50)',
      glowColor: '#f4a8c0',
      breathingDuration: 3.0,
      particleSpeed: 1.2,
      ambientVibe: 'stress',
    };
  }

  if (mood >= 70 && energy >= 65) {
    return {
      auraGradient: 'radial-gradient(circle at 50% 45%, rgba(251,191,36,0.18) 0%, rgba(110,231,183,0.16) 40%, transparent 75%)',
      orbGradient: 'linear-gradient(135deg, rgba(251,191,36,0.35) 0%, rgba(110,231,183,0.35) 50%, rgba(13,15,26,0.95) 100%)',
      borderColor: 'rgba(251,191,36,0.50)',
      glowColor: '#fbbf24',
      breathingDuration: 2.8,
      particleSpeed: 1.4,
      ambientVibe: 'radiant',
    };
  }

  if (mood >= 60 && focus >= 60) {
    return {
      auraGradient: 'radial-gradient(circle at 50% 45%, rgba(110,231,183,0.18) 0%, rgba(108,114,232,0.14) 40%, transparent 75%)',
      orbGradient: 'linear-gradient(135deg, rgba(110,231,183,0.35) 0%, rgba(108,114,232,0.35) 50%, rgba(13,15,26,0.95) 100%)',
      borderColor: 'rgba(110,231,183,0.50)',
      glowColor: '#6ee7b7',
      breathingDuration: 4.0,
      particleSpeed: 1.0,
      ambientVibe: 'calm',
    };
  }

  if (energy < 40 && stress < 45) {
    return {
      auraGradient: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.18) 0%, rgba(108,114,232,0.10) 45%, transparent 70%)',
      orbGradient: 'linear-gradient(135deg, rgba(167,139,250,0.35) 0%, rgba(13,15,26,0.95) 100%)',
      borderColor: 'rgba(167,139,250,0.45)',
      glowColor: '#a78bfa',
      breathingDuration: 4.8,
      particleSpeed: 0.7,
      ambientVibe: 'recovery',
    };
  }

  return {
    auraGradient: 'radial-gradient(circle at 50% 45%, rgba(110,231,183,0.14) 0%, rgba(108,114,232,0.14) 40%, transparent 75%)',
    orbGradient: 'linear-gradient(135deg, rgba(110,231,183,0.30) 0%, rgba(108,114,232,0.35) 50%, rgba(13,15,26,0.95) 100%)',
    borderColor: 'rgba(110,231,183,0.45)',
    glowColor: '#6ee7b7',
    breathingDuration: 3.8,
    particleSpeed: 1.0,
    ambientVibe: 'focused',
  };
}

/**
 * Derives a single evidence-based statement for "What's happening?".
 */
export function deriveWhatsHappeningInsight(
  personalState: PersonalState | null,
  recordedSlotsCount: number,
  rhythmData: HistoricalRhythmData
): { headline: string; detail: string; hasData: boolean } {
  if (recordedSlotsCount === 0 || !personalState || personalState.overallConfidence === 0) {
    return {
      headline: 'Mindful is still learning your rhythm.',
      detail: 'Log a few check-ins and your personal wellness patterns will begin taking shape.',
      hasData: false,
    };
  }

  if (recordedSlotsCount < 3) {
    return {
      headline: 'Your personal baseline is forming.',
      detail: `${recordedSlotsCount} check-in${recordedSlotsCount === 1 ? '' : 's'} recorded recently. Consistent logging unlocks deep pattern detection.`,
      hasData: true,
    };
  }

  const avg = rhythmData.averageEnergy;
  const pts = rhythmData.points;
  const firstPt = pts[0];
  const lastPt = pts[pts.length - 1];
  const energyDelta = lastPt.energyLevel - firstPt.energyLevel;

  if (energyDelta >= 2) {
    return {
      headline: 'Your energy has been trending upward.',
      detail: `Shifted by +${energyDelta} pts across your recent recorded check-ins.`,
      hasData: true,
    };
  }
  if (energyDelta <= -2) {
    return {
      headline: 'Your energy has tapered slightly over recent days.',
      detail: `Adjusted by ${energyDelta} pts across your recent recorded check-ins.`,
      hasData: true,
    };
  }

  const moodVal = personalState.dimensions?.mood?.value ?? personalState.mood ?? 50;
  if (moodVal >= 70) {
    return {
      headline: 'Your recent check-ins have leaned toward calm.',
      detail: `Average energy is steady at ${avg ?? 7}/10 with positive emotional resilience.`,
      hasData: true,
    };
  }

  return {
    headline: 'Your state has remained in steady equilibrium.',
    detail: `Average energy is consistent at ${avg ?? 6}/10 without abrupt volatility.`,
    hasData: true,
  };
}

/**
 * Builds the 3D constellation layout coordinates for the Hero Observatory.
 */
export function buildStateConstellation(personalState: PersonalState | null): StateConstellation {
  const isCold = !personalState || personalState.overallConfidence === 0;
  const { title } = deriveStateTitle(personalState, isCold);
  const stateSentence = deriveStateSentence(personalState);
  const theme = deriveStateTheme(personalState);

  const keys: StateDimensionKey[] = ['focus', 'mood', 'energy', 'stress', 'fatigue', 'cognitiveLoad'];

  const nodes: ConstellationNode[] = keys.map((k) => {
    const meta = DIMENSION_METADATA[k];
    const dim = personalState?.dimensions?.[k];
    const fallbackVal = personalState ? (personalState[k] as number) : 50;
    const value = dim ? dim.value : fallbackVal;
    const confidence = isCold ? 0 : (dim?.confidence ?? 0);
    const trend = dim?.trend ?? 'stable';
    const contributingSignalIds = dim?.contributingSignalIds ?? [];
    const isKnown = !isCold && confidence > 0;

    // Small radial displacement based on value deviation from 50
    const valOffset = isKnown ? ((value - 50) / 50) * 15 : 0;
    const [baseX, baseY, baseZ] = meta.baseCoord;

    // Vector normalization for displacement
    const len = Math.sqrt(baseX * baseX + baseY * baseY) || 1;
    const x = Math.round(baseX + (baseX / len) * valOffset);
    const y = Math.round(baseY + (baseY / len) * valOffset);
    const z = Math.round(baseZ + (isKnown ? (confidence - 0.5) * 20 : 0));

    // Scale and opacity mapped to confidence & primacy
    const baseScale = meta.isPrimary ? 1.0 : 0.82;
    const scale = isCold ? baseScale * 0.85 : baseScale * (0.80 + confidence * 0.40);
    const opacity = isCold ? 0.35 : (meta.isPrimary ? 0.50 + confidence * 0.50 : 0.35 + confidence * 0.45);

    return {
      key: k,
      label: meta.label,
      value: Math.round(value),
      confidence,
      trend,
      color: meta.color,
      x,
      y,
      z,
      scale,
      opacity,
      contributingSignalIds,
      isKnown,
      isPrimary: meta.isPrimary,
    };
  });

  // Connections from center to nodes
  const connections: ConstellationConnection[] = nodes.map((node) => ({
    from: 'center',
    to: node.key,
    opacity: isCold ? 0.12 : Math.max(0.15, node.confidence * (node.isPrimary ? 0.6 : 0.35)),
    strokeWidth: isCold ? 1 : (node.isPrimary ? 1.5 + node.confidence * 1.5 : 1),
    color: node.color,
    isPrimary: node.isPrimary,
  }));

  // Peer connections between related dimensions
  const peerPairs: [StateDimensionKey, StateDimensionKey][] = [
    ['focus', 'cognitiveLoad'],
    ['stress', 'fatigue'],
    ['mood', 'energy'],
  ];

  for (const [from, to] of peerPairs) {
    const fromNode = nodes.find((n) => n.key === from);
    const toNode = nodes.find((n) => n.key === to);
    if (fromNode && toNode) {
      const avgConf = (fromNode.confidence + toNode.confidence) / 2;
      const isPrimaryPair = fromNode.isPrimary && toNode.isPrimary;
      connections.push({
        from,
        to,
        opacity: isCold ? 0.08 : Math.max(0.10, avgConf * (isPrimaryPair ? 0.4 : 0.25)),
        strokeWidth: isPrimaryPair ? 1.5 : 1,
        color: fromNode.color,
        isPrimary: isPrimaryPair,
      });
    }
  }

  const overallConf = isCold ? 0 : (personalState?.overallConfidence ?? 0);

  return {
    center: {
      label: 'YOU',
      statusLabel: title,
      stateSentence,
      overallConfidence: overallConf,
      activeSignalsCount: personalState?.activeSignalsCount ?? 0,
      isCold,
      color: theme.glowColor,
      pulseRate: theme.breathingDuration,
      theme,
    },
    nodes,
    connections,
  };
}

/**
 * Pure helper to build the historical rhythm path.
 * Zero-fabrication: Never interpolates points for missing days.
 */
export function buildHistoricalPath(slots: DaySlot[]): HistoricalRhythmData {
  const points: HistoricalObservationPoint[] = [];

  slots.forEach((slot, idx) => {
    if (!slot.primaryLog) return;

    // Normalizing X across 0..6 slots (0% to 100% on a 600px coordinate grid)
    const x = Math.round((idx / Math.max(slots.length - 1, 1)) * 600);
    // Y mapped to Energy (1..10) -> (180 down to 20 px)
    const energy = Math.max(1, Math.min(10, slot.primaryLog.energyLevel));
    const y = Math.round(180 - ((energy - 1) / 9) * 140);

    points.push({
      index: idx,
      dateKey: slot.dateKey,
      dayLabel: slot.dayLabel,
      fullDateLabel: slot.fullDateLabel,
      isToday: slot.isToday,
      moodType: slot.primaryLog.moodType,
      energyLevel: energy,
      notes: slot.primaryLog.notes || '',
      triggers: slot.primaryLog.triggers || [],
      physicalSensations: slot.primaryLog.physicalSensations || [],
      x,
      y,
    });
  });

  if (points.length === 0) {
    return {
      isEmpty: true,
      points: [],
      totalSlots: slots.length,
      recordedCount: 0,
      pathD: '',
      averageEnergy: null,
    };
  }

  // Calculate smooth SVG curve path connecting ONLY real points
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` Q ${prev.x},${prev.y} ${midX},${(prev.y + curr.y) / 2} T ${curr.x},${curr.y}`;
  }

  const sumEnergy = points.reduce((acc, p) => acc + p.energyLevel, 0);
  const averageEnergy = Math.round((sumEnergy / points.length) * 10) / 10;

  return {
    isEmpty: false,
    points,
    totalSlots: slots.length,
    recordedCount: points.length,
    pathD,
    averageEnergy,
  };
}

/**
 * Summarizes the current personal state for the compact header summary.
 */
export function buildCurrentStateSummary(personalState: PersonalState | null): CurrentStateSummary {
  const isCold = !personalState || personalState.overallConfidence === 0;
  const { title, desc } = deriveStateTitle(personalState, isCold);
  const stateSentence = deriveStateSentence(personalState);

  const conf = personalState?.overallConfidence ?? 0;
  const confPct = Math.round(conf * 100);

  let confidenceLabel: CurrentStateSummary['confidenceLabel'] = 'Establishing baseline';
  if (!isCold) {
    if (conf >= 0.70) confidenceLabel = 'High';
    else if (conf >= 0.45) confidenceLabel = 'Moderate';
    else confidenceLabel = 'Low';
  }

  const moodVal = personalState?.dimensions?.mood?.value ?? personalState?.mood ?? 50;
  const energyVal = personalState?.dimensions?.energy?.value ?? personalState?.energy ?? 50;
  const focusVal = personalState?.dimensions?.focus?.value ?? personalState?.focus ?? 50;

  const primaryDimensions = [
    { key: 'mood' as const, label: 'Mood', value: Math.round(moodVal), color: DIMENSION_METADATA.mood.color },
    { key: 'energy' as const, label: 'Energy', value: Math.round(energyVal), color: DIMENSION_METADATA.energy.color },
    { key: 'focus' as const, label: 'Focus', value: Math.round(focusVal), color: DIMENSION_METADATA.focus.color },
  ];

  return {
    title,
    description: desc,
    stateSentence,
    primaryDimensions,
    confidencePct: isCold ? 0 : confPct,
    confidenceLabel,
    isCold,
    activeSignalsCount: personalState?.activeSignalsCount ?? 0,
  };
}

/**
 * Builds the compact 6-dimension metrics list for progressive disclosure.
 */
export function buildDimensionSummary(personalState: PersonalState | null): DimensionMetricSummary[] {
  const isCold = !personalState || personalState.overallConfidence === 0;
  const keys: StateDimensionKey[] = ['mood', 'energy', 'focus', 'stress', 'fatigue', 'cognitiveLoad'];

  return keys.map((k) => {
    const meta = DIMENSION_METADATA[k];
    const dim = personalState?.dimensions?.[k];
    const rawVal = dim ? dim.value : (personalState ? (personalState[k] as number) : 50);
    const confidence = isCold ? 0 : (dim?.confidence ?? 0);
    const isKnown = !isCold && confidence > 0;

    return {
      key: k,
      label: meta.label,
      value: Math.round(rawVal),
      confidence,
      confidencePct: Math.round(confidence * 100),
      trend: dim?.trend ?? 'stable',
      color: meta.color,
      description: meta.description,
      isKnown,
      isPrimary: meta.isPrimary,
    };
  });
}
