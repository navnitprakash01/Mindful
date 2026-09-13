/**
 * Forecast Trajectory Card
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Implements forward trajectory visualization for 24h, 3d, and 7d horizons.
 * Strictly distinguishes:
 * - OBSERVED current state vs FORECAST projected trajectory
 * - Clearly labeled EMPIRICAL UNCERTAINTY RANGE
 * - Non-clinical, non-diagnostic framing
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ForecastDimension,
  ForecastHorizon,
  ForecastResult,
  ConfidenceTier,
} from '../../../server/engine/forecastEngine/types';
import { Badge } from '../../ui/Badge';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ForecastTrajectoryCardProps {
  forecast: ForecastResult | null;
  isLoading?: boolean;
}

const DIMENSION_CONFIG: Record<
  ForecastDimension,
  { label: string; color: string; bgColor: string; borderColor: string; higherIsPositive: boolean }
> = {
  energy: {
    label: 'Vitality & Energy',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    higherIsPositive: true,
  },
  stress: {
    label: 'Autonomic Stress Load',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    higherIsPositive: false,
  },
  focus: {
    label: 'Cognitive Focus',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    higherIsPositive: true,
  },
};

function getConfidenceBadgeVariant(tier: ConfidenceTier): 'success' | 'info' | 'warning' | 'default' {
  switch (tier) {
    case 'high':
      return 'success';
    case 'moderate':
      return 'info';
    case 'low':
      return 'warning';
    case 'insufficient':
    default:
      return 'default';
  }
}

export const ForecastTrajectoryCard: React.FC<ForecastTrajectoryCardProps> = ({
  forecast,
  isLoading,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('24h');

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl animate-pulse">
        <div className="h-6 w-48 rounded bg-white/10 mb-4" />
        <div className="h-24 w-full rounded bg-white/5" />
      </div>
    );
  }

  if (!forecast) return null;

  const horizonData = forecast.horizons[selectedHorizon];
  const isAvailable = horizonData && horizonData.status === 'available';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
      {/* Header & Horizon Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white tracking-wide">
              Forward Wellness Trajectory
            </h3>
            <Badge variant="outline" size="sm" className="text-[10px] tracking-wider uppercase">
              DES-BR Model
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical projections anchored to your baseline set-point. Not a medical diagnosis.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-white/5">
          {(['24h', '3d', '7d'] as ForecastHorizon[]).map((horizon) => (
            <button
              key={horizon}
              onClick={() => setSelectedHorizon(horizon)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedHorizon === horizon
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {horizon.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon Content */}
      {!isAvailable ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <Clock className="h-8 w-8 text-amber-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-medium text-amber-300">
            Awaiting Sufficient Observational Evidence
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {horizonData?.evidenceGateReason ||
              `The ${selectedHorizon} horizon requires additional longitudinal observations before modeling forward trajectories.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status & Confidence Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Engineering Confidence:</span>
              <Badge variant={getConfidenceBadgeVariant(horizonData.confidenceTier)} size="sm">
                {horizonData.confidenceTier.toUpperCase()} ({Math.round(horizonData.confidenceScore * 100)}%)
              </Badge>
              {forecast.evidence.activeSensorModalities.length >= 2 && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Multi-modal ({forecast.evidence.activeSensorModalities.length} signals)
                </span>
              )}
            </div>

            <span className="text-slate-500 text-[11px]">
              {forecast.evidence.cleanSnapshotsCount} clean snapshots across {forecast.evidence.distinctCalendarDays} distinct days
            </span>
          </div>

          {/* Dimension Trajectory Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['energy', 'stress', 'focus'] as ForecastDimension[]).map((dim) => {
              const traj = horizonData.dimensions[dim];
              const config = DIMENSION_CONFIG[dim];
              if (!traj) return null;

              const isFavorable = traj.trendDirection === 'improving';
              const isDeclining = traj.trendDirection === 'declining';

              return (
                <motion.div
                  key={dim}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 transition-all ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="flex items-center gap-1 text-xs">
                      {isFavorable ? (
                        <span className="text-emerald-400 flex items-center text-[11px]">
                          <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> Improving
                        </span>
                      ) : isDeclining ? (
                        <span className="text-amber-400 flex items-center text-[11px]">
                          <TrendingDown className="h-3.5 w-3.5 mr-0.5" /> Shift
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center text-[11px]">
                          <Minus className="h-3.5 w-3.5 mr-0.5" /> Steady
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Observed vs Forecast Comparison */}
                  <div className="flex items-baseline justify-between border-b border-white/5 pb-3 mb-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Observed
                      </div>
                      <div className="text-xl font-bold text-white">
                        {traj.currentValue}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        Forecast (+{selectedHorizon})
                      </div>
                      <div className="text-xl font-bold text-indigo-200">
                        {traj.projectedValue}
                      </div>
                    </div>
                  </div>

                  {/* Empirical Uncertainty Range */}
                  <div className="text-[11px] text-slate-300">
                    <div className="text-[10px] font-medium text-slate-400">
                      Empirical Uncertainty Range:
                    </div>
                    <div className="font-mono text-xs text-slate-200 font-semibold mt-0.5">
                      [{traj.uncertaintyRange[0]} — {traj.uncertaintyRange[1]}]
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Rationale & Transparency Notice */}
          <div className="rounded-xl bg-slate-800/40 p-3.5 border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-slate-200">{horizonData.summaryRationale}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Notice: Uncertainty ranges widen across extended horizons to reflect biological variance. Projections automatically mean-revert toward your baseline set-point.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
