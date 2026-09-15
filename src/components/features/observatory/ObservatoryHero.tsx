/**
 * Observatory Hero — Cinematic 3D Inner State Overview
 * Mindful 3.0 — High-Comprehension Intelligence & 3D Visualization
 *
 * Visual & Information Hierarchy:
 * - 1. Top Overview Bar: "Last 7 Days", status title, accessible Calibration tooltip.
 * - 2. Central 3D Inner State Core:
 *      - Multi-layered translucent glass energy sphere with volumetric breathing glow.
 *      - Slow elliptical orbital rings (18-25s and 30-45s counter-rotations).
 *      - Six 3D floating orbital nodes positioned symmetrically around the core:
 *        Mood (Top), Energy (Top-Right), Tiredness (Bottom-Right),
 *        Mental Load (Bottom), Stress (Bottom-Left), Focus (Top-Left).
 *      - Readable center text ("INNER STATE" + status label). Zero fabricated overall score.
 * - 3. Six Authoritative Dimension Cards:
 *      - Left: Mood, Energy, Focus (vitality/capacities, higher = positive).
 *      - Right: Tiredness, Stress, Mental Load (regulation/demands, lower = positive).
 *      - Semantically accurate delta indicators (↑ / ↓ / →) and plain-language interpretations.
 *      - Bidirectional hover/select synchronization between cards and 3D orbital nodes.
 * - 4. "What This Means" deterministic synthesis glass panel.
 * - 5. Bottom compact Insight strip with pattern exploration link.
 * - 6. Fully responsive: 3-column desktop layout, elegant stacked flow on mobile (no node collision).
 * - 7. Accessible with keyboard navigation and prefers-reduced-motion safety.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  StateConstellation,
  ConstellationNode,
} from '../../../lib/observatoryHelpers';
import { StateDimensionKey, PersonalState, PersonalPattern } from '../../../types';
import { ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';

export interface ObservatoryHeroProps {
  constellation: StateConstellation;
  personalState?: PersonalState | null;
  patterns?: PersonalPattern[];
  selectedDimension: StateDimensionKey | null;
  onSelectDimension: (key: StateDimensionKey | null) => void;
  onOpenCheckIn?: () => void;
  onExplorePatterns?: () => void;
}

/**
 * Deterministic plain-language interpretation based on score and baseline movement.
 * Grounded, non-diagnostic, and non-causal.
 */
function getDimensionInterpretation(
  key: StateDimensionKey,
  value: number,
  delta: number,
  isKnown: boolean
): string {
  if (!isKnown) {
    return 'Awaiting check-in data to establish baseline.';
  }

  switch (key) {
    case 'mood':
      if (value >= 70) {
        return delta > 0
          ? 'Generally positive with uplifting momentum.'
          : 'Generally positive with stable mood patterns.';
      }
      if (value >= 50) {
        return 'Steady, balanced emotional state near baseline.';
      }
      return 'Mildly subdued valence; pacing gently may support balance.';

    case 'energy':
      if (value >= 70) {
        return 'High energetic vitality and physical readiness.';
      }
      if (value >= 50) {
        return delta < 0
          ? 'Energy has dipped slightly across recent check-ins.'
          : 'Moderate, sustainable daily energy level.';
      }
      return 'Energy is lower; gentle opportunities for rest welcome.';

    case 'focus':
      if (value >= 70) {
        return delta > 0
          ? 'Recent signals suggest relatively strong, clear focus.'
          : 'Strong attentional clarity and directional flow.';
      }
      if (value >= 50) {
        return 'Steady, functional concentration for daily tasks.';
      }
      return 'Attention feels divided; single-tasking may assist.';

    case 'fatigue':
      if (value <= 35) {
        return delta < 0
          ? 'Tiredness is lower than your recent baseline.'
          : 'Low fatigue; feeling physically refreshed.';
      }
      if (value <= 60) {
        return 'Normal daily tiredness consistent with waking activity.';
      }
      return 'Elevated physical weariness; restful pauses recommended.';

    case 'stress':
      if (value <= 35) {
        return delta < 0
          ? 'Lower stress compared with recent observations.'
          : 'Low sympathetic activation; calm resting state.';
      }
      if (value <= 60) {
        return 'Manageable ambient stress within normal tolerance.';
      }
      return 'Elevated tension; gentle decompression can help reset.';

    case 'cognitiveLoad':
      if (value <= 35) {
        return 'Mental bandwidth is open and uncrowded.';
      }
      if (value <= 60) {
        return 'Current mental load is relatively moderate.';
      }
      return 'High working memory demand; prioritizing tasks may help.';
  }
}

