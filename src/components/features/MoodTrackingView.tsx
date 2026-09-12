import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  HeartHandshake,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Plus,
  Activity,
  Calendar,
  Compass,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MoodLog } from '../../types';
import { usePersonalState } from '../../context/StateContext';
import { MoodCheckInModal } from './MoodCheckInModal';

import {
  moodConfig,
  ALL_MOOD_TYPES,
  DaySlot,
  calculateSevenDaySlots,
  calculateTrendInsight,
} from '../../lib/emotionalRhythm';

function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const MoodTrackingView: React.FC = () => {
  const { moodLogs, addMoodLog } = useApp();
  const { recalculateState, refreshState } = usePersonalState();

  // Right-panel form state
  const [energyLevel, setEnergyLevel] = useState(7);
  const [selectedMood, setSelectedMood] = useState<MoodLog['moodType']>('Calm');
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Left-panel interactive state
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [userSelectedKey, setUserSelectedKey] = useState<string | null>(null);

  const triggersList = [
    'Morning Routine', 'Creative Work', 'Nature', 'Exercise',
    'Meditation', 'Coffee/Tea', 'Social Interaction', 'Deadlines',
  ];
  const sensationsList = [
    'Deep breathing', 'Relaxed shoulders', 'Lightness in chest',
    'Warmth', 'Tightness in neck', 'Shallow breathing',
  ];

  const handleToggle = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmitMood = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setSubmitError(null);
      setSubmitSuccess(false);

      if (energyLevel < 1 || energyLevel > 10) {
        setSubmitError('Energy level must be between 1 and 10.');
        return;
      }

      setIsSubmitting(true);

      const result = await addMoodLog(
        {
          energyLevel,
          moodType: selectedMood,
          notes: notes.trim(),
          triggers: selectedTriggers,
          physicalSensations: selectedSensations,
        },
        async () => {
          try {
            await recalculateState();
            await refreshState();
          } catch {
            // State refresh failure is non-critical
          }
        }
      );

      setIsSubmitting(false);

      if (!result.ok) {
        setSubmitError(result.error ?? 'Failed to save. Please try again.');
        return;
      }

      setSubmitSuccess(true);
      setNotes('');
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    [
      isSubmitting,
      energyLevel,
      selectedMood,
      notes,
      selectedTriggers,
      selectedSensations,
      addMoodLog,
      recalculateState,
      refreshState,
    ]
  );

  // ── 7-Day Window Calculation (No Fabricated Data) ───────────────────────────

  const sevenDaySlots = useMemo(() => calculateSevenDaySlots(moodLogs), [moodLogs]);

  const todaySlot = useMemo(
    () => sevenDaySlots.find((s) => s.isToday) ?? sevenDaySlots[sevenDaySlots.length - 1],
    [sevenDaySlots]
  );

  // Active selected day slot: explicit user selection, or today if logged, or latest available
  const activeSlot = useMemo(() => {
    if (userSelectedKey) {
      const found = sevenDaySlots.find((s) => s.dateKey === userSelectedKey);
      if (found) return found;
    }
    if (todaySlot.primaryLog) return todaySlot;
    const latestLogged = [...sevenDaySlots].reverse().find((s) => s.primaryLog !== null);
    return latestLogged ?? todaySlot;
  }, [sevenDaySlots, userSelectedKey, todaySlot]);

  // ── Real Trend Insights (Strictly Factual) ──────────────────────────────────

  const trendInsight = useMemo(() => calculateTrendInsight(sevenDaySlots), [sevenDaySlots]);

  // ── SVG Coordinates for 7 Days ──────────────────────────────────────────────

  const chartWidth = 560;
  const chartHeight = 180;
  const padLeft = 40;
  const padRight = 36;
  const padTop = 26;
  const padBottom = 34;
  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const dayPoints = useMemo(() => {
    return sevenDaySlots.map((slot, index) => {
      const x = padLeft + (index / 6) * innerWidth;
      let y: number | null = null;
      if (slot.primaryLog) {
        // Clamp energy to 1-10
        const clampedEnergy = Math.max(1, Math.min(10, slot.primaryLog.energyLevel));
        y = padTop + ((10 - clampedEnergy) / 9) * innerHeight;
      }
      return {
        ...slot,
        index,
        x,
        y,
      };
    });
  }, [sevenDaySlots, innerWidth, innerHeight]);

  // Connecting lines: ONLY render between adjacent consecutive observed days
  const lineSegments = useMemo(() => {
    const segments: { x1: number; y1: number; x2: number; y2: number; color1: string; color2: string }[] = [];
    for (let i = 0; i < dayPoints.length - 1; i++) {
      const p1 = dayPoints[i];
      const p2 = dayPoints[i + 1];
      if (p1.y !== null && p2.y !== null && p1.primaryLog && p2.primaryLog) {
        segments.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          color1: moodConfig[p1.primaryLog.moodType]?.color ?? '#6c72e8',
          color2: moodConfig[p2.primaryLog.moodType]?.color ?? '#6c72e8',
        });
      }
    }
    return segments;
  }, [dayPoints]);

  const hasAnyMoodLogs = moodLogs.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-10">
      {/* Quick Check-in Modal */}
      <MoodCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge variant="lavender" className="mb-3">
          Emotional Topography
        </Badge>
        <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)]">
          Volumetric Landscape of Self
        </h1>
        <p className="text-sm text-[rgba(232,234,246,0.40)] font-body-md mt-2 max-w-xl leading-relaxed">
          A continuous synthesis of your inner state across energy levels and emotional frequencies.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* ── LEFT PANEL: YOUR EMOTIONAL RHYTHM ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <Card className="flex flex-col min-h-[540px]">
            {/* Panel Header */}
            <div className="flex justify-between items-start mb-6 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(108,114,232,0.85)] block mb-1">
                  Your Emotional Rhythm
                </span>
                <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                  7-Day State Movement
                </h3>
                <p className="text-xs text-[rgba(232,234,246,0.40)] mt-0.5">
                  How your state has moved over the last 7 days
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsCheckInModalOpen(true)}
                className="flex-shrink-0"
              >
                Log Mood
              </Button>
            </div>

            {/* ── Visual Content ── */}
            {!hasAnyMoodLogs ? (
              /* Cold-Start Empty State */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center text-[#c0c4ea]">
                  <Activity className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">
                    Your rhythm is still taking shape
                  </h4>
                  <p className="text-xs text-[rgba(232,234,246,0.45)] leading-relaxed">
                    Log a few check-ins and Mindful will begin showing how your state changes over time.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsCheckInModalOpen(true)}
                >
                  Begin Check-in
                </Button>
              </div>
            ) : (
              /* Data-driven Visualization */
              <div className="space-y-6">
                {/* SVG Timeline Canvas */}
                <div className="relative w-full rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-2 sm:p-4 overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto max-h-[220px] select-none"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="7-Day Emotional Rhythm Chart"
                  >
                    <defs>
                      <linearGradient id="rhythmLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0.7" />
                      </linearGradient>
                      <radialGradient id="todayGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6c72e8" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Horizontal Energy Grid Lines */}
                    {[10, 7, 4, 1].map((level) => {
                      const y = padTop + ((10 - level) / 9) * innerHeight;
                      return (
                        <g key={level} className="text-[9px] font-mono fill-[rgba(232,234,246,0.22)]">
                          <text x={padLeft - 8} y={y + 3} textAnchor="end">
                            {level}
                          </text>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={chartWidth - padRight}
                            y2={y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeDasharray={level === 1 || level === 10 ? 'none' : '3 3'}
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}

                    {/* Connecting Solid Lines between Adjacent Recorded Days */}
                    {lineSegments.map((seg, idx) => (
                      <line
                        key={idx}
                        x1={seg.x1}
                        y1={seg.y1}
                        x2={seg.x2}
                        y2={seg.y2}
                        stroke="url(#rhythmLineGrad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    ))}

                    {/* Day Nodes */}
                    {dayPoints.map((point) => {
                      const hasData = point.y !== null && point.primaryLog !== null;
                      const isSelected = activeSlot.dateKey === point.dateKey;
                      const cfg = hasData
                        ? moodConfig[point.primaryLog!.moodType] ?? moodConfig['Calm']
                        : null;

                      return (
                        <g
                          key={point.dateKey}
                          tabIndex={0}
                          role="button"
                          aria-label={`${point.fullDateLabel}: ${
                            hasData
                              ? `${point.primaryLog!.moodType}, energy ${point.primaryLog!.energyLevel} of 10`
                              : 'No check-in recorded'
                          }`}
                          onClick={() => setUserSelectedKey(point.dateKey)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setUserSelectedKey(point.dateKey);
                            }
                          }}
                          className="cursor-pointer focus:outline-none group"
                        >
                          {/* X-axis day label */}
                          <text
                            x={point.x}
                            y={chartHeight - 12}
                            textAnchor="middle"
                            className={`text-[10px] font-medium transition-colors ${
                              isSelected
                                ? 'fill-[rgba(232,234,246,0.95)] font-semibold'
                                : point.isToday
                                ? 'fill-[rgba(108,114,232,0.90)] font-semibold'
                                : 'fill-[rgba(232,234,246,0.35)] group-hover:fill-[rgba(232,234,246,0.70)]'
                            }`}
                          >
                            {point.dayLabel}
                          </text>

                          {/* Today Dot Indicator under label */}
                          {point.isToday && (
                            <circle
                              cx={point.x}
                              cy={chartHeight - 4}
                              r="2"
                              fill="#6c72e8"
                            />
                          )}

                          {hasData ? (
                            /* Observed Day Node */
                            <g className="transition-transform duration-200">
                              {/* Today pulse aura */}
                              {point.isToday && (
                                <circle
                                  cx={point.x}
                                  cy={point.y!}
                                  r="16"
                                  fill="url(#todayGlow)"
                                  className="animate-pulse"
                                />
                              )}

                              {/* Selection Highlight Ring */}
                              {isSelected && (
                                <circle
                                  cx={point.x}
                                  cy={point.y!}
                                  r="13"
                                  fill="none"
                                  stroke={cfg!.color}
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />
                              )}

                              {/* Outer solid pill */}
                              <circle
                                cx={point.x}
                                cy={point.y!}
                                r={isSelected ? '9' : '7.5'}
                                fill="#0f1229"
                                stroke={cfg!.color}
                                strokeWidth="2.5"
                                className="transition-all duration-200 group-hover:scale-110"
                              />

                              {/* Inner center dot */}
                              <circle
                                cx={point.x}
                                cy={point.y!}
                                r="3"
                                fill={cfg!.color}
                              />
                            </g>
                          ) : (
                            /* Empty Day Marker (Dashed hollow ring at midline) */
                            <g>
                              {isSelected && (
                                <circle
                                  cx={point.x}
                                  cy={padTop + 0.5 * innerHeight}
                                  r="10"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.2)"
                                  strokeWidth="1"
                                />
                              )}
                              <circle
                                cx={point.x}
                                cy={padTop + 0.5 * innerHeight}
                                r="5"
                                fill="none"
                                stroke="rgba(255,255,255,0.12)"
                                strokeDasharray="2.5 2.5"
                                strokeWidth="1.2"
                                className="group-hover:stroke-[rgba(255,255,255,0.28)] transition-colors"
                              />
                            </g>
                          )}

                          {/* Invisible larger hit-area for touch and clicking */}
                          <rect
                            x={point.x - 22}
                            y={padTop}
                            width="44"
                            height={innerHeight}
                            fill="transparent"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* ── TODAY Quick Status Bar ── */}
                <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[rgba(108,114,232,0.15)] text-[#c0c4ea] border border-[rgba(108,114,232,0.25)] flex-shrink-0">
                      Today
                    </span>
                    {todaySlot.primaryLog ? (
                      <div className="flex items-center gap-2 truncate text-xs">
                        <span className="font-semibold text-[rgba(232,234,246,0.90)]">
                          {moodConfig[todaySlot.primaryLog.moodType]?.emoji}{' '}
                          {todaySlot.primaryLog.moodType}
                        </span>
                        <span className="text-[rgba(232,234,246,0.30)]">·</span>
                        <span className="font-mono text-[#c0c4ea]">
                          {todaySlot.primaryLog.energyLevel}/10 energy
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[rgba(232,234,246,0.45)]">
                        No check-in yet
                      </span>
                    )}
                  </div>

                  {!todaySlot.primaryLog && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus className="w-3 h-3" />}
                      onClick={() => setIsCheckInModalOpen(true)}
                    >
                      Log Mood
                    </Button>
                  )}
                </div>

                {/* ── Day Detail Inspection Card ── */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlot.dateKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[rgba(108,114,232,0.70)]" />
                        <span className="text-xs font-semibold text-[rgba(232,234,246,0.85)]">
                          {activeSlot.fullDateLabel}
                        </span>
                        {activeSlot.isToday && (
                          <Badge variant="lavender" size="sm">
                            Today
                          </Badge>
                        )}
                      </div>

                      {activeSlot.primaryLog && (
                        <span className="text-[10px] text-[rgba(232,234,246,0.35)] font-mono">
                          {formatRelativeTime(activeSlot.primaryLog.timestamp)}
                        </span>
                      )}
                    </div>

                    {activeSlot.primaryLog ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Mood Badge */}
                          <div
                            className="px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5"
                            style={{
                              background: moodConfig[activeSlot.primaryLog.moodType]?.bg,
                              borderColor: `${moodConfig[activeSlot.primaryLog.moodType]?.color}40`,
                              color: moodConfig[activeSlot.primaryLog.moodType]?.color,
                            }}
                          >
                            <span>{moodConfig[activeSlot.primaryLog.moodType]?.emoji}</span>
                            <span>{activeSlot.primaryLog.moodType}</span>
                          </div>

                          {/* Energy level */}
                          <div className="px-2.5 py-1 rounded-full text-xs font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.75)]">
                            Energy {activeSlot.primaryLog.energyLevel}/10
                          </div>

                          {/* Triggers */}
                          {activeSlot.primaryLog.triggers.map((trig) => (
                            <span
                              key={trig}
                              className="text-[11px] px-2.5 py-0.5 rounded-full bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.22)] text-[#c0c4ea]"
                            >
                              {trig}
                            </span>
                          ))}
                        </div>

                        {/* Note quote */}
                        {activeSlot.primaryLog.notes && (
                          <blockquote className="text-xs text-[rgba(232,234,246,0.60)] italic leading-relaxed border-l-2 border-[rgba(108,114,232,0.40)] pl-3 py-0.5">
                            "{activeSlot.primaryLog.notes}"
                          </blockquote>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-1 text-xs text-[rgba(232,234,246,0.40)]">
                        <span>No check-in recorded for this day.</span>
                        {activeSlot.isToday && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCheckInModalOpen(true)}
                          >
                            Check in now
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* ── This Week Insight Area (Factual) ── */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[rgba(108,114,232,0.08)] via-[rgba(13,15,26,0.50)] to-[rgba(52,211,153,0.06)] border border-[rgba(108,114,232,0.18)] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(108,114,232,0.15)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {trendInsight.hasEnoughData ? (
                      <TrendingUp className="w-4 h-4 text-[#c0c4ea]" />
                    ) : (
                      <Compass className="w-4 h-4 text-[rgba(108,114,232,0.70)]" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[rgba(108,114,232,0.75)] block">
                      This Week
                    </span>
                    <p className="text-xs font-semibold text-[rgba(232,234,246,0.90)]">
                      {trendInsight.title}
                    </p>
                    <p className="text-[11px] text-[rgba(232,234,246,0.45)] leading-relaxed">
                      {trendInsight.description}
                    </p>
                  </div>
                </div>

                {/* ── Compact Recent Entries Section ── */}
                <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(232,234,246,0.40)]">
                      Recent Check-ins
                    </h4>
                    <span className="text-[10px] text-[rgba(232,234,246,0.30)] font-mono">
                      {moodLogs.length} total
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {moodLogs.slice(0, 4).map((m) => {
                      const cfg = moodConfig[m.moodType] || moodConfig['Calm'];
                      const isItemActive =
                        activeSlot.primaryLog?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            try {
                              const d = new Date(m.timestamp);
                              const k = `${d.getFullYear()}-${String(
                                d.getMonth() + 1
                              ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                              setUserSelectedKey(k);
                            } catch {}
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const d = new Date(m.timestamp);
                              const k = `${d.getFullYear()}-${String(
                                d.getMonth() + 1
                              ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                              setUserSelectedKey(k);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isItemActive
                              ? 'border-[rgba(108,114,232,0.50)] shadow-[0_0_12px_rgba(108,114,232,0.20)]'
                              : 'hover:border-[rgba(255,255,255,0.15)]'
                          }`}
                          style={{
                            background: cfg.bg,
                            borderColor: isItemActive ? undefined : `${cfg.color}30`,
                          }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold" style={{ color: cfg.color }}>
                              {cfg.emoji} {m.moodType}
                            </span>
                            <span className="text-[rgba(232,234,246,0.40)] font-mono text-[10px]">
                              {formatRelativeTime(m.timestamp)} · E:{m.energyLevel}/10
                            </span>
                          </div>
                          <p className="text-[rgba(232,234,246,0.55)] line-clamp-1">
                            {m.notes || (m.triggers.length > 0 ? m.triggers.join(', ') : 'No notes')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── RIGHT PANEL: LOG FORM ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[rgba(232,121,154,0.15)] border border-[rgba(232,121,154,0.25)] flex items-center justify-center">
                <HeartHandshake className="w-4.5 h-4.5 text-[#f4a8c0]" />
              </div>
              <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
                Log Current State
              </h3>
            </div>

            <form onSubmit={handleSubmitMood} className="space-y-6">
              {/* Energy Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-3">
                  <span className="uppercase tracking-wider text-[rgba(232,234,246,0.40)]">
                    Energy Level
                  </span>
                  <span className="text-[#c0c4ea] font-mono text-sm">
                    {energyLevel} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: '#6c72e8' }}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between text-[10px] text-[rgba(232,234,246,0.25)] mt-1 font-mono">
                  <span>Depleted</span>
                  <span>Vibrant</span>
                </div>
              </div>

              {/* Mood Selector */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-3">
                  Primary Emotion
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_MOOD_TYPES.map((type) => {
                    const cfg = moodConfig[type];
                    const isSelected = selectedMood === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setSelectedMood(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 disabled:opacity-40 ${
                          isSelected ? 'scale-105' : 'opacity-60 hover:opacity-90'
                        }`}
                        style={
                          isSelected
                            ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }
                            : {
                                background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(232,234,246,0.55)',
                                borderColor: 'rgba(255,255,255,0.08)',
                              }
                        }
                      >
                        {cfg.emoji} {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Triggers */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-3">
                  Influencing Triggers
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {triggersList.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleToggle(selectedTriggers, setSelectedTriggers, t)}
                      className={`text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border disabled:opacity-40 ${
                        selectedTriggers.includes(t)
                          ? 'bg-[rgba(108,114,232,0.20)] text-[#c0c4ea] border-[rgba(108,114,232,0.35)]'
                          : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.45)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensations */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-3">
                  Somatic Sensations
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {sensationsList.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleToggle(selectedSensations, setSelectedSensations, s)}
                      className={`text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border disabled:opacity-40 ${
                        selectedSensations.includes(s)
                          ? 'bg-[rgba(232,121,154,0.18)] text-[#f4a8c0] border-[rgba(232,121,154,0.30)]'
                          : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.45)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-2">
                  Context Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What brought about this feeling?"
                  disabled={isSubmitting}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-3.5 text-xs text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[rgba(108,114,232,0.40)] h-20 resize-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Error / Success feedback */}
              {submitError && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[rgba(242,139,130,0.10)] border border-[rgba(242,139,130,0.25)]">
                  <AlertCircle className="w-4 h-4 text-[#f28b82] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#f28b82] leading-relaxed">{submitError}</p>
                </div>
              )}
              {submitSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.25)]">
                  <span className="text-[#34d399] text-sm">✓</span>
                  <p className="text-xs text-[#34d399]">Snapshot recorded — state updating…</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Record Emotional Snapshot'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
