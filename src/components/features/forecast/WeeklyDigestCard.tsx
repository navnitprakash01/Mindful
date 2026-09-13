/**
 * Weekly Digest Card
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 *
 * Exposes the structured weekly retrospective synthesis:
 * - Overview & narrative
 * - Longitudinal state trends & deltas
 * - Retrospective mood frequency distribution (zero mood forecasting)
 * - What Helped (EffectivenessEngine retrospective outcomes)
 * - Habit Continuity (HabitEngine consistency)
 * - Limitations notice
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyDigest } from '../../../server/engine/digest/types';
import { Badge } from '../../ui/Badge';
import {
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';

interface WeeklyDigestCardProps {
  digest: WeeklyDigest | null;
  isLoading?: boolean;
}

export const WeeklyDigestCard: React.FC<WeeklyDigestCardProps> = ({ digest, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl animate-pulse">
        <div className="h-6 w-44 rounded bg-white/10 mb-4" />
        <div className="h-20 w-full rounded bg-white/5" />
      </div>
    );
  }

  if (!digest) return null;

  const { retrospective } = digest;
  const { stateAverages, stateDeltasVsPriorWeek, dominantMoods, whatHelpedInterventions, habitContinuity } = retrospective;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
      {/* Digest Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white tracking-wide">
              Weekly Intelligence Digest
            </h3>
            <Badge variant="outline" size="sm">
              {digest.weekStartDate} to {digest.weekEndDate}
            </Badge>
            {digest.isAiEnhanced && (
              <Badge variant="info" size="sm" className="flex items-center gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" /> AI-Verbalized
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Longitudinal retrospective of your physiological patterns, helpful practices, and behavioral rituals.
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/5 text-xs text-slate-300 hover:text-white transition-all self-start sm:self-auto"
        >
          {isExpanded ? (
            <>
              Less Details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Explore Details <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Primary Narrative */}
      <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/20 p-4 mb-6 text-sm text-slate-200 leading-relaxed">
        <p>{retrospective.whatChangedNarrative}</p>
      </div>

      {/* Core Weekly Metrics Trio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold uppercase tracking-wider mb-1">
            <span>Energy Average</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stateAverages.energy}</span>
            {stateDeltasVsPriorWeek.energy !== 0 && (
              <span className={`text-xs font-medium ${stateDeltasVsPriorWeek.energy > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stateDeltasVsPriorWeek.energy > 0 ? '+' : ''}{stateDeltasVsPriorWeek.energy} pts
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold uppercase tracking-wider mb-1">
            <span>Stress Average</span>
            <Heart className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stateAverages.stress}</span>
            {stateDeltasVsPriorWeek.stress !== 0 && (
              <span className={`text-xs font-medium ${stateDeltasVsPriorWeek.stress < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stateDeltasVsPriorWeek.stress > 0 ? '+' : ''}{stateDeltasVsPriorWeek.stress} pts
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-teal-300 font-semibold uppercase tracking-wider mb-1">
            <span>Focus Average</span>
            <Layers className="h-4 w-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stateAverages.focus}</span>
            {stateDeltasVsPriorWeek.focus !== 0 && (
              <span className={`text-xs font-medium ${stateDeltasVsPriorWeek.focus > 0 ? 'text-emerald-400' : 'text-teal-400'}`}>
                {stateDeltasVsPriorWeek.focus > 0 ? '+' : ''}{stateDeltasVsPriorWeek.focus} pts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Sections (Progressive Disclosure) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 pt-2 border-t border-white/5"
          >
            {/* Retrospective Mood Distribution */}
            {dominantMoods.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Retrospective Mood Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dominantMoods.map((m) => (
                    <div key={m.mood} className="rounded-xl bg-slate-800/60 p-3 border border-white/5">
                      <div className="text-xs text-slate-300 font-medium">{m.mood}</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-white">{m.percentage}%</span>
                        <span className="text-[10px] text-slate-500">({m.frequency}x)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What Helped & Habit Continuity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* What Helped (EffectivenessEngine) */}
              <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  What Helped (Intervention Outcomes)
                </h4>
                {whatHelpedInterventions.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No completed intervention sessions recorded during this week.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {whatHelpedInterventions.map((int) => (
                      <div
                        key={int.interventionType}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/80 border border-white/5"
                      >
                        <div>
                          <div className="font-medium text-slate-200">{int.title}</div>
                          <div className="text-[10px] text-slate-400">
                            {int.sessionCount} completed session{int.sessionCount > 1 ? 's' : ''}
                          </div>
                        </div>
                        {int.averageRecoveryDelta !== 0 && (
                          <span className="text-emerald-400 font-semibold text-[11px]">
                            +{int.averageRecoveryDelta} pts recovery
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Habit Continuity (HabitEngine) */}
              <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-400" />
                  Habit Continuity (Ritual Tracking)
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Rituals Completed:</span>
                    <span className="font-bold text-white">
                      {habitContinuity.totalCompleted} / {habitContinuity.totalScheduled}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Consistency Score:</span>
                    <span className="font-bold text-teal-300">
                      {Math.round(habitContinuity.overallConsistencyScore * 100)}%
                    </span>
                  </div>

                  {habitContinuity.longestStreak > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Longest Active Streak:</span>
                      <span className="font-bold text-amber-300">
                        {habitContinuity.longestStreak} days
                      </span>
                    </div>
                  )}

                  {habitContinuity.restDaysRespected > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Rest Days Preserved:</span>
                      <span className="text-slate-300">
                        {habitContinuity.restDaysRespected} scheduled rest day(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Non-Clinical Limitations Notice */}
            <div className="rounded-xl bg-slate-800/30 p-3 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <span>{retrospective.limitationsNotice}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
