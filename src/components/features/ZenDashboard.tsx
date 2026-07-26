import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { BookOpen, Sparkles, HeartHandshake, CheckCircle2, ArrowRight, Flame, Activity, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Animate in staggered children
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const ZenDashboard: React.FC = () => {
  const {
    userProfile,
    setCurrentView,
    habits,
    toggleHabitCompletion,
    journalEntries,
    moodLogs,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = userProfile?.name?.trim()?.split(' ')[0] || 'Friend';
  const latestMood = moodLogs[0];
  const totalHabitsToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const habitCompletion = habits.length ? Math.round((totalHabitsToday / habits.length) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-28 pb-36">

      {/* === HERO PRESENCE === */}
      <section className="flex flex-col items-center justify-center mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-7"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full animate-pulse-ring" />
          {/* Outer glass ring */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44">
            <div className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(108,114,232,0.35) 0%, rgba(232,121,154,0.20) 50%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            <div className="absolute inset-3 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.10)] shadow-[inset_0_0_40px_rgba(108,114,232,0.15)] flex items-center justify-center animate-float backdrop-blur-md">
              {/* Inner core */}
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
          variants={fadeUp}
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
          variants={fadeUp}
          className="flex items-center gap-4 mt-8 flex-wrap justify-center"
        >
          {[
            { label: 'Journal Entries', value: journalEntries.length, icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: 'Today\'s Rituals', value: `${totalHabitsToday}/${habits.length}`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { label: 'Mood Logs', value: moodLogs.length, icon: <Activity className="w-3.5 h-3.5" /> },
            { label: 'Day Streak', value: userProfile.streakCount, icon: <TrendingUp className="w-3.5 h-3.5" /> },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl px-4 py-2.5 text-sm">
              <span className="text-[rgba(108,114,232,0.80)]">{stat.icon}</span>
              <span className="font-semibold text-[rgba(232,234,246,0.80)] font-mono">{stat.value}</span>
              <span className="text-[rgba(232,234,246,0.35)] text-xs">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* === BENTO GRID === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* Module 1: Emotional Pulse / Chart */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="md:col-span-7"
        >
          <Card className="flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex justify-between items-end mb-7">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                    The Pulse
                  </span>
                  <h3 className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.90)]">
                    Emotional Landscape
                  </h3>
                </div>
                <div className="flex gap-2 items-center text-xs text-[rgba(232,234,246,0.35)]">
                  <span className="w-2 h-2 rounded-full bg-[#6c72e8]" />
                  <span>Vibrant</span>
                  <span className="w-2 h-2 rounded-full bg-[#e8799a] ml-1" />
                  <span>Calm</span>
                </div>
              </div>

              {/* Animated Wave Bars */}
              <div className="h-44 w-full flex items-end gap-2 overflow-hidden px-1 pt-4">
                {[40, 65, 45, 80, 55, 90, 70, 50, 75, 60, 85, 65, 48, 72, 58].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.7, delay: 0.3 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 rounded-t-full hover:opacity-80 transition-opacity cursor-pointer"
                    style={{
                      background: i % 2 === 0
                        ? `rgba(108, 114, 232, ${0.25 + (h / 100) * 0.55})`
                        : `rgba(192, 196, 234, ${0.20 + (h / 100) * 0.40})`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <p className="text-sm text-[rgba(232,234,246,0.45)] font-body-md">
                Latest mood:{' '}
                <span className="font-semibold text-[rgba(192,196,234,0.85)]">
                  {latestMood ? latestMood.moodType : 'Serene'}
                </span>
              </p>
              <Button
                onClick={() => setCurrentView('mood')}
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Log Mood
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Module 2: AI Insight Quote */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="md:col-span-5"
        >
          <Card
            className="flex flex-col justify-between min-h-[360px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(108,114,232,0.12) 0%, rgba(13,15,26,0.80) 60%, rgba(232,121,154,0.08) 100%)',
            }}
          >
            {/* Soft glow */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(108,114,232,0.20) 0%, transparent 70%)' }}
            />

            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[rgba(192,196,234,0.10)] border border-[rgba(192,196,234,0.15)] flex items-center justify-center mb-5">
                <Sparkles className="w-5 h-5 text-[#c0c4ea]" />
              </div>
              <blockquote className="font-display-lg text-xl sm:text-2xl text-[rgba(232,234,246,0.85)] leading-snug italic mb-5">
                "The soul always knows what to do to heal itself. The challenge is to silence the mind."
              </blockquote>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[rgba(108,114,232,0.40)] to-[rgba(232,121,154,0.30)] flex items-center justify-center font-display-lg text-sm text-[#c0c4ea]">
                  CW
                </div>
                <div>
                  <span className="text-xs font-semibold text-[rgba(232,234,246,0.70)] block">Inner Whisper</span>
                  <span className="text-[10px] text-[rgba(232,234,246,0.35)]">Caroline Myss</span>
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

        {/* Module 3: Daily Journal Prompt */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="md:col-span-4"
        >
          <Card className="flex flex-col justify-between h-full min-h-[260px]">
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

        {/* Module 4: Habit Rituals */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="md:col-span-8"
        >
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

            {/* Compact progress bar */}
            <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full mb-5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${habitCompletion}%` }}
                transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full progress-glow"
                style={{ background: 'linear-gradient(90deg, #6c72e8, #e8799a)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {habits.slice(0, 4).map((habit, idx) => {
                const isCompleted = habit.completedDates.includes(todayStr);
                return (
                  <motion.div
                    key={habit.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    onClick={() => toggleHabitCompletion(habit.id, todayStr)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-200 ${
                      isCompleted
                        ? 'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.20)]'
                        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.20)] hover:bg-[rgba(108,114,232,0.04)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isCompleted
                            ? 'bg-[#34d399] border-[#34d399] shadow-[0_0_10px_rgba(52,211,153,0.50)]'
                            : 'border-[rgba(255,255,255,0.15)]'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-[rgba(232,234,246,0.80)] line-clamp-1">
                          {habit.title}
                        </h5>
                        <span className="text-[10px] text-[rgba(232,234,246,0.35)]">
                          🔥 {habit.streak} day streak
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Module 5: Quick Actions Row */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="md:col-span-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Journal', desc: 'Write a reflection', view: 'journal' as const,
                icon: <BookOpen className="w-5 h-5" />,
                gradient: 'from-[rgba(108,114,232,0.20)] to-[rgba(108,114,232,0.06)]',
                color: '#c0c4ea',
              },
              {
                label: 'AI Companion', desc: 'Talk with Gemini', view: 'companion' as const,
                icon: <Sparkles className="w-5 h-5" />,
                gradient: 'from-[rgba(232,121,154,0.20)] to-[rgba(232,121,154,0.06)]',
                color: '#f4a8c0',
              },
              {
                label: 'Mood Log', desc: 'Record inner state', view: 'mood' as const,
                icon: <HeartHandshake className="w-5 h-5" />,
                gradient: 'from-[rgba(52,211,153,0.20)] to-[rgba(52,211,153,0.06)]',
                color: '#6ee7b7',
              },
              {
                label: 'Analytics', desc: 'My weekly patterns', view: 'analytics' as const,
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
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3 transition-all group-hover:scale-110"
                  style={{ color: item.color }}>
                  {item.icon}
                </div>
                <div className="font-semibold text-sm text-[rgba(232,234,246,0.80)]">{item.label}</div>
                <div className="text-[11px] text-[rgba(232,234,246,0.35)] mt-0.5">{item.desc}</div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-[rgba(232,234,246,0.20)] group-hover:text-[rgba(232,234,246,0.50)] group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
