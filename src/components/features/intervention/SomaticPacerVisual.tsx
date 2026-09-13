/**
 * SomaticPacerVisual Component
 * Mindful 2.0 — Phase 12: In-Session Adaptive Biofeedback & Somatic Co-Regulation Runner
 *
 * Visualizes the adaptive breathing cycle with smooth, calm expansion and contraction.
 * Respects bounded cycle pacing [7.0s, 12.0s] without erratic animation transitions.
 * Non-clinical, non-diagnostic: displays observable movement stability indicators.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import { PacingState, BiofeedbackStatus, SomaticMetrics } from '../../../types/biofeedback';

interface SomaticPacerVisualProps {
  pacingState: PacingState;
  status: BiofeedbackStatus;
  metrics: SomaticMetrics | null;
  secondsRemaining: number;
  onDisableBiofeedback?: () => void;
  formatTime: (seconds: number) => string;
}

export const SomaticPacerVisual: React.FC<SomaticPacerVisualProps> = ({
  pacingState,
  status,
  metrics,
  secondsRemaining,
  onDisableBiofeedback,
  formatTime,
}) => {
  const { phase, cycleSeconds } = pacingState;

  // Derive visual scale & label from phase
  let phaseLabel = 'Inhale';
  let phaseSubtext = 'Expanding with calm presence';
  let scale = 1.0;

  if (phase === 'inhale') {
    phaseLabel = 'Inhale';
    phaseSubtext = 'Slow, gentle expansion through the nose';
    scale = 1.45;
  } else if (phase === 'hold_in') {
    phaseLabel = 'Hold';
    phaseSubtext = 'Soft pause, keeping chest relaxed';
    scale = 1.45;
  } else if (phase === 'exhale') {
    phaseLabel = 'Exhale';
    phaseSubtext = 'Smooth release, letting shoulders drop';
    scale = 0.95;
  } else if (phase === 'hold_out') {
    phaseLabel = 'Hold Empty';
    phaseSubtext = 'Resting in natural stillness';
    scale = 0.95;
  }

  const isBiofeedbackActive = status === 'active' || status === 'degraded';

  return (
    <div className="flex flex-col items-center justify-center my-6 space-y-6">
      {/* Dynamic Pacing Orb Visualizer */}
      <div className="relative flex items-center justify-center w-56 h-56">
        {/* Outer ambient glow ring */}
        <motion.div
          animate={{
            scale: [scale * 0.95, scale * 1.05, scale],
            opacity: phase === 'inhale' ? 0.35 : phase === 'exhale' ? 0.15 : 0.25,
          }}
          transition={{
            duration: cycleSeconds / 2,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(192,196,234,0.30)_0%,transparent_70%)] blur-xl"
        />

        {/* Dynamic Expanding/Contracting Breathing Orb */}
        <motion.div
          animate={{ scale }}
          transition={{
            duration:
              phase === 'inhale'
                ? pacingState.inhaleSeconds
                : phase === 'exhale'
                ? pacingState.exhaleSeconds
                : 0.4,
            ease: 'easeInOut',
          }}
          className="w-40 h-40 rounded-full border border-[rgba(192,196,234,0.35)] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(192,196,234,0.18)_0%,rgba(192,196,234,0.03)_80%)] shadow-[0_0_30px_rgba(192,196,234,0.15)] relative z-10"
        >
          {/* Phase name */}
          <span className="text-sm font-semibold tracking-wider uppercase text-[#c0c4ea]">
            {phaseLabel}
          </span>
          {/* Step timer countdown */}
          <span className="text-2xl font-display-lg font-light text-[rgba(232,234,246,0.95)] mt-1">
            {formatTime(secondsRemaining)}
          </span>
          {/* Cycle pace badge */}
          <span className="text-[10px] font-mono text-[rgba(232,234,246,0.40)] mt-0.5">
            {cycleSeconds.toFixed(1)}s cycle
          </span>
        </motion.div>
      </div>

      {/* Breathing guidance subtext */}
      <div className="text-center space-y-1">
        <p className="text-xs text-[rgba(232,234,246,0.75)] font-medium">
          {phaseSubtext}
        </p>
      </div>

      {/* Somatic Biofeedback Telemetry Bar */}
      {isBiofeedbackActive && (
        <div className="flex flex-col items-center space-y-2 max-w-xs w-full p-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between w-full text-[11px]">
            <div className="flex items-center gap-1.5 text-[#6ee7b7]">
              {status === 'active' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#6ee7b7]" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-[#fbbf24]" />
              )}
              <span>
                {status === 'active' ? 'Movement stability' : 'Stabilizing tracking...'}
              </span>
            </div>
            {metrics && (
              <span className="font-mono text-[rgba(232,234,246,0.80)]">
                {metrics.stillnessScore.toFixed(0)}%
              </span>
            )}
          </div>

          {/* Stillness Progress Indicator */}
          {metrics && (
            <div className="w-full bg-[rgba(255,255,255,0.08)] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#818cf8] to-[#6ee7b7] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, Math.min(100, metrics.stillnessScore))}%` }}
              />
            </div>
          )}

          {/* Privacy affirmation & opt-out button */}
          <div className="flex items-center justify-between w-full pt-1">
            <span className="text-[10px] text-[rgba(232,234,246,0.35)] flex items-center gap-1">
              <Eye className="w-3 h-3" /> 100% on-device
            </span>
            {onDisableBiofeedback && (
              <button
                type="button"
                onClick={onDisableBiofeedback}
                className="text-[10px] text-[rgba(232,234,246,0.45)] hover:text-white underline underline-offset-2 transition-colors"
              >
                Turn off camera
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
