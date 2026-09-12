/**
 * Observatory Rhythm — Historical Movement Timeline
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Visually elegant 3D-depth timeline replacing the old technical trajectory chart.
 *
 * STRICT ZERO-FABRICATION PRINCIPLE:
 * - Plots ONLY real user observations.
 * - Missing days are represented as subtle dashed placeholder slots on the baseline,
 *   never filled with synthetic points or interpolated psychological estimates.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HistoricalRhythmData,
  HistoricalObservationPoint,
} from '../../../lib/observatoryHelpers';
import { DaySlot, moodConfig } from '../../../lib/emotionalRhythm';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Calendar, Tag, Wind, Activity, ChevronRight, Plus } from 'lucide-react';

interface ObservatoryRhythmProps {
  rhythm: HistoricalRhythmData;
  sevenDaySlots: DaySlot[];
  onOpenCheckIn?: () => void;
}

export const ObservatoryRhythm: React.FC<ObservatoryRhythmProps> = ({
  rhythm,
  sevenDaySlots,
  onOpenCheckIn,
}) => {
  const { points, isEmpty, recordedCount, averageEnergy, pathD } = rhythm;
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(() => {
    return points.length > 0 ? points[points.length - 1].index : null;
  });

  const selectedPoint = points.find((p) => p.index === selectedPointIndex) || null;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(108,114,232,0.85)]">
              Your Rhythm
            </span>
            <Badge variant="glass" size="sm" className="font-mono text-[10px]">
              {recordedCount} of 7 Days Recorded
            </Badge>
          </div>
          <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
            Recent Movement
          </h3>
          <p className="text-xs text-[rgba(192,196,234,0.55)]">
            How your vitality and emotional tone have transitioned over time
          </p>
        </div>

        {averageEnergy !== null && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[rgba(192,196,234,0.60)]">7-Day Energy Avg:</span>
            <span className="font-mono text-sm font-bold text-[#38bdf8]">
              {averageEnergy} / 10
            </span>
          </div>
        )}
      </div>

      {/* Main Rhythm Card with 3D-Depth Timeline */}
      <Card className="p-6 sm:p-8 bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] backdrop-blur-xl relative overflow-hidden">
        {isEmpty ? (
          /* Empty Timeline State */
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center mx-auto text-[#c0c4ea]">
              <Activity className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="font-display-lg text-base text-[rgba(232,234,246,0.90)]">
                No observations logged in the past 7 days
              </h4>
              <p className="text-xs text-[rgba(192,196,234,0.50)]">
                Check in your mood and energy to trace your personal wellness rhythm.
              </p>
            </div>
            {onOpenCheckIn && (
              <button
                onClick={onOpenCheckIn}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(108,114,232,0.18)] hover:bg-[rgba(108,114,232,0.28)] border border-[rgba(108,114,232,0.30)] text-xs font-medium text-white transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Log First Check-In
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* SVG Timeline Path Visualizer */}
            <div className="relative w-full h-48 sm:h-56">
              <svg
                viewBox="0 0 600 200"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="rhythmAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="rhythmLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#c0c4ea" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="110" x2="600" y2="110" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(255,255,255,0.08)" />

                {/* Smooth Waveform Stroke connecting ONLY real observations */}
                {pathD && (
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="url(#rhythmLineGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                )}

                {/* 7 Baseline Slot Markers (Showing missing days as empty markers, never fake data) */}
                {sevenDaySlots.map((slot, idx) => {
                  const x = Math.round((idx / Math.max(sevenDaySlots.length - 1, 1)) * 600);
                  const isRecorded = slot.primaryLog !== null;

                  return (
                    <g key={slot.dateKey}>
                      {/* Vertical grid guide */}
                      <line
                        x1={x}
                        y1={30}
                        x2={x}
                        y2={180}
                        stroke={isRecorded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)'}
                        strokeDasharray={isRecorded ? undefined : '2 4'}
                      />

                      {/* If day was not recorded, show a subtle dashed ring at baseline */}
                      {!isRecorded && (
                        <circle
                          cx={x}
                          cy={180}
                          r="4"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.15)"
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Real Observation Points */}
                {points.map((pt) => {
                  const isSelected = selectedPointIndex === pt.index;
                  const cfg = moodConfig[pt.moodType] || { color: '#6ee7b7' };

                  return (
                    <g
                      key={`pt-${pt.index}`}
                      onClick={() => setSelectedPointIndex(pt.index)}
                      className="cursor-pointer group"
                    >
                      {/* Outer pulse on selected point */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="14"
                          fill={cfg.color}
                          fillOpacity="0.25"
                        />
                      )}

                      {/* Main point circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? '7' : '5'}
                        fill={cfg.color}
                        stroke="#0d0f1a"
                        strokeWidth="2.5"
                        className="transition-all duration-200 group-hover:scale-125"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Day Labels along timeline */}
              <div className="flex justify-between text-xs text-[rgba(232,234,246,0.40)] font-mono mt-2 px-1">
                {sevenDaySlots.map((slot, idx) => {
                  const isRecorded = slot.primaryLog !== null;
                  const isSelected = selectedPointIndex === idx;

                  return (
                    <button
                      key={slot.dateKey}
                      onClick={() => isRecorded && setSelectedPointIndex(idx)}
                      disabled={!isRecorded}
                      className={`text-center py-1 rounded transition-colors ${
                        isSelected
                          ? 'text-white font-bold'
                          : isRecorded
                          ? 'hover:text-[rgba(232,234,246,0.85)] cursor-pointer'
                          : 'opacity-30 cursor-default'
                      }`}
                    >
                      <span>{slot.dayLabel}</span>
                      {slot.isToday && (
                        <span className="block text-[9px] text-[#6ee7b7] font-semibold">Today</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Observation Inspection Drawer */}
            <AnimatePresence mode="wait">
              {selectedPoint && (
                <motion.div
                  key={selectedPoint.index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[rgba(108,114,232,0.85)]" />
                      <span className="text-xs font-semibold text-white">
                        {selectedPoint.fullDateLabel}
                      </span>
                      {selectedPoint.isToday && <Badge variant="primary" size="sm">Today</Badge>}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      {/* Mood Pill */}
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: moodConfig[selectedPoint.moodType]?.bg || 'rgba(110,231,183,0.15)',
                          color: moodConfig[selectedPoint.moodType]?.color || '#6ee7b7',
                        }}
                      >
                        {moodConfig[selectedPoint.moodType]?.emoji} {selectedPoint.moodType}
                      </span>

                      {/* Energy Badge */}
                      <span className="font-mono text-xs text-[rgba(232,234,246,0.85)]">
                        Energy: <strong className="text-[#38bdf8]">{selectedPoint.energyLevel}</strong> / 10
                      </span>
                    </div>

                    {selectedPoint.notes && (
                      <p className="text-xs text-[rgba(192,196,234,0.70)] italic pt-1 line-clamp-2">
                        "{selectedPoint.notes}"
                      </p>
                    )}
                  </div>

                  {/* Triggers and Sensations Tags */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 w-full md:w-auto">
                    {selectedPoint.triggers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="w-3 h-3 text-[rgba(232,234,246,0.40)] shrink-0" />
                        {selectedPoint.triggers.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-[rgba(255,255,255,0.05)] text-[rgba(232,234,246,0.75)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedPoint.physicalSensations.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Wind className="w-3 h-3 text-[rgba(232,234,246,0.40)] shrink-0" />
                        {selectedPoint.physicalSensations.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md text-[10px] bg-[rgba(255,255,255,0.05)] text-[rgba(232,234,246,0.75)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
};
