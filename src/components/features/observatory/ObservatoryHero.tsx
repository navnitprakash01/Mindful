/**
 * Observatory Hero — Living 3D State Sanctuary
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * An emotionally resonant, organic 3D centerpiece representing the user's living inner state.
 *
 * FEATURES:
 * - Multi-layered translucent central "YOU" orb with state-responsive breathing aura.
 * - Spatial constellation highlighting the primary emotional trio (Mood, Energy, Focus).
 * - Secondary dimensions (Stress, Fatigue, Cognitive Load) accessible seamlessly.
 * - Multi-layer pointer parallax (background, depth rings, orb, nodes).
 * - Gentle atmospheric particle field responsive to measured vitality.
 * - Accessible via keyboard (Tab, Enter, Space) and touch; respects prefers-reduced-motion.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  StateConstellation,
  ConstellationNode,
  DIMENSION_METADATA,
} from '../../../lib/observatoryHelpers';
import { StateDimensionKey } from '../../../types';
import { Badge } from '../../ui/Badge';
import { Sparkles, X, ChevronRight, Eye, Layers } from 'lucide-react';

interface ObservatoryHeroProps {
  constellation: StateConstellation;
  selectedDimension: StateDimensionKey | null;
  onSelectDimension: (key: StateDimensionKey | null) => void;
  onOpenCheckIn?: () => void;
}

export const ObservatoryHero: React.FC<ObservatoryHeroProps> = ({
  constellation,
  selectedDimension,
  onSelectDimension,
  onOpenCheckIn,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<StateDimensionKey | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [normMouse, setNormMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { center, nodes, connections } = constellation;
  const { theme, isCold } = center;

  // Parallax pointer tracking on desktop
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setNormMouse({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
    },
    [prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setNormMouse({ x: 0, y: 0 });
    setHoveredKey(null);
  }, []);

  const activeDetailNode = selectedDimension
    ? nodes.find((n) => n.key === selectedDimension) || null
    : null;

  // Visible nodes: primary trio always visible; secondary visible if toggled or selected
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => n.isPrimary || showSecondary || selectedDimension === n.key);
  }, [nodes, showSecondary, selectedDimension]);

  // Subtle floating particles for living atmospheric presence
  const particles = useMemo(() => {
    return [
      { id: 1, x: -140, y: -100, size: 3, delay: 0, dur: 4.5 },
      { id: 2, x: 130, y: -80, size: 2.5, delay: 0.8, dur: 5.2 },
      { id: 3, x: -100, y: 90, size: 2, delay: 1.5, dur: 6.0 },
      { id: 4, x: 110, y: 85, size: 3.5, delay: 0.3, dur: 4.8 },
      { id: 5, x: 10, y: -150, size: 2, delay: 2.1, dur: 5.5 },
      { id: 6, x: -180, y: 20, size: 2.5, delay: 1.2, dur: 6.2 },
      { id: 7, x: 170, y: 15, size: 2, delay: 1.8, dur: 5.0 },
    ];
  }, []);

  // Parallax offsets
  const tiltX = prefersReducedMotion ? 0 : normMouse.y * -5;
  const tiltY = prefersReducedMotion ? 0 : normMouse.x * 6;
  const orbShiftX = prefersReducedMotion ? 0 : normMouse.x * 8;
  const orbShiftY = prefersReducedMotion ? 0 : normMouse.y * 8;
  const bgShiftX = prefersReducedMotion ? 0 : normMouse.x * 14;
  const bgShiftY = prefersReducedMotion ? 0 : normMouse.y * 14;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-3xl bg-[rgba(13,15,26,0.65)] border border-[rgba(255,255,255,0.07)] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.50)] overflow-hidden select-none"
    >
      {/* 1. Atmospheric Ambient Background Lighting */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
        style={{
          background: theme.auraGradient,
          transform: `translate3d(${bgShiftX}px, ${bgShiftY}px, 0)`,
        }}
      />

      {/* 2. Top Sanctuary Bar */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: theme.glowColor }}
          />
          <span className="text-[11px] uppercase font-mono tracking-widest text-[rgba(232,234,246,0.65)]">
            Inner State Sanctuary
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Secondary dimensions toggle */}
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wide bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.70)] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3 h-3" />
            <span>{showSecondary ? 'Focus Core Trio' : 'All 6 Dimensions'}</span>
          </button>

          <Badge variant="glass" size="sm" className="font-mono text-[10px]">
            {isCold ? 'Learning Baseline' : `${Math.round(center.overallConfidence * 100)}% Calibrated`}
          </Badge>
        </div>
      </div>

      {/* 3. Main 3D Spatial Canvas */}
      <div
        className="relative w-full h-[390px] sm:h-[460px] flex items-center justify-center overflow-visible"
        style={{ perspective: 1000 }}
      >
        {/* Transforming 3D coordinate space */}
        <div
          className="relative w-[340px] sm:w-[500px] h-[320px] sm:h-[400px] flex items-center justify-center transition-transform duration-300 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          }}
        >
          {/* Subtle concentric depth rings */}
          <div
            className="absolute w-60 sm:w-72 h-60 sm:h-72 rounded-full border border-[rgba(255,255,255,0.03)] pointer-events-none"
            style={{ transform: 'translateZ(-50px)' }}
          />
          <div
            className="absolute w-84 sm:w-[420px] h-84 sm:h-[420px] rounded-full border border-[rgba(255,255,255,0.02)] pointer-events-none"
            style={{ transform: 'translateZ(-80px)' }}
          />

          {/* Gentle Floating Particle Field */}
          {!prefersReducedMotion &&
            particles.map((p) => (
              <motion.div
                key={p.id}
                animate={{
                  y: [0, -12, 0],
                  opacity: [0.2, 0.65, 0.2],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  duration: p.dur / theme.particleSpeed,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: p.size,
                  height: p.size,
                  background: theme.glowColor,
                  left: `calc(50% + ${p.x}px)`,
                  top: `calc(50% + ${p.y}px)`,
                  boxShadow: `0 0 8px ${theme.glowColor}`,
                }}
              />
            ))}

          {/* SVG Connection Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="-250 -200 500 400"
          >
            <defs>
              <linearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={theme.glowColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6c72e8" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {connections.map((c, i) => {
              const toNode = visibleNodes.find((n) => n.key === c.to);
              if (!toNode) return null;

              let fromX = orbShiftX;
              let fromY = orbShiftY;
              if (c.from !== 'center') {
                const fNode = visibleNodes.find((n) => n.key === c.from);
                if (fNode) {
                  fromX = fNode.x;
                  fromY = fNode.y;
                } else {
                  return null;
                }
              }

              const isHighlighted =
                selectedDimension === toNode.key ||
                hoveredKey === toNode.key ||
                (c.from !== 'center' && (selectedDimension === c.from || hoveredKey === c.from));

              return (
                <line
                  key={`line-${i}`}
                  x1={fromX}
                  y1={fromY}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isHighlighted ? toNode.color : c.color}
                  strokeWidth={isHighlighted ? 2.5 : c.strokeWidth}
                  strokeOpacity={isHighlighted ? 0.85 : c.opacity}
                  strokeDasharray={c.from !== 'center' ? '4 4' : undefined}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Central Living State Orb ("YOU") */}
          <div
            tabIndex={0}
            role="button"
            aria-label={`Current inner state: ${center.statusLabel}. ${center.stateSentence}`}
            onClick={() => onSelectDimension(null)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectDimension(null)}
            className="group absolute z-30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
            style={{
              transform: `translate3d(${orbShiftX}px, ${orbShiftY}px, 15px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Outer soft breathing aura */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        scale: [1, 1.15, 1],
                        opacity: isCold ? [0.25, 0.45, 0.25] : [0.35, 0.70, 0.35],
                      }
                }
                transition={{
                  duration: center.pulseRate,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute w-32 sm:w-36 h-32 sm:h-36 rounded-full blur-md"
                style={{
                  background: `radial-gradient(circle, ${theme.glowColor}50 0%, transparent 70%)`,
                }}
              />

              {/* Intermediate translucent orbital ring */}
              <div
                className="absolute w-24 sm:w-28 h-24 sm:h-28 rounded-full border border-[rgba(255,255,255,0.12)] pointer-events-none"
                style={{
                  boxShadow: `0 0 20px ${theme.glowColor}25`,
                }}
              />

              {/* Core Living Orb */}
              <div
                className="w-18 sm:w-20 h-18 sm:h-20 rounded-full border flex flex-col items-center justify-center p-2 transition-all duration-300 shadow-[0_0_32px_rgba(0,0,0,0.6)] group-hover:scale-105"
                style={{
                  background: theme.orbGradient,
                  borderColor: theme.borderColor,
                }}
              >
                <Sparkles className="w-5 h-5 text-white/95 mb-0.5" />
                <span className="text-[11px] font-bold tracking-widest text-white uppercase leading-none">
                  {center.label}
                </span>
                <span
                  className="text-[8px] font-mono mt-0.5 truncate max-w-[50px] opacity-80"
                  style={{ color: theme.glowColor }}
                >
                  {isCold ? 'baseline' : center.statusLabel.slice(0, 7)}
                </span>
              </div>
            </div>
          </div>

          {/* Floating 3D Dimension Nodes */}
          {visibleNodes.map((node) => {
            const isSelected = selectedDimension === node.key;
            const isHovered = hoveredKey === node.key;

            return (
              <div
                key={node.key}
                tabIndex={0}
                role="button"
                aria-label={`${node.label} dimension: ${node.isKnown ? `${node.value} out of 100` : 'Uncalibrated'}`}
                onMouseEnter={() => setHoveredKey(node.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => onSelectDimension(isSelected ? null : node.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDimension(isSelected ? null : node.key);
                  }
                }}
                className="absolute z-40 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate3d(${node.x}px, ${node.y}px, ${node.z}px) scale(${
                    isSelected ? node.scale * 1.18 : isHovered ? node.scale * 1.10 : node.scale
                  })`,
                  opacity: isHovered || isSelected ? 1.0 : node.opacity,
                  transition: 'transform 0.25s ease-out, opacity 0.25s ease-out',
                }}
              >
                <motion.div
                  animate={
                    prefersReducedMotion || !node.isKnown
                      ? {}
                      : {
                          y: [0, -5, 0],
                        }
                  }
                  transition={{
                    duration: 3.2 + (node.z % 2),
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative group flex flex-col items-center"
                >
                  {/* Glowing Node Orb */}
                  <div
                    className={`rounded-2xl border flex flex-col items-center justify-center p-1.5 transition-all duration-200 ${
                      node.isPrimary ? 'w-13 sm:w-15 h-13 sm:h-15' : 'w-11 sm:w-12 h-11 sm:h-12'
                    }`}
                    style={{
                      background: isSelected || isHovered
                        ? `linear-gradient(135deg, ${node.color}40 0%, rgba(13,15,26,0.95) 100%)`
                        : `linear-gradient(135deg, ${node.color}20 0%, rgba(13,15,26,0.85) 100%)`,
                      borderColor: isSelected || isHovered ? node.color : `${node.color}50`,
                      boxShadow: isSelected || isHovered ? `0 0 20px ${node.color}65` : `0 0 10px ${node.color}20`,
                    }}
                  >
                    <span
                      className={`font-mono font-bold text-white leading-none ${
                        node.isPrimary ? 'text-sm sm:text-base' : 'text-xs'
                      }`}
                    >
                      {node.isKnown ? node.value : '—'}
                    </span>
                    <span
                      className="text-[9px] uppercase font-semibold tracking-wider mt-0.5 truncate max-w-[48px] text-center"
                      style={{ color: node.color }}
                    >
                      {node.label}
                    </span>
                  </div>

                  {/* Dimension Name Label */}
                  <div
                    className="mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide bg-[rgba(13,15,26,0.85)] border border-[rgba(255,255,255,0.08)] whitespace-nowrap shadow-sm"
                    style={{
                      color: isSelected || isHovered ? '#fff' : 'rgba(232,234,246,0.70)',
                    }}
                  >
                    {node.label}
                  </div>

                  {/* Interactive Floating Hover Popover */}
                  <AnimatePresence>
                    {isHovered && !isSelected && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className="absolute bottom-full mb-2 z-50 pointer-events-none p-3 rounded-xl bg-[rgba(18,20,32,0.95)] border border-[rgba(255,255,255,0.15)] shadow-2xl backdrop-blur-xl w-48 text-left space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase text-white">
                            {node.label}
                          </span>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: node.color }}
                          >
                            {node.isKnown ? `${node.value} / 100` : 'Establishing'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[rgba(192,196,234,0.60)] leading-tight">
                          {DIMENSION_METADATA[node.key].description}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-[rgba(232,234,246,0.50)] border-t border-[rgba(255,255,255,0.06)]">
                          <span>Confidence</span>
                          <span>{Math.round(node.confidence * 100)}%</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Node Expanded Details Drawer */}
      <AnimatePresence>
        {activeDetailNode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,22,0.92)] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: activeDetailNode.color }}
                  />
                  <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.95)]">
                    {activeDetailNode.label} Dimension
                  </h4>
                  <Badge variant="primary" size="sm" className="font-mono">
                    {activeDetailNode.isKnown ? `${activeDetailNode.value} / 100` : 'Uncalibrated'}
                  </Badge>
                </div>
                <p className="text-xs text-[rgba(192,196,234,0.65)] max-w-xl">
                  {DIMENSION_METADATA[activeDetailNode.key].description}
                </p>
              </div>

              <button
                onClick={() => onSelectDimension(null)}
                aria-label="Close dimension details"
                className="p-1.5 rounded-lg text-[rgba(232,234,246,0.50)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] text-xs">
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
                  Confidence
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {Math.round(activeDetailNode.confidence * 100)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
                  Trend
                </span>
                <span className="font-mono text-base capitalize text-[#6ee7b7]">
                  {activeDetailNode.trend}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] col-span-2">
                <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
                  Contributing Influences
                </span>
                <span className="text-xs text-[rgba(232,234,246,0.75)]">
                  {activeDetailNode.contributingSignalIds.length > 0
                    ? `${activeDetailNode.contributingSignalIds.length} active signal(s) contributing to this estimate`
                    : 'Signals stabilizing around personal baseline'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Visual Representation Disclaimer */}
      <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.20)] flex items-center justify-between text-[11px] text-[rgba(232,234,246,0.40)]">
        <span>Visual representation of your current wellness state.</span>
        {isCold && onOpenCheckIn && (
          <button
            onClick={onOpenCheckIn}
            className="text-[11px] text-[#6ee7b7] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            Check in now <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
