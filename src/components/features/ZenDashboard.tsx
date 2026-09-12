import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  Flame,
  Activity,
  TrendingUp,
  Star,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PageTransition } from '../ui/PageTransition';
import { EmptyState } from '../ui/EmptyState';
import { MoodCheckInModal } from './MoodCheckInModal';
import { PatternInsightsCard } from './PatternInsightsCard';
import { InterventionRecommendationCard } from './intervention/InterventionRecommendationCard';
import {
  staggerContainer,
  staggerChild,
  staggerChildFast,
  scaleIn,
  indexedFadeUp,
} from '../../lib/motion';

// ─────────────────────────────────────────────────────────────
// WEEKLY MOOD SPARKLINE
// ─────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

const MoodSparkline: React.FC<SparklineProps> = ({
  data,
  color = '#6c72e8',
  height = 48,
}) => {
  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const h = height;
  const padX = 4;
  const points = data.map((v, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (w - padX * 2);
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  // Area fill
  const areaPoints = `${padX},${h} ${polyline} ${w - padX},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Area */}
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point dot */}
      {data.length > 0 && (
        <circle
          cx={points[points.length - 1]?.split(',')[0]}
          cy={points[points.length - 1]?.split(',')[1]}
          r="3"
          fill={color}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// HABIT ROW (compact)
// ─────────────────────────────────────────────────────────────

interface HabitRowProps {
  habit: { id: string; title: string; streak: number; completedDates: string[] };
  todayStr: string;
  onToggle: (id: string, date: string) => void;
}

const HabitRow: React.FC<HabitRowProps> = ({ habit, todayStr, onToggle }) => {
  const isCompleted = habit.completedDates.includes(todayStr);
  return (
    <motion.div
      variants={staggerChildFast}
      onClick={() => onToggle(habit.id, todayStr)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors duration-200 ${
        isCompleted
          ? 'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.22)]'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.22)] hover:bg-[rgba(108,114,232,0.04)]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border transition-all ${
            isCompleted
              ? 'bg-[#34d399] border-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.50)]'
              : 'border-[rgba(255,255,255,0.18)]'
          }`}
        >
          {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[rgba(232,234,246,0.80)] truncate">{habit.title}</p>
          <span className="text-[10px] text-[rgba(232,234,246,0.35)]">🔥 {habit.streak} day streak</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────

export const ZenDashboard: React.FC = () => {
  const {
    userProfile,
    setCurrentView,
    habits,
    toggleHabitCompletion,
    journalEntries,
    moodLogs,
    personalState,
    isStateLoading,
  } = useApp();

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = userProfile?.name?.trim()?.split(' ')[0] || 'Friend';
  const latestMood = moodLogs[0];
  const totalHabitsToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const habitCompletion = habits.length
    ? Math.round((totalHabitsToday / habits.length) * 100)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  /**
   * Cold-start detection:
   * overallConfidence = 0 means the engine has no real signal evidence yet.
   * We refuse to display invented dimension values in that state.
   */
  const hasRealEvidence =
    (personalState?.overallConfidence ?? 0) >= 0.10 &&
    (personalState?.activeSignalsCount ?? 0) > 0;

  // Last 7 days mood sparkline data
  const weeklyMoodData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return days.map((day) => {
      const logsForDay = moodLogs.filter(
        (l) => new Date(l.timestamp).toISOString().split('T')[0] === day
      );
      if (!logsForDay.length) return 0;
      return logsForDay.reduce((sum, l) => sum + l.energyLevel, 0) / logsForDay.length;
    });
  }, [moodLogs]);

  const dayLabels = useMemo(() => {
    const day3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return day3[d.getDay()];
    });
  }, []);

  // AI insight from latest journal
  const aiInsight =
    journalEntries[0]?.aiSummary ||
    journalEntries[0]?.aiAnalysis ||
    'Start journaling to receive personalized AI insights about your emotional patterns.';

  const hasWeeklyData = weeklyMoodData.some((v) => v > 0);

  return (
    <PageTransition transitionKey="dashboard">
      {/* Quick Check-in Modal */}
      <MoodCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-28 pb-36">

        {/* ── HERO PRESENCE ── */}
        <section className="flex flex-col items-center justify-center mb-14 text-center">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="relative mb-7"
          >
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full animate-pulse-ring" />
            {/* Orb container */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(108,114,232,0.35) 0%, rgba(232,121,154,0.20) 50%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
              <div className="absolute inset-3 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] shadow-[inset_0_0_40px_rgba(108,114,232,0.15)] flex items-center justify-center animate-float backdrop-blur-md">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.20)] flex items-center justify-center shadow-[0_0_30px_rgba(108,114,232,0.50)]">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              {/* Orbiting particle */}
              <div className="absolute inset-0 animate-spin-slow pointer-events-none">
                <div className="absolute top-2 left-1/2 w-2.5 h-2.5 rounded-full bg-[#e8799a] shadow-[0_0_12px_rgba(232,121,154,0.80)] -translate-x-1/2" />
              </div>
            </div>
          </motion.div>

          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={indexedFadeUp(0) as never}
            className="space-y-2 max-w-2xl"
          >
            <Badge variant="amber" className="mb-2">
              <Flame className="w-3.5 h-3.5 mr-1" />
              {userProfile.streakCount}-Day Mindful Streak
            </Badge>
            <h1 className="font-display-lg text-4xl sm:text-5xl md:text-6xl text-[rgba(232,234,246,0.95)]">
              {greeting}, {firstName}.
            </h1>
            <p className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.40)] italic">
              How does your soul feel today?
            </p>
          </motion.div>

          {/* Quick stats bar */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={indexedFadeUp(1) as never}
            className="flex items-center gap-4 mt-8 flex-wrap justify-center"
          >
            {[
              { label: 'Journal Entries', value: journalEntries.length, icon: <BookOpen className="w-3.5 h-3.5" /> },
              { label: "Today's Rituals", value: `${totalHabitsToday}/${habits.length}`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
              { label: 'Mood Logs', value: moodLogs.length, icon: <Activity className="w-3.5 h-3.5" /> },
              { label: 'Day Streak', value: userProfile.streakCount, icon: <TrendingUp className="w-3.5 h-3.5" /> },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl px-4 py-2.5 text-sm"
              >
                <span className="text-[rgba(108,114,232,0.80)]">{stat.icon}</span>
                <span className="font-semibold text-[rgba(232,234,246,0.80)] font-mono">{stat.value}</span>
                <span className="text-[rgba(232,234,246,0.35)] text-xs">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── PERSONAL STATE ENGINE 2.0 MONITOR ── */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="mb-8 p-5 sm:p-6 rounded-[28px] bg-[rgba(255,255,255,0.03)] border border-[rgba(108,114,232,0.25)] shadow-[0_12px_40px_rgba(0,0,0,0.40)] backdrop-blur-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[rgba(108,114,232,0.15)] border border-[rgba(108,114,232,0.30)] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#c0c4ea]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display-lg text-lg text-[rgba(232,234,246,0.95)]">
                    Personal State Engine
                  </h3>
                  <Badge variant="lavender" size="sm">Phase 1 Active</Badge>
                </div>
                <p className="text-[11px] text-[rgba(232,234,246,0.40)]">
                  Unified multimodal signal estimate • Exponential decay (t½ = 12h)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasRealEvidence ? (
                <Badge variant="sage" size="sm">
                  {Math.round((personalState?.overallConfidence ?? 0) * 100)}% Confidence
                </Badge>
              ) : (
                <Badge variant="amber" size="sm">Awaiting data</Badge>
              )}
              <Button
                onClick={() => setCurrentView('analytics')}
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Deep Insights
              </Button>
            </div>
          </div>

          {/* Cold-start: no real evidence yet */}
          {!hasRealEvidence ? (
            <div className="py-4">
              {isStateLoading ? (
                /* Loading skeleton */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="h-20 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] animate-pulse" />
                  ))}
                </div>
              ) : (
                /* Establishing baseline empty state */
                <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[rgba(108,114,232,0.60)]" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <p className="font-display-lg text-lg text-[rgba(232,234,246,0.80)]">
                      Establishing your baseline
                    </p>
                    <p className="text-xs text-[rgba(232,234,246,0.40)] leading-relaxed">
                      Complete your first mood check-in to activate the Personal State Engine and begin measuring your wellness dimensions.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsCheckInOpen(true)}
                  >
                    Begin First Check-in
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Real dimension data */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  label: 'Mood',
                  value: personalState?.dimensions?.mood?.value ?? personalState?.mood ?? 50,
                  confidence: Math.round((personalState?.dimensions?.mood?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.mood?.trend ?? 'stable',
                  color: '#6ee7b7',
                },
                {
                  label: 'Stress Load',
                  value: personalState?.dimensions?.stress?.value ?? personalState?.stress ?? 50,
                  confidence: Math.round((personalState?.dimensions?.stress?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.stress?.trend ?? 'stable',
                  color: '#f4a8c0',
                },
                {
                  label: 'Fatigue',
                  value: personalState?.dimensions?.fatigue?.value ?? personalState?.fatigue ?? 50,
                  confidence: Math.round((personalState?.dimensions?.fatigue?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.fatigue?.trend ?? 'stable',
                  color: '#fbbf24',
                },
                {
                  label: 'Vitality / Energy',
                  value: personalState?.dimensions?.energy?.value ?? personalState?.energy ?? 50,
                  confidence: Math.round((personalState?.dimensions?.energy?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.energy?.trend ?? 'stable',
                  color: '#38bdf8',
                },
                {
                  label: 'Focus / Clarity',
                  value: personalState?.dimensions?.focus?.value ?? personalState?.focus ?? 50,
                  confidence: Math.round((personalState?.dimensions?.focus?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.focus?.trend ?? 'stable',
                  color: '#c0c4ea',
                },
                {
                  label: 'Cognitive Load',
                  value: personalState?.dimensions?.cognitiveLoad?.value ?? personalState?.cognitiveLoad ?? 50,
                  confidence: Math.round((personalState?.dimensions?.cognitiveLoad?.confidence ?? 0) * 100),
                  trend: personalState?.dimensions?.cognitiveLoad?.trend ?? 'stable',
                  color: '#a78bfa',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(232,234,246,0.40)] truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-[rgba(108,114,232,0.70)]">
                      {item.confidence}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
                      {item.value}
                    </span>
                    <span className="text-[10px] text-[rgba(232,234,246,0.30)]">/100</span>
                  </div>
                  <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${item.value}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}80`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── PHASE 2: LONGITUDINAL PATTERN ENGINE INSIGHTS ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <PatternInsightsCard />
        </motion.div>

        {/* ── PHASE 3: PERSONALIZED INTERVENTION RECOMMENDATION ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <InterventionRecommendationCard />
        </motion.div>

        {/* ── BENTO GRID ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >

          {/* ── Card 1: Weekly Mood Sparkline ── */}
          <motion.div variants={staggerChild} className="lg:col-span-7">
            <Card className="flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="flex justify-between items-end mb-5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                      The Pulse
                    </span>
                    <h3 className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.90)]">
                      7-Day Energy Curve
                    </h3>
                  </div>
                  <div className="flex gap-2 items-center text-xs text-[rgba(232,234,246,0.35)]">
                    <span className="w-2 h-2 rounded-full bg-[#6c72e8]" />
                    <span>Energy</span>
                    <span className="w-2 h-2 rounded-full bg-[#e8799a] ml-1" />
                    <span>Mood</span>
                  </div>
                </div>

                {hasWeeklyData ? (
                  <div className="h-32 w-full">
                    <MoodSparkline data={weeklyMoodData} color="#6c72e8" height={128} />
                  </div>
                ) : (
                  /* Animated placeholder bars when no data */
                  <div className="h-32 w-full flex items-end gap-2 overflow-hidden px-1 pt-4">
                    {[40, 65, 45, 80, 55, 90, 70, 50, 75, 60, 85, 65, 48, 72, 58].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.7, delay: 0.3 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 rounded-t-full hover:opacity-80 transition-opacity cursor-pointer"
                        style={{
                          background:
                            i % 2 === 0
                              ? `rgba(108, 114, 232, ${0.20 + (h / 100) * 0.45})`
                              : `rgba(192, 196, 234, ${0.15 + (h / 100) * 0.35})`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* X-axis day labels */}
                <div className="flex justify-between text-[10px] text-[rgba(232,234,246,0.25)] font-mono mt-2 px-1">
                  {dayLabels.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                <p className="text-sm text-[rgba(232,234,246,0.45)] font-body-md">
                  Latest mood:{' '}
                  <span className="font-semibold text-[rgba(192,196,234,0.85)]">
                    {latestMood ? latestMood.moodType : 'Not logged yet'}
                  </span>
                </p>
                <Button
                  onClick={() => setIsCheckInOpen(true)}
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Log Mood
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* ── Card 2: AI Insight ── */}
          <motion.div variants={staggerChild} className="lg:col-span-5">
            <Card
              className="flex flex-col justify-between min-h-[300px] relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(108,114,232,0.12) 0%, rgba(13,15,26,0.80) 60%, rgba(232,121,154,0.08) 100%)',
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(108,114,232,0.20) 0%, transparent 70%)' }} />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[rgba(192,196,234,0.10)] border border-[rgba(192,196,234,0.15)] flex items-center justify-center mb-5">
                  <Sparkles className="w-5 h-5 text-[#c0c4ea]" />
                </div>
                <blockquote className="font-display-lg text-lg sm:text-xl text-[rgba(232,234,246,0.85)] leading-relaxed italic mb-2">
                  "{aiInsight}"
                </blockquote>
                {journalEntries[0] && (
                  <p className="text-[11px] text-[rgba(232,234,246,0.35)] font-mono mt-2">
                    From: {journalEntries[0].title}
                  </p>
                )}
              </div>

              <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[rgba(108,114,232,0.40)] to-[rgba(232,121,154,0.30)] flex items-center justify-center font-display-lg text-sm text-[#c0c4ea]">
                    AI
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[rgba(232,234,246,0.70)] block">AI Insight</span>
                    <span className="text-[10px] text-[rgba(232,234,246,0.35)]">Mindful Companion</span>
                  </div>
                </div>
                <Button
                  onClick={() => setCurrentView('companion')}
                  variant="primary"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  AI Companion
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* ── Card 3: Daily Journal Prompt ── */}
          <motion.div variants={staggerChild} className="lg:col-span-4">
            <Card className="flex flex-col justify-between h-full min-h-[240px]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-3">
                  Daily Ritual
                </span>
                <h4 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)] mb-3">
                  Capture the unspoken
                </h4>
                <p className="text-sm text-[rgba(232,234,246,0.45)] leading-relaxed font-body-md">
                  What is one thing you are holding onto that you can gently release today?
                </p>
              </div>
              <Button
                onClick={() => setCurrentView('journal')}
                variant="primary"
                size="md"
                leftIcon={<BookOpen className="w-4 h-4" />}
                className="w-full mt-6"
              >
                Begin Journaling
              </Button>
            </Card>
          </motion.div>

          {/* ── Card 4: Habit Rituals ── */}
          <motion.div variants={staggerChild} className="lg:col-span-8">
            <Card>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                    Daily Rituals
                  </span>
                  <h4 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Today's Habits</h4>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[rgba(232,234,246,0.80)] font-mono">{habitCompletion}%</div>
                    <div className="text-[10px] text-[rgba(232,234,246,0.35)]">complete</div>
                  </div>
                  <Button
                    onClick={() => setCurrentView('habits')}
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View All
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full mb-5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${habitCompletion}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full progress-glow"
                  style={{ background: 'linear-gradient(90deg, #6c72e8, #e8799a)' }}
                />
              </div>

              {habits.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-6 h-6" />}
                  title="No rituals yet"
                  description="Add your first daily habit to start building a consistent practice."
                  action={{ label: 'Add Ritual', onClick: () => setCurrentView('habits') }}
                  compact
                />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {habits.slice(0, 4).map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      todayStr={todayStr}
                      onToggle={toggleHabitCompletion}
                    />
                  ))}
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* ── Card 5: Recent Journals ── */}
          {journalEntries.length > 0 && (
            <motion.div variants={staggerChild} className="lg:col-span-6">
              <Card className="h-full">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                      Recent Reflections
                    </span>
                    <h4 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Journal Archive</h4>
                  </div>
                  <Button
                    onClick={() => setCurrentView('journal')}
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    All Entries
                  </Button>
                </div>
                <div className="space-y-3">
                  {journalEntries.slice(0, 3).map((entry) => (
                    <motion.div
                      key={entry.id}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.20)] cursor-pointer transition-colors"
                      onClick={() => setCurrentView('journal')}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.18)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {entry.favorite ? (
                          <Star className="w-3.5 h-3.5 text-[#fbbf24] fill-current" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-[rgba(192,196,234,0.70)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[rgba(232,234,246,0.80)] truncate">{entry.title}</p>
                        <p className="text-[11px] text-[rgba(232,234,246,0.35)] line-clamp-1 mt-0.5 leading-relaxed">
                          {entry.content}
                        </p>
                        <span className="text-[10px] text-[rgba(232,234,246,0.25)] font-mono mt-1 block">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}
                          {entry.mood}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Card 6: Quick Actions Row ── */}
          <motion.div
            variants={staggerChild}
            className={journalEntries.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'}
          >
            <div className="grid grid-cols-2 gap-4 h-full">
              {[
                {
                  label: 'Journal',
                  desc: 'Write a reflection',
                  view: 'journal' as const,
                  icon: <BookOpen className="w-5 h-5" />,
                  gradient: 'from-[rgba(108,114,232,0.20)] to-[rgba(108,114,232,0.06)]',
                  color: '#c0c4ea',
                },
                {
                  label: 'AI Companion',
                  desc: 'Talk with Gemini',
                  view: 'companion' as const,
                  icon: <Sparkles className="w-5 h-5" />,
                  gradient: 'from-[rgba(232,121,154,0.20)] to-[rgba(232,121,154,0.06)]',
                  color: '#f4a8c0',
                },
                {
                  label: 'Mood Log',
                  desc: 'Record inner state',
                  view: 'mood' as const,
                  icon: <HeartHandshake className="w-5 h-5" />,
                  gradient: 'from-[rgba(52,211,153,0.20)] to-[rgba(52,211,153,0.06)]',
                  color: '#6ee7b7',
                },
                {
                  label: 'Analytics',
                  desc: 'My weekly patterns',
                  view: 'analytics' as const,
                  icon: <Activity className="w-5 h-5" />,
                  gradient: 'from-[rgba(251,191,36,0.20)] to-[rgba(251,191,36,0.06)]',
                  color: '#fbbf24',
                },
              ].map((item) => (
                <motion.button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex flex-col items-start p-5 rounded-2xl bg-gradient-to-br ${item.gradient} border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)] transition-all duration-200 text-left overflow-hidden`}
                >
                  <div
                    className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3 transition-all group-hover:scale-110"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div className="font-semibold text-sm text-[rgba(232,234,246,0.80)]">{item.label}</div>
                  <div className="text-[11px] text-[rgba(232,234,246,0.35)] mt-0.5">{item.desc}</div>
                  <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-[rgba(232,234,246,0.20)] group-hover:text-[rgba(232,234,246,0.50)] group-hover:translate-x-1 transition-all" />
                </motion.button>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </PageTransition>
  );
};
