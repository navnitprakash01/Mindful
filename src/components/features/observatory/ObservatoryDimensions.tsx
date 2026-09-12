/**
 * Observatory Dimensions — Compact 6-Dimension Overview
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Replaces the former six large horizontal percentage bars with a refined, compact
 * 6-dimension interactive grid. Clicking any dimension highlights it in the 3D Constellation.
 */

import React from 'react';
import { motion } from 'motion/react';
import { DimensionMetricSummary } from '../../../lib/observatoryHelpers';
import { StateDimensionKey } from '../../../types';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { ChevronRight } from 'lucide-react';

interface ObservatoryDimensionsProps {
  dimensions: DimensionMetricSummary[];
  selectedDimension: StateDimensionKey | null;
  onSelectDimension: (key: StateDimensionKey | null) => void;
}

export const ObservatoryDimensions: React.FC<ObservatoryDimensionsProps> = ({
  dimensions,
  selectedDimension,
  onSelectDimension,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(108,114,232,0.85)]">
              State Dimensions
            </span>
            <Badge variant="glass" size="sm" className="font-mono text-[10px]">
              6 Dimensional Fusion
            </Badge>
          </div>
          <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)]">
            Core Metrics
          </h4>
        </div>
        <span className="text-xs text-[rgba(192,196,234,0.45)]">
          Click to inspect spatial node
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {dimensions.map((dim) => {
          const isSelected = selectedDimension === dim.key;

          return (
            <button
              key={dim.key}
              onClick={() => onSelectDimension(isSelected ? null : dim.key)}
              className={`p-3.5 rounded-2xl text-left border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isSelected
                  ? 'bg-[rgba(108,114,232,0.18)] border-[rgba(108,114,232,0.40)] shadow-lg'
                  : 'bg-[rgba(13,15,26,0.50)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-xs font-semibold"
                  style={{ color: dim.color }}
                >
                  {dim.label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: dim.color }} />
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                  {dim.isKnown ? dim.value : '—'}
                </span>
                <span className="text-[10px] text-[rgba(232,234,246,0.35)] font-mono">/100</span>
              </div>

              <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between text-[10px] text-[rgba(232,234,246,0.45)] font-mono">
                <span>{dim.isKnown ? `${dim.confidencePct}% conf.` : 'Baseline'}</span>
                <span className="capitalize text-[#6ee7b7]">{dim.trend}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