/**
 * Deterministic synthesis explaining current state across dimensions.
 * Strictly non-diagnostic and non-causal.
 */
function deriveWhatThisMeans(
  nodes: ConstellationNode[],
  isCold: boolean
): string {
  if (isCold) {
    return 'Complete a quick mood reflection to calibrate your dimensions and illuminate what your living state indicates.';
  }

  const moodNode = nodes.find((n) => n.key === 'mood');
  const energyNode = nodes.find((n) => n.key === 'energy');
  const focusNode = nodes.find((n) => n.key === 'focus');
  const fatigueNode = nodes.find((n) => n.key === 'fatigue');
  const stressNode = nodes.find((n) => n.key === 'stress');
  const cogNode = nodes.find((n) => n.key === 'cognitiveLoad');

  const moodVal = moodNode?.value ?? 50;
  const energyVal = energyNode?.value ?? 50;
  const focusVal = focusNode?.value ?? 50;
  const fatigueVal = fatigueNode?.value ?? 50;
  const stressVal = stressNode?.value ?? 50;
  const cogVal = cogNode?.value ?? 50;

  const strongAspects: string[] = [];
  if (moodVal >= 65) strongAspects.push('mood');
  if (focusVal >= 65) strongAspects.push('focus');
  if (energyVal >= 65) strongAspects.push('vitality');
  if (stressVal <= 35) strongAspects.push('calm');

  const recoveryAspects: string[] = [];
  if (stressVal > 60) recoveryAspects.push('stress');
  if (fatigueVal > 55) recoveryAspects.push('tiredness');
  if (cogVal > 60) recoveryAspects.push('mental load');
  if (energyVal < 45) recoveryAspects.push('energy');

  if (strongAspects.length >= 2 && recoveryAspects.length > 0) {
    return `Your ${strongAspects.join(' and ')} are currently relatively strong, while ${recoveryAspects.join(' and ')} show some room for recovery.`;
  }

  if (strongAspects.length >= 2) {
    return `Your ${strongAspects.join(' and ')} are mutually reinforcing, indicating a balanced, expansive state.`;
  }

  if (recoveryAspects.length >= 2) {
    return `Recent signals reflect elevated ${recoveryAspects.join(' and ')}; gentle pacing and restful boundaries will support your equilibrium.`;
  }

  return 'Your wellness dimensions are currently resting in a steady, moderate equilibrium close to your baseline.';
}

/**
 * Concise evidence-based observation strip.
 */
function deriveInsightText(
  nodes: ConstellationNode[],
  patterns?: PersonalPattern[],
  isCold?: boolean
): string {
  if (isCold) {
    return 'Your baseline begins establishing with each recorded check-in.';
  }

  if (patterns && patterns.length > 0) {
    const topPattern = patterns.find((p) => p.status === 'validated') || patterns[0];
    if (topPattern && topPattern.title) {
      return topPattern.title;
    }
  }

  const focusNode = nodes.find((n) => n.key === 'focus');
  const moodNode = nodes.find((n) => n.key === 'mood');
  const stressNode = nodes.find((n) => n.key === 'stress');

  if (focusNode && focusNode.value >= 65) {
    return 'Your focus has remained relatively strong across recent check-ins.';
  }
  if (stressNode && stressNode.value <= 35) {
    return 'Your autonomic stress markers have maintained a calm, resting baseline.';
  }
  if (moodNode && moodNode.value >= 65) {
    return 'Your emotional equilibrium has trended positively over the past 7 days.';
  }

  return 'Your active signals indicate consistent equilibrium across daily rhythms.';
}

