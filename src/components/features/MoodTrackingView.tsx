import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { HeartHandshake, Sparkles, MapPin } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MoodLog } from '../../types';

const moodConfig: Record<string, { color: string; bg: string; emoji: string }> = {
  Joy: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', emoji: '✨' },
  Calm: { color: '#6ee7b7', bg: 'rgba(52,211,153,0.15)', emoji: '🌿' },
  Focus: { color: '#c0c4ea', bg: 'rgba(192,196,234,0.15)', emoji: '🎯' },
  Anxiety: { color: '#f4a8c0', bg: 'rgba(232,121,154,0.15)', emoji: '🌊' },
  Melancholy: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', emoji: '🌙' },
  Gratitude: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', emoji: '🙏' },
  Restless: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)', emoji: '🔥' },
};

export const MoodTrackingView: React.FC = () => {
  const { moodLogs, addMoodLog } = useApp();

  const [energyLevel, setEnergyLevel] = useState(7);
  const [selectedMood, setSelectedMood] = useState<MoodLog['moodType']>('Calm');
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['Morning Routine']);
  const [selectedSensations, setSelectedSensations] = useState<string[]>(['Deep breathing']);

  const triggersList = ['Morning Routine', 'Creative Work', 'Nature', 'Exercise', 'Meditation', 'Coffee/Tea', 'Social Interaction', 'Deadlines'];
  const sensationsList = ['Deep breathing', 'Relaxed shoulders', 'Lightness in chest', 'Warmth', 'Tightness in neck', 'Shallow breathing'];

  const handleToggle = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  const handleSubmitMood = (e: React.FormEvent) => {
    e.preventDefault();
    addMoodLog({
      energyLevel,
      moodType: selectedMood,
      notes,
      triggers: selectedTriggers,
      physicalSensations: selectedSensations,
    });
    setNotes('');
  };

  const currentMood = moodConfig[selectedMood] || moodConfig['Calm'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge variant="lavender" className="mb-3">Emotional Topography</Badge>
        <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)]">
          Volumetric Landscape of Self
        </h1>
        <p className="text-sm text-[rgba(232,234,246,0.40)] font-body-md mt-2 max-w-xl leading-relaxed">
          A continuous synthesis of your inner state across energy levels and emotional frequencies.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Topography Canvas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <Card className="flex flex-col min-h-[520px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(108,114,232,0.70)] block mb-1">
                  3D Mood Terrain
                </span>
                <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">7-Day Topography</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-[rgba(232,234,246,0.35)]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6ee7b7]" />Vibrant</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6c72e8]" />Restorative</span>
              </div>
            </div>

            {/* SVG Terrain */}
            <div className="relative h-72 w-full rounded-2xl overflow-hidden flex items-end"
              style={{ background: 'linear-gradient(160deg, #0f1229 0%, #131627 60%, #1a0e20 100%)' }}
            >
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6c72e8" stopOpacity="0.60" />
                    <stop offset="100%" stopColor="#6c72e8" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e8799a" stopOpacity="0.40" />
                    <stop offset="100%" stopColor="#e8799a" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M0,300 Q250,100 500,280 T1000,200 L1000,500 L0,500 Z" fill="url(#grad1)" />
                <path d="M0,350 Q250,200 500,320 T1000,250 L1000,500 L0,500 Z" fill="url(#grad2)" />
                {/* Stroke lines */}
                <path d="M0,300 Q250,100 500,280 T1000,200" fill="none" stroke="rgba(108,114,232,0.60)" strokeWidth="2" />
                <path d="M0,350 Q250,200 500,320 T1000,250" fill="none" stroke="rgba(232,121,154,0.40)" strokeWidth="1.5" />
              </svg>

              {/* Memory Markers */}
              <div className="absolute top-[28%] left-[25%] group cursor-pointer z-10">
                <motion.div
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-6 h-6 bg-[#fbbf24] rounded-full border-2 border-white/30 shadow-[0_0_16px_rgba(251,191,36,0.70)] flex items-center justify-center"
                >
                  <MapPin className="w-3 h-3 text-slate-900" />
                </motion.div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-48 p-3.5 rounded-2xl bg-[rgba(13,15,26,0.95)] border border-[rgba(255,255,255,0.10)] text-xs shadow-2xl z-20">
                  <p className="font-semibold text-[rgba(232,234,246,0.90)] mb-1">Flow State Peak</p>
                  <p className="text-[rgba(232,234,246,0.50)] leading-relaxed">Deep momentum during creative design work.</p>
                </div>
              </div>

              <div className="absolute top-[62%] left-[60%] group cursor-pointer z-10">
                <div className="w-5 h-5 bg-[#6c72e8] rounded-full border-2 border-white/20 shadow-[0_0_12px_rgba(108,114,232,0.70)] flex items-center justify-center">
                  <span className="w-2 h-2 bg-white/60 rounded-full" />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-48 p-3.5 rounded-2xl bg-[rgba(13,15,26,0.95)] border border-[rgba(255,255,255,0.10)] text-xs shadow-2xl z-20">
                  <p className="font-semibold text-[rgba(232,234,246,0.90)] mb-1">Quiet Valley</p>
                  <p className="text-[rgba(232,234,246,0.50)] leading-relaxed">Stillness. Recharging in soft afternoon light.</p>
                </div>
              </div>

              <div className="relative z-10 pb-4 pl-5 text-[rgba(255,255,255,0.25)] text-xs font-mono">
                Hover over peaks to inspect memory anchors
              </div>
            </div>

            {/* Recent Mood Log */}
            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)] space-y-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(232,234,246,0.40)]">
                Recent Entries
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {moodLogs.slice(0, 4).map((m) => {
                  const cfg = moodConfig[m.moodType] || moodConfig['Calm'];
                  return (
                    <div key={m.id} className="p-3.5 rounded-2xl border text-xs" style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold" style={{ color: cfg.color }}>{cfg.emoji} {m.moodType}</span>
                        <span className="text-[rgba(232,234,246,0.35)] font-mono text-[10px]">E:{m.energyLevel}/10</span>
                      </div>
                      <p className="text-[rgba(232,234,246,0.45)] line-clamp-1">{m.notes || 'No extra notes'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Log Form */}
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
              <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Log Current State</h3>
            </div>

            <form onSubmit={handleSubmitMood} className="space-y-6">
              {/* Energy Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-3">
                  <span className="uppercase tracking-wider text-[rgba(232,234,246,0.40)]">Energy Level</span>
                  <span className="text-[#c0c4ea] font-mono text-sm">{energyLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: '#6c72e8' }}
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
                  {(['Joy', 'Calm', 'Focus', 'Anxiety', 'Melancholy', 'Gratitude'] as MoodLog['moodType'][]).map((type) => {
                    const cfg = moodConfig[type];
                    const isSelected = selectedMood === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedMood(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                          isSelected ? 'scale-105' : 'opacity-60 hover:opacity-90'
                        }`}
                        style={isSelected
                          ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(232,234,246,0.55)', borderColor: 'rgba(255,255,255,0.08)' }
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
                      onClick={() => handleToggle(selectedTriggers, setSelectedTriggers, t)}
                      className={`text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
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
                      onClick={() => handleToggle(selectedSensations, setSelectedSensations, s)}
                      className={`text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border ${
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
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-3.5 text-xs text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[rgba(108,114,232,0.40)] h-20 resize-none transition-all"
                />
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full">
                Record Emotional Snapshot
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
