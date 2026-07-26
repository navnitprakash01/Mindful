import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Flame, Plus, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

const categoryConfig = {
  mindfulness: { color: '#c0c4ea', bg: 'rgba(192,196,234,0.12)', emoji: '🧘' },
  movement: { color: '#6ee7b7', bg: 'rgba(52,211,153,0.12)', emoji: '⚡' },
  reflection: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', emoji: '📝' },
  rest: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', emoji: '🌙' },
  gratitude: { color: '#f4a8c0', bg: 'rgba(232,121,154,0.12)', emoji: '🙏' },
};

export const HabitsView: React.FC = () => {
  const { habits, toggleHabitCompletion, showToast } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'mindfulness' | 'movement' | 'reflection' | 'rest'>('mindfulness');

  const todayStr = new Date().toISOString().split('T')[0];
  const totalCompletedToday = habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const completionPercentage = habits.length ? Math.round((totalCompletedToday / habits.length) * 100) : 0;

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    showToast(`"${newTitle}" added to daily rituals`);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-5"
      >
        <div>
          <Badge variant="sage" className="mb-3">Daily Rituals & Habits</Badge>
          <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)]">
            Nurture Small Daily Moments
          </h1>
          <p className="text-sm text-[rgba(232,234,246,0.40)] font-body-md mt-2 max-w-md leading-relaxed">
            Consistency is built through compassionate repetition, not pressure.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Ritual
        </Button>
      </motion.div>

      {/* Progress Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[32px] overflow-hidden border border-[rgba(108,114,232,0.20)] shadow-[0_0_40px_rgba(108,114,232,0.08),0_20px_60px_rgba(0,0,0,0.40)] p-8 md:p-10"
        style={{ background: 'linear-gradient(135deg, rgba(108,114,232,0.18) 0%, rgba(13,15,26,0.95) 60%, rgba(232,121,154,0.10) 100%)' }}
      >
        {/* BGdeco */}
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(108,114,232,0.18) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(192,196,234,0.50)] block mb-2">
              Today's Sanctuary Progress
            </span>
            <h2 className="font-display-lg text-3xl sm:text-4xl text-white">
              {totalCompletedToday} of {habits.length} Rituals Complete
            </h2>
            <p className="text-sm text-[rgba(192,196,234,0.45)] mt-1.5 font-body-md">
              Maintain momentum to deepen emotional balance.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] rounded-2xl px-6 py-4">
              <Trophy className="w-5 h-5 text-[#fbbf24] mx-auto mb-1" />
              <span className="text-[10px] text-[rgba(192,196,234,0.45)] block">Best Streak</span>
              <span className="text-xl font-bold font-mono text-white">14 Days</span>
            </div>
            <div className="text-center">
              <span className="text-4xl font-bold font-mono" style={{
                background: 'linear-gradient(135deg, #c0c4ea, #e8799a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{completionPercentage}%</span>
              <span className="text-[10px] text-[rgba(192,196,234,0.45)] block mt-0.5">Today</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 w-full h-2 bg-[rgba(255,255,255,0.08)] rounded-full mt-7 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full progress-glow"
            style={{ background: 'linear-gradient(90deg, #6c72e8, #e8799a)' }}
          />
        </div>
      </motion.div>

      {/* Habit Cards Grid */}
      {habits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-center py-20 px-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-[32px] flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[rgba(108,114,232,0.08)] flex items-center justify-center mb-5 border border-[rgba(108,114,232,0.15)] shadow-[0_0_20px_rgba(108,114,232,0.1)]">
            <Plus className="w-6 h-6 text-[rgba(192,196,234,0.6)]" />
          </div>
          <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)] mb-2">Begin your first ritual</h3>
          <p className="text-sm text-[rgba(232,234,246,0.50)] max-w-sm font-body-md mb-7 leading-relaxed">
            Small daily acts compound into profound emotional shifts. What will you nurture today?
          </p>
          <Button onClick={() => setIsAddModalOpen(true)} variant="glass" size="md">
            Create Daily Ritual
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {habits.map((habit, idx) => {
            const isCompleted = habit.completedDates.includes(todayStr);
          const cfg = categoryConfig[habit.category] || categoryConfig.mindfulness;
          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card
                onClick={() => toggleHabitCompletion(habit.id, todayStr)}
                hoverEffect={false}
                className={`cursor-pointer flex items-center justify-between transition-all duration-300 p-6 ${
                  isCompleted
                    ? 'border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)]'
                    : 'hover:border-[rgba(108,114,232,0.20)] hover:bg-[rgba(108,114,232,0.03)]'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Category Icon */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: isCompleted ? 'rgba(52,211,153,0.15)' : cfg.bg, border: `1px solid ${isCompleted ? 'rgba(52,211,153,0.30)' : cfg.color + '30'}` }}
                  >
                    {cfg.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={isCompleted ? 'sage' : 'slate'} size="sm">
                        {habit.category}
                      </Badge>
                      <span className="text-[10px] font-semibold text-[#fbbf24] flex items-center gap-1 font-mono">
                        <Flame className="w-3 h-3" /> {habit.streak} day
                      </span>
                    </div>
                    <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.85)]">{habit.title}</h3>
                    <p className="text-xs text-[rgba(232,234,246,0.40)] font-body-md leading-relaxed mt-0.5 max-w-xs">
                      {habit.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'border-[#34d399] bg-[#34d399] shadow-[0_0_16px_rgba(52,211,153,0.50)]'
                      : 'border-[rgba(255,255,255,0.15)] hover:border-[rgba(108,114,232,0.40)]'
                  }`}
                >
                  <AnimatePresence>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* Add Habit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Daily Ritual"
        subtitle="Define a mindful micro-habit to cultivate every day."
      >
        <form onSubmit={handleCreateHabit} className="space-y-5 mt-2">
          <Input
            label="Ritual Title"
            placeholder="e.g., Evening Gratitude Journaling"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <Input
            label="Description"
            placeholder="e.g., Write 3 things that brought peace today."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-3">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {(['mindfulness', 'movement', 'reflection', 'rest'] as const).map((cat) => {
                const cfg = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                      newCategory === cat ? 'scale-105' : 'opacity-60 hover:opacity-90'
                    }`}
                    style={newCategory === cat
                      ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,234,246,0.55)', borderColor: 'rgba(255,255,255,0.08)' }
                    }
                  >
                    {cfg.emoji} {cat}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" variant="primary" size="md" className="w-full">
            Add Ritual
          </Button>
        </form>
      </Modal>
    </div>
  );
};
