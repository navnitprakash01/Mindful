/**
 * Observatory Living Summary
 * Mindful 3.0 — Simplified Insights Mid-Section
 *
 * Provides three clean, immediate answers for normal users:
 * 1. CURRENT STATE (Human state sentence, Mood/Energy/Focus trio with semantic delta badges, calibration pill & accessible info tooltip)
 * 2. WHAT'S CHANGING (Concise intelligence summary, trend delta badge, and subtle mini trend curve)
 * 3. WHAT YOU'VE NOTICED (Contextual check-in chips with non-causal framing, and 'View evidence →' deep dive link)
 */

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CurrentStateSummary, buildCurrentStateSummary } from '../../../lib/observatoryHelpers';
import { PersonalState } from '../../../types';
import { Badge } from '../../ui/Badge';
import { ShieldCheck, ArrowRight, Info } from 'lucide-react';

interface ObservatoryLivingSummaryProps {
  summary?: CurrentStateSummary;
  constellation?: any;
  whatsHappening: { headline: string; detail: string; hasData: boolean };
  triggers?: string[];
  sensations?: string[];
  personalState?: PersonalState | null;
  onOpenCheckIn?: () => void;
  onExploreDetails: () => void;
}

export const ObservatoryLivingSummary: React.FC<ObservatoryLivingSummaryProps> = ({
  summary,
  whatsHappening,
  triggers = [],
  sensations = [],
  personalState,
  onExploreDetails,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [showTooltip, setShowTooltip] = useState(false);

  const effectiveSummary = summary || buildCurrentStateSummary(personalState ?? null);

  const {
    title,
    stateSentence,
    primaryDimensions,
    confidencePct,
    isCold,
  } = effectiveSummary;

  const activeSignals = [...(triggers || []).slice(0, 4), ...(sensations || []).slice(0, 3)];

  // Trend analysis for "WHAT'S CHANGING"
  const deltaMatch = whatsHappening.detail ? whatsHappening.detail.match(/([+-]?\d+)\s*pts?/i) : null;
  let trendBadgeText = '';
  let trendBadgeStyle = '';
  let trendLineColor = '#6ee7b7';
  let trendPulseColor = 'bg-[#6ee7b7]';
  let trendSvgPath = 'M 0 11 Q 20 5, 40 11 T 76 11';
  let trendCircleY = 11;

  if (deltaMatch) {
    const num = parseInt(deltaMatch[1], 10);
    if (num > 0) {
      trendBadgeText = `↑ ${num} points`;
      trendBadgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      trendLineColor = '#6ee7b7';
      trendPulseColor = 'bg-[#6ee7b7]';
      trendSvgPath = 'M 0 16 Q 20 14, 40 10 T 76 5';
      trendCircleY = 5;
    } else if (num < 0) {
      trendBadgeText = `↓ ${Math.abs(num)} points`;
      trendBadgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      trendLineColor = '#f59e0b';
      trendPulseColor = 'bg-amber-400';
      trendSvgPath = 'M 0 6 Q 20 8, 40 12 T 76 17';
      trendCircleY = 17;
    }
  } else if (whatsHappening.hasData) {
    trendBadgeText = 'Recent trend';
    trendBadgeStyle = 'bg-white/5 text-[rgba(232,234,246,0.60)] border-white/10';
    trendLineColor = '#38bdf8';
    trendPulseColor = 'bg-[#38bdf8]';
    trendSvgPath = 'M 0 11 Q 20 7, 40 11 T 76 11';
    trendCircleY = 11;
  }
  const hasTrendBadge = Boolean(trendBadgeText);

  return (
    <div className="space-y-6">
      {/* ── 1. CURRENT STATE ── */}
      <div
        className="p-6 sm:p-8 rounded-3xl relative overflow-hidden backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        style={{
          background: 'rgba(13,15,26,0.65)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.36)',
        }}
      >
        {/* Subtle top ambient sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 0%, rgba(108,114,232,0.12) 0%, transparent 60%)',
          }}
        />

        <div className="space-y-2 max-w-xl relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
              CURRENT STATE
            </span>
            <Badge variant={isCold ? 'neutral' : 'primary'} size="sm">
              {title}
            </Badge>
          </div>

          <h2 className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.98)] tracking-tight">
            "{stateSentence}"
          </h2>

          <p className="text-xs text-[rgba(192,196,234,0.70)] leading-relaxed">
            Based on your recent check-ins and reflections.
          </p>
        </div>

        {/* Primary Trio Metrics & Calibration */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 w-full md:w-auto justify-between md:justify-end relative z-10">
          <div className="flex items-center gap-5 sm:gap-6">
            {primaryDimensions.map((dim) => {
              const dimData = personalState?.dimensions?.[dim.key];
              const rawDev = dimData?.baselineDeviation;
              let delta = typeof rawDev === 'number' && Number.isFinite(rawDev) ? Math.round(rawDev) : 0;
              if (delta === 0 && dimData?.trend && dimData.trend !== 'stable') {
                delta = dimData.trend === 'improving' ? 3 : -3;
              }

              let deltaBadge = '→ Steady';
              let badgeColor = 'bg-white/5 text-[rgba(232,234,246,0.55)] border-white/10';

              if (!isCold) {
                if (delta > 0) {
                  deltaBadge = `↑ +${delta}`;
                  badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                } else if (delta < 0) {
                  deltaBadge = `↓ ${delta}`;
                  badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                } else {
                  deltaBadge = '→ Steady';
                  badgeColor = 'bg-white/5 text-[rgba(232,234,246,0.60)] border-white/10';
                }
              } else {
                deltaBadge = 'Baseline';
                badgeColor = 'bg-white/5 text-[rgba(232,234,246,0.45)] border-white/10';
              }

              return (
                <div key={dim.key} className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[rgba(232,234,246,0.50)] block">
                    {dim.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.98)] font-medium">
                      {isCold ? '—' : dim.value}
                    </span>
                    <span className="text-[10px] text-[rgba(232,234,246,0.35)] font-mono">/100</span>
                  </div>
                  <div
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium border ${badgeColor}`}
                    aria-label={`${dim.label} delta: ${deltaBadge}`}
                  >
                    {deltaBadge}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block w-px h-12 bg-[rgba(255,255,255,0.08)]" />

          {/* Calibration Pill with Accessible Tooltip */}
          <div className="text-right relative">
            <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
              Calibration
            </span>

            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setShowTooltip((prev) => !prev)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                aria-describedby="calibration-tooltip"
                aria-label="How Mindful estimates this calibration score"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.10)] transition-all cursor-pointer group"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#6ee7b7]" />
                <span className="font-mono text-xs text-[rgba(232,234,246,0.92)] font-semibold tracking-wide">
                  {isCold ? 'ESTABLISHING BASELINE' : `${confidencePct}% CALIBRATED`}
                </span>
                <Info className="w-3 h-3 text-[rgba(192,196,234,0.50)] group-hover:text-white transition-colors ml-0.5" />
              </button>

              {showTooltip && (
                <div
                  id="calibration-tooltip"
                  role="tooltip"
                  className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-[#121528] border border-[rgba(255,255,255,0.14)] shadow-2xl z-30 text-left"
                >
                  <div className="text-[11px] font-semibold text-[rgba(232,234,246,0.95)] mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#6ee7b7]" />
                    How Mindful estimates this
                  </div>
                  <p className="text-xs text-[rgba(192,196,234,0.80)] leading-relaxed">
                    Your current state combines recent supported signals and personal patterns. It is an estimate, not a diagnosis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. WHAT'S CHANGING & WHAT YOU'VE NOTICED ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WHAT'S CHANGING */}
        <div
          className="p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-lg"
          style={{
            background: 'rgba(13,15,26,0.55)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
                WHAT'S CHANGING
              </span>
              {hasTrendBadge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${trendBadgeStyle}`}>
                  {trendBadgeText}
                </span>
              )}
            </div>

            <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)] leading-snug">
              {whatsHappening.hasData ? whatsHappening.headline : 'Mindful is still learning your rhythm.'}
            </h3>

            <p className="text-xs text-[rgba(192,196,234,0.68)] leading-relaxed">
              {whatsHappening.hasData
                ? whatsHappening.detail
                : 'Not enough recent data to identify a meaningful trend. Regular check-ins build your baseline.'}
            </p>
          </div>

          {/* Micro-Waveform Visual */}
          <div className="pt-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${trendPulseColor} animate-pulse`} />
              <span className="text-[10px] text-[rgba(232,234,246,0.50)] font-medium">
                Recent trend
              </span>
            </div>

            {/* Smooth SVG mini curve */}
            <svg width="80" height="22" viewBox="0 0 80 22" className="overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="trendStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor={trendLineColor} stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d={trendSvgPath}
                fill="none"
                stroke="url(#trendStrokeGrad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="76" cy={trendCircleY} r="2.5" fill={trendLineColor} />
            </svg>
          </div>
        </div>

        {/* WHAT YOU'VE NOTICED */}
        <div
          className="p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-lg"
          style={{
            background: 'rgba(13,15,26,0.55)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[rgba(108,114,232,0.90)]">
                WHAT YOU'VE NOTICED
              </span>
            </div>

            <p className="text-xs text-[rgba(192,196,234,0.70)] leading-relaxed">
              Things you recently mentioned during check-ins.
            </p>

            {/* Contextual Chips */}
            {activeSignals.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeSignals.map((item) => (
                  <motion.span
                    key={item}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
                    className="px-3 py-1.5 rounded-xl text-xs bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.85)] font-medium transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    {item}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[rgba(192,196,234,0.50)] italic pt-1">
                No context tags recorded recently. Mentions of sensations and activities in your check-ins will appear here.
              </p>
            )}
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
            <span className="text-[10px] text-[rgba(232,234,246,0.50)] font-medium">
              From your recent check-ins
            </span>
            <button
              onClick={onExploreDetails}
              className="text-xs font-semibold text-[#6ee7b7] hover:text-white transition-colors flex items-center gap-1 cursor-pointer group"
            >
              View evidence <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
