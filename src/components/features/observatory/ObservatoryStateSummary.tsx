/**
 * Observatory State Summary
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Compact, calm current-state summary positioned directly beneath the 3D constellation.
 * Focuses on qualitative state title, primary dimensions, and calibrated confidence.
 */

import React from 'react';
import { CurrentStateSummary } from '../../../lib/observatoryHelpers';
import { Badge } from '../../ui/Badge';
import { Activity, ShieldCheck } from 'lucide-react';

interface ObservatoryStateSummaryProps {
  summary: CurrentStateSummary;
}

export const ObservatoryStateSummary: React.FC<ObservatoryStateSummaryProps> = ({ summary }) => {
  const {
    title,
    description,
    primaryDimensions,
    confidencePct,
    confidenceLabel,
    isCold,
  } = summary;

  return (
    <div className="p-6 rounded-2xl bg-[rgba(13,15,26,0.60)] border border-[rgba(255,255,255,0.07)] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      {/* State Title & Qualitative Description */}
      <div className="space-y-1 max-w-md">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(108,114,232,0.85)]">
            Your Current State
          </span>
          {isCold && <Badge variant="neutral" size="sm">Baseline</Badge>}
        </div>
        <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)] tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-[rgba(192,196,234,0.60)] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Primary 3 Dimensions & Confidence Block */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
        {/* Dimensions Chips */}
        <div className="flex items-center gap-4">
          {primaryDimensions.map((dim) => (
            <div key={dim.key} className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block">
                {dim.label}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                  {isCold ? '—' : dim.value}
                </span>
                <span className="text-[10px] text-[rgba(232,234,246,0.30)] font-mono">/100</span>
              </div>
            </div>
          ))}
        </div>

        {/* Vertical Divider */}
        <div className="hidden sm:block w-px h-10 bg-[rgba(255,255,255,0.08)]" />

        {/* Calibrated Confidence Badge */}
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
  );
};
