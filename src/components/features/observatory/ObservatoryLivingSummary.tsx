/**
 * Observatory Living Summary
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Implements the core 4 immediate emotional answers directly beneath the 3D sanctuary:
 * 1. How am I doing? (Human synthesis + Mood/Energy/Focus trio + Calibration)
 * 2. What's happening? (One concise, evidence-based statement with micro-waveform)
 * 3. What may be influencing you? (Floating context & somatic chips)
 * 4. Your next step (Actionable reflection CTA)
 */

import React from 'react';
import { motion } from 'motion/react';
import { CurrentStateSummary } from '../../../lib/observatoryHelpers';
import { Badge } from '../../ui/Badge';
import {
  Sparkles,
  ShieldCheck,
  Tag,
  Wind,
  Plus,
  ArrowRight,
  Activity,
  Compass,
} from 'lucide-react';
import { useIntervention } from '../../../context/InterventionContext';

interface ObservatoryLivingSummaryProps {
  summary: CurrentStateSummary;
  whatsHappening: { headline: string; detail: string; hasData: boolean };
  triggers: string[];
  sensations: string[];
  onOpenCheckIn: () => void;
  onExploreDetails: () => void;
}

export const ObservatoryLivingSummary: React.FC<ObservatoryLivingSummaryProps> = ({
  summary,
  whatsHappening,
  triggers,
  sensations,
  onOpenCheckIn,
  onExploreDetails,
}) => {
  const { recommendation, openPlayer } = useIntervention();

  const {
    title,
    stateSentence,
    primaryDimensions,
    confidencePct,
    confidenceLabel,
    isCold,
  } = summary;

  const activeSignals = [...triggers.slice(0, 3), ...sensations.slice(0, 2)];

  return (
    <div className="space-y-6">
      {/* ── 1. YOUR CURRENT STATE ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[rgba(13,15,26,0.60)] border border-[rgba(255,255,255,0.07)] backdrop-blur-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
              Your Current State
            </span>
            <Badge variant={isCold ? 'neutral' : 'primary'} size="sm">
              {title}
            </Badge>
          </div>

          <h2 className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.98)] tracking-tight italic">
            "{stateSentence}"
          </h2>

          <p className="text-xs text-[rgba(192,196,234,0.60)] leading-relaxed">
            Derived from continuous mathematical signal fusion across your active reflections.
          </p>
        </div>

        {/* Primary Trio Metrics & Calibration */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-5">
            {primaryDimensions.map((dim) => (
              <div key={dim.key} className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block">
                  {dim.label}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.95)]">
                    {isCold ? '—' : dim.value}
                  </span>
                  <span className="text-[10px] text-[rgba(232,234,246,0.35)] font-mono">/100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block w-px h-10 bg-[rgba(255,255,255,0.08)]" />

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
              Calibration
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6ee7b7]" />
              <span className="font-mono text-xs text-[rgba(232,234,246,0.90)] font-medium">
                {confidenceLabel} {confidencePct > 0 && `· ${confidencePct}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. WHAT'S HAPPENING & WHAT MAY BE INFLUENCING YOU ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WHAT'S HAPPENING? */}
        <div className="p-6 rounded-3xl bg-[rgba(13,15,26,0.55)] border border-[rgba(255,255,255,0.07)] backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
                What's Happening?
              </span>
            </div>

            <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)] leading-snug">
              {whatsHappening.headline}
            </h3>

            <p className="text-xs text-[rgba(192,196,234,0.65)] leading-relaxed">
              {whatsHappening.detail}
            </p>
          </div>

          {/* Delicate Micro-Waveform Visual */}
          <div className="pt-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] animate-pulse" />
              <span className="text-[10px] text-[rgba(232,234,246,0.40)] font-mono">
                Evidence-calibrated trend
              </span>
            </div>

            {/* Subtle SVG mini-wave */}
            <svg width="70" height="20" viewBox="0 0 70 20" className="overflow-visible">
              <path
                d="M 0 10 Q 15 4, 30 12 T 60 8 T 70 10"
                fill="none"
                stroke="#6ee7b7"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>

        {/* WHAT MAY BE INFLUENCING YOU? */}
        <div className="p-6 rounded-3xl bg-[rgba(13,15,26,0.55)] border border-[rgba(255,255,255,0.07)] backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
                What May Be Influencing You?
              </span>
            </div>

            <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)] leading-snug">
              Active Context & Sensations
            </h3>

            {/* Floating Chips */}
            {activeSignals.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeSignals.map((item) => (
                  <motion.span
                    key={item}
                    whileHover={{ scale: 1.05 }}
                    className="px-3 py-1.5 rounded-xl text-xs bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.85)] font-medium transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    {item}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[rgba(192,196,234,0.50)] italic pt-1">
                No active contextual tags recorded recently. Signals are settling near baseline.
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)]">
            <span className="text-[10px] text-[rgba(232,234,246,0.40)] font-mono">
              Self-report signals
            </span>
            <button
              onClick={onExploreDetails}
              className="text-xs font-semibold text-[#6ee7b7] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              See evidence <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. YOUR NEXT STEP ── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[rgba(108,114,232,0.12)] via-[rgba(13,15,26,0.70)] to-[rgba(13,15,26,0.70)] border border-[rgba(108,114,232,0.22)] backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#6ee7b7]">
              Your Next Step
            </span>
            <Badge variant="glass" size="sm">
              {recommendation?.intervention && !recommendation.isColdOrLowConfidence ? 'Personalized Reset' : 'Reflection'}
            </Badge>
          </div>
          <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)]">
            {recommendation?.intervention && !recommendation.isColdOrLowConfidence
              ? `${recommendation.intervention.title} (${recommendation.intervention.durationMinutes}m)`
              : 'Check In With Your State'}
          </h4>
          <p className="text-xs text-[rgba(192,196,234,0.65)] max-w-lg">
            {recommendation?.intervention && !recommendation.isColdOrLowConfidence
              ? recommendation.intervention.shortDescription
              : 'A 30-second check-in reinforces your personal baseline and calibrates your 3D observatory.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {recommendation?.intervention && (
            <button
              onClick={() => openPlayer(recommendation.intervention)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6c72e8] to-[#8b5cf6] hover:opacity-95 text-white font-medium text-xs tracking-wide shadow-[0_4px_20px_rgba(108,114,232,0.40)] transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" /> Start Reset
            </button>
          )}
          <button
            onClick={onOpenCheckIn}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl ${
              recommendation?.intervention
                ? 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.85)] border border-[rgba(255,255,255,0.08)]'
                : 'bg-gradient-to-r from-[#6c72e8] to-[#8b5cf6] hover:opacity-95 text-white shadow-[0_4px_20px_rgba(108,114,232,0.40)]'
            } font-medium text-xs tracking-wide transition-all cursor-pointer shrink-0`}
          >
            <Plus className="w-4 h-4" /> Check In
          </button>
        </div>
      </div>
    </div>
  );
};