export const ObservatoryHero: React.FC<ObservatoryHeroProps> = ({
  constellation,
  personalState,
  patterns,
  selectedDimension,
  onSelectDimension,
  onOpenCheckIn,
  onExplorePatterns,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<StateDimensionKey | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { center, nodes } = constellation;
  const { theme, isCold } = center;

  // Subtle 3D pointer parallax
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setMousePos({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
    },
    [prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
    setHoveredKey(null);
  }, []);

  // Process dimensions with semantic delta and interpretations
  const dimensionData = useMemo(() => {
    return nodes.map((node) => {
      const isLowerBetter =
        node.key === 'stress' || node.key === 'fatigue' || node.key === 'cognitiveLoad';

      const rawDev = personalState?.dimensions?.[node.key]?.baselineDeviation;
      let delta = typeof rawDev === 'number' && Number.isFinite(rawDev) ? Math.round(rawDev) : 0;
      if (delta === 0 && node.trend && node.trend !== 'stable') {
        delta = node.trend === 'improving' ? (isLowerBetter ? -3 : 3) : (isLowerBetter ? 3 : -3);
      }

      let deltaArrow = '→';
      let deltaText = 'Steady';
      let isPositiveDelta: boolean | null = null;
      let ariaDelta = `${node.label} is stable near baseline`;

      if (delta !== 0) {
        const sign = delta > 0 ? `+${delta}` : `${delta}`;
        if (isLowerBetter) {
          if (delta < 0) {
            deltaArrow = '↓';
            deltaText = sign;
            isPositiveDelta = true;
            ariaDelta = `${node.label} decreased by ${Math.abs(delta)} points, positive change`;
          } else {
            deltaArrow = '↑';
            deltaText = sign;
            isPositiveDelta = false;
            ariaDelta = `${node.label} increased by ${Math.abs(delta)} points, elevated load`;
          }
        } else {
          if (delta > 0) {
            deltaArrow = '↑';
            deltaText = sign;
            isPositiveDelta = true;
            ariaDelta = `${node.label} increased by ${delta} points, positive improvement`;
          } else {
            deltaArrow = '↓';
            deltaText = sign;
            isPositiveDelta = false;
            ariaDelta = `${node.label} decreased by ${Math.abs(delta)} points, lower than baseline`;
          }
        }
      }

      const interpretation = getDimensionInterpretation(
        node.key,
        node.value,
        delta,
        node.isKnown
      );

      return {
        key: node.key,
        label: node.label,
        value: node.value,
        confidence: node.confidence,
        color: node.color,
        isKnown: node.isKnown,
        delta,
        deltaArrow,
        deltaText,
        isPositiveDelta,
        ariaDelta,
        interpretation,
      };
    });
  }, [nodes, personalState]);

  // Symmetrical grouping for the 6 cards: Left (Mood, Energy, Focus) and Right (Tiredness, Stress, Mental Load)
  const leftKeys: StateDimensionKey[] = ['mood', 'energy', 'focus'];
  const rightKeys: StateDimensionKey[] = ['fatigue', 'stress', 'cognitiveLoad'];

  const leftDimensions = useMemo(
    () => leftKeys.map((k) => dimensionData.find((d) => d.key === k)!).filter(Boolean),
    [dimensionData]
  );
  const rightDimensions = useMemo(
    () => rightKeys.map((k) => dimensionData.find((d) => d.key === k)!).filter(Boolean),
    [dimensionData]
  );

  const whatThisMeans = useMemo(
    () => deriveWhatThisMeans(nodes, isCold),
    [nodes, isCold]
  );

  const insightText = useMemo(
    () => deriveInsightText(nodes, patterns, isCold),
    [nodes, patterns, isCold]
  );

  // Geometry for the six 3D orbital nodes around the core
  // Mood (Top), Energy (Top-Right), Tiredness (Bottom-Right),
  // Mental Load (Bottom), Stress (Bottom-Left), Focus (Top-Left)
  const orbitalNodesConfig = useMemo(() => {
    const coords: Record<StateDimensionKey, { x: number; y: number; z: number }> = {
      mood: { x: 0, y: -130, z: 20 },
      energy: { x: 135, y: -50, z: 15 },
      fatigue: { x: 130, y: 70, z: -10 },
      cognitiveLoad: { x: 0, y: 130, z: -15 },
      stress: { x: -130, y: 70, z: -10 },
      focus: { x: -135, y: -50, z: 15 },
    };

    return dimensionData.map((dim) => {
      const pos = coords[dim.key] || { x: 0, y: 0, z: 0 };
      return {
        ...dim,
        pos,
      };
    });
  }, [dimensionData]);

  // Parallax tilt values
  const tiltX = prefersReducedMotion ? 0 : mousePos.y * -6;
  const tiltY = prefersReducedMotion ? 0 : mousePos.x * 7;
  const coreShiftX = prefersReducedMotion ? 0 : mousePos.x * 10;
  const coreShiftY = prefersReducedMotion ? 0 : mousePos.y * 10;

  // Active highlighted key (either hovered or explicitly selected)
  const activeKey = hoveredKey || selectedDimension;

  const renderDimensionCard = (dim: (typeof dimensionData)[number]) => {
    const isSelected = selectedDimension === dim.key;
    const isHovered = hoveredKey === dim.key;
    const isHighlighted = isSelected || isHovered;

    return (
      <div
        key={dim.key}
        tabIndex={0}
        role="button"
        aria-label={`${dim.label}: ${dim.isKnown ? `${dim.value} out of 100` : 'Awaiting data'}. ${dim.ariaDelta}. ${dim.interpretation}`}
        onMouseEnter={() => setHoveredKey(dim.key)}
        onMouseLeave={() => setHoveredKey(null)}
        onClick={() => onSelectDimension(isSelected ? null : dim.key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectDimension(isSelected ? null : dim.key);
          }
        }}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden group ${
          isHighlighted
            ? 'border-[rgba(255,255,255,0.32)] shadow-[0_0_30px_rgba(108,114,232,0.22)] ring-1 ring-[rgba(255,255,255,0.22)] scale-[1.02]'
            : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.03)]'
        }`}
        style={{
          background: isHighlighted
            ? `linear-gradient(135deg, ${dim.color}16 0%, rgba(15,18,34,0.85) 100%)`
            : 'rgba(15,18,34,0.55)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Subtle accent line on hover */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${dim.color}, transparent)`,
            opacity: isHighlighted ? 1 : 0,
          }}
        />

        {/* Top: Name + Color Dot + Delta Badge */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125"
              style={{ background: dim.color, boxShadow: `0 0 8px ${dim.color}90` }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[rgba(232,234,246,0.65)] truncate">
              {dim.label}
            </span>
          </div>

          {/* Direction / Change Badge */}
          {dim.isKnown && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold flex items-center gap-0.5 transition-colors ${
                dim.isPositiveDelta === true
                  ? 'text-[#6ee7b7] bg-[#6ee7b7]/10 border border-[#6ee7b7]/20'
                  : dim.isPositiveDelta === false
                  ? 'text-[#fbbf24] bg-[#fbbf24]/10 border border-[#fbbf24]/20'
                  : 'text-[rgba(232,234,246,0.50)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]'
              }`}
            >
              <span>{dim.deltaArrow}</span>
              <span>{dim.deltaText}</span>
            </span>
          )}
        </div>

        {/* Score */}
        <div className="flex items-baseline gap-1.5 my-1">
          <span className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.98)] tracking-tight">
            {dim.isKnown ? dim.value : '—'}
          </span>
          <span className="text-[10px] font-mono text-[rgba(232,234,246,0.35)]">
            / 100
          </span>
        </div>

        {/* Plain-Language Interpretation */}
        <p className="text-[11px] text-[rgba(192,196,234,0.70)] leading-relaxed mt-1 line-clamp-2">
          {dim.interpretation}
        </p>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-3xl bg-[rgba(13,15,26,0.70)] border border-[rgba(255,255,255,0.08)] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.60)] p-6 sm:p-8 space-y-6 select-none overflow-hidden"
    >
      {/* ── Cinematic Restrained Atmospheric Background Lighting ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${theme.glowColor}25 0%, rgba(13,15,26,0) 65%), radial-gradient(circle at 20% 80%, rgba(108,114,232,0.12) 0%, transparent 50%)`,
          transform: `translate3d(${coreShiftX * 0.5}px, ${coreShiftY * 0.5}px, 0)`,
        }}
      />

      {/* 1. Header Overview Bar */}
      <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[rgba(255,255,255,0.07)]">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: theme.glowColor, boxShadow: `0 0 10px ${theme.glowColor}` }}
            />
            <span className="text-[11px] uppercase font-mono tracking-widest text-[rgba(232,234,246,0.65)]">
              Inner State Overview
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.70)]">
              Last 7 Days
            </span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl text-[rgba(232,234,246,0.98)] mt-1.5 tracking-tight">
            {isCold ? 'Establishing Your Baseline' : center.statusLabel}
          </h2>
          <p className="text-xs text-[rgba(192,196,234,0.65)] mt-0.5">
            {isCold
              ? 'Check in with your reflections to calibrate your personal wellness equilibrium.'
              : center.stateSentence}
          </p>
        </div>

        {/* Calibration Badge with accessible tooltip */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className="group relative cursor-help"
            title="Calibration reflects how much recent, consistent signal data is available for this view. It is not a measure of health or diagnosis."
            aria-label="Calibration explanation"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <span className="font-mono text-xs font-semibold text-[rgba(232,234,246,0.90)]">
                {isCold ? 'Learning Baseline' : `${Math.round(center.overallConfidence * 100)}% Calibrated`}
              </span>
              <span className="text-[10px] text-[rgba(108,114,232,0.70)]">ⓘ</span>
            </div>
            {/* Accessible Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover:block w-64 p-2.5 rounded-xl text-[11px] shadow-2xl z-50 leading-relaxed text-left bg-[#121526] border border-[rgba(255,255,255,0.14)] text-[rgba(232,234,246,0.85)] backdrop-blur-md">
              <div className="font-semibold text-white mb-0.5">Signal Calibration</div>
              <div>Calibration reflects how much recent, consistent signal data is available for this view. It is not a measure of health or diagnosis.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Wellness Architecture */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Mood, Energy, Focus (4 cols on desktop) */}
        <div className="lg:col-span-4 order-2 lg:order-1 flex flex-col gap-3.5">
          {leftDimensions.map((dim) => renderDimensionCard(dim))}
        </div>

        {/* Center Column: 3D Inner State Core + Orbital System + What This Means (4 cols on desktop) */}
        <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col items-center justify-center gap-5">
          {/* 3D Visual Centerpiece Canvas */}
          <div
            className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] lg:w-[380px] lg:h-[380px] flex items-center justify-center overflow-visible"
            style={{ perspective: 1000 }}
          >
            {/* 3D Coordinates Space */}
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
              }}
            >
              {/* ── Volumetric Ambient Glowing Aura ── */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: [1, 1.12, 1],
                        opacity: isCold ? [0.20, 0.35, 0.20] : [0.35, 0.65, 0.35],
                      }
                }
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute w-44 sm:w-52 h-44 sm:h-52 rounded-full blur-2xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${theme.glowColor}55 0%, transparent 70%)`,
                  transform: 'translateZ(-30px)',
                }}
              />

              {/* ── Outer Orbital Elliptical Ring (30-45s rotation) ── */}
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: 360 }}
                transition={{
                  duration: 38,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute w-64 sm:w-76 h-64 sm:h-76 rounded-full border border-[rgba(255,255,255,0.06)] pointer-events-none"
                style={{
                  transform: 'rotateX(68deg)',
                  boxShadow: '0 0 25px rgba(108,114,232,0.12)',
                }}
              >
                {/* Tiny orbiting particle on outer ring */}
                {!prefersReducedMotion && (
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] shadow-[0_0_8px_#6ee7b7] absolute -top-1 left-1/2 -translate-x-1/2"
                  />
                )}
              </motion.div>

              {/* ── Inner Orbital Elliptical Ring (18-25s counter-rotation) ── */}
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: -360 }}
                transition={{
                  duration: 22,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute w-48 sm:w-56 h-48 sm:h-56 rounded-full border border-[rgba(255,255,255,0.09)] pointer-events-none"
                style={{
                  transform: 'rotateX(62deg)',
                  boxShadow: '0 0 20px rgba(56,189,248,0.15)',
                }}
              >
                {/* Tiny orbiting particle on inner ring */}
                {!prefersReducedMotion && (
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8] absolute -bottom-1 left-1/2 -translate-x-1/2"
                  />
                )}
              </motion.div>

              {/* ── Central Glass Sphere: "Inner State Core" ── */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: [1, 1.04, 1],
                      }
                }
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-30 w-32 sm:w-36 h-32 sm:h-36 rounded-full flex flex-col items-center justify-center p-3 text-center border shadow-2xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(20,24,45,0.85) 55%, rgba(13,15,26,0.95) 100%)',
                  borderColor: activeKey ? theme.glowColor : 'rgba(255,255,255,0.18)',
                  boxShadow: activeKey
                    ? `inset 0 0 25px rgba(255,255,255,0.20), inset 0 0 45px ${theme.glowColor}40, 0 0 40px ${theme.glowColor}50`
                    : `inset 0 0 20px rgba(255,255,255,0.12), inset 0 0 35px ${theme.glowColor}25, 0 16px 40px rgba(0,0,0,0.60), 0 0 25px ${theme.glowColor}20`,
                  backdropFilter: 'blur(24px)',
                  transform: `translateZ(10px) translate3d(${coreShiftX}px, ${coreShiftY}px, 0)`,
                }}
              >
                <Sparkles className="w-4 h-4 text-white/90 mb-1" />
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#6ee7b7] font-semibold leading-none mb-1">
                  Inner State
                </span>
                <span className="font-display-lg text-xs sm:text-sm font-bold text-white leading-tight max-w-[105px] line-clamp-2">
                  {isCold ? 'Baseline' : center.statusLabel}
                </span>
                <span className="text-[9px] font-mono text-[rgba(232,234,246,0.50)] mt-1">
                  {isCold ? 'Learning' : `${center.activeSignalsCount || 6} signals`}
                </span>
              </motion.div>

              {/* ── 6 Dimensions as 3D Floating Orbital Nodes (Desktop / Large Displays) ── */}
              <div className="hidden lg:block absolute inset-0 pointer-events-none">
                {orbitalNodesConfig.map((node) => {
                  const isSelected = selectedDimension === node.key;
                  const isHovered = hoveredKey === node.key;
                  const isHighlighted = isSelected || isHovered;

                  return (
                    <div
                      key={node.key}
                      tabIndex={0}
                      role="button"
                      aria-label={`Orbital node ${node.label}: ${node.value} / 100`}
                      onMouseEnter={() => setHoveredKey(node.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onClick={() => onSelectDimension(isSelected ? null : node.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectDimension(isSelected ? null : node.key);
                        }
                      }}
                      className="absolute pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl transition-all duration-300"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate3d(${node.pos.x}px, ${node.pos.y}px, ${
                          isHighlighted ? node.pos.z + 25 : node.pos.z
                        }px) scale(${isHighlighted ? 1.15 : 1})`,
                        zIndex: isHighlighted ? 50 : 35,
                      }}
                    >
                      <div
                        className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-center gap-0.5 shadow-lg transition-all duration-300 ${
                          isHighlighted
                            ? 'bg-[rgba(18,22,42,0.95)] border-white/40 shadow-[0_0_20px_rgba(108,114,232,0.4)]'
                            : 'bg-[rgba(14,17,32,0.80)] border-white/10 hover:border-white/25'
                        }`}
                        style={{
                          backdropFilter: 'blur(16px)',
                          boxShadow: isHighlighted ? `0 0 16px ${node.color}70` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: node.color }}
                          />
                          <span className="text-[9px] uppercase font-bold tracking-wider text-[rgba(232,234,246,0.75)]">
                            {node.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-white">
                            {node.isKnown ? node.value : '—'}
                          </span>
                          {node.isKnown && (
                            <span
                              className={`text-[9px] font-mono font-semibold ${
                                node.isPositiveDelta === true
                                  ? 'text-[#6ee7b7]'
                                  : node.isPositiveDelta === false
                                  ? 'text-[#fbbf24]'
                                  : 'text-[rgba(232,234,246,0.40)]'
                              }`}
                            >
                              {node.deltaArrow} {node.deltaText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── "What This Means" Deterministic Glass Panel ── */}
          <div className="w-full p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] shadow-lg backdrop-blur-xl text-left space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6ee7b7]">
                What This Means
              </span>
            </div>
            <p className="text-xs text-[rgba(232,234,246,0.85)] leading-relaxed">
              {whatThisMeans}
            </p>
          </div>
        </div>

        {/* Right Column: Tiredness, Stress, Mental Load (4 cols on desktop) */}
        <div className="lg:col-span-4 order-3 lg:order-3 flex flex-col gap-3.5">
          {rightDimensions.map((dim) => renderDimensionCard(dim))}
        </div>
      </div>

      {/* 3. Bottom Compact Insight Strip */}
      <div className="relative z-20 pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[9px] uppercase font-mono font-bold tracking-wider bg-[rgba(108,114,232,0.15)] text-[#c0c4ea] border border-[rgba(108,114,232,0.30)] shrink-0">
            Insight
          </span>
          <span className="text-[rgba(232,234,246,0.80)] leading-relaxed">
            {insightText}
          </span>
        </div>
        {onExplorePatterns && (
          <button
            onClick={onExplorePatterns}
            className="text-xs font-semibold text-[#6ee7b7] hover:text-white transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Explore your patterns</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
