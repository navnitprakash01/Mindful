/**
 * MoodCheckInModal
 * Mindful 2.0 — Phase 1
 *
 * Inline modal for quick mood check-in from the dashboard.
 * Persists to Supabase via /api/moods, then triggers Personal State recalculation.
 */

import React, { useState, useCallback } from 'react';
import { HeartHandshake, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MoodLog } from '../../types';
import { useMood } from '../../context/MoodContext';
import { usePersonalState } from '../../context/StateContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubmitPhase = 'idle' | 'saving' | 'refreshing' | 'done' | 'error';

interface MoodCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Mood config ───────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  Joy:        { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  emoji: '✨' },
  Calm:       { color: '#6ee7b7', bg: 'rgba(52,211,153,0.15)',  emoji: '🌿' },
  Focus:      { color: '#c0c4ea', bg: 'rgba(192,196,234,0.15)', emoji: '🎯' },
  Anxiety:    { color: '#f4a8c0', bg: 'rgba(232,121,154,0.15)', emoji: '🌊' },
  Melancholy: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', emoji: '🌙' },
  Gratitude:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  emoji: '🙏' },
  Restless:   { color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  emoji: '🔥' },
};

const MOOD_TYPES: MoodLog['moodType'][] = [
  'Joy', 'Calm', 'Focus', 'Anxiety', 'Melancholy', 'Gratitude', 'Restless',
];

const TRIGGERS_LIST = [
  'Morning Routine', 'Creative Work', 'Nature', 'Exercise',
  'Meditation', 'Coffee/Tea', 'Social Interaction', 'Deadlines',
];

const SENSATIONS_LIST = [
  'Deep breathing', 'Relaxed shoulders', 'Lightness in chest',
  'Warmth', 'Tightness in neck', 'Shallow breathing',
];

// ── Component ─────────────────────────────────────────────────────────────────

export const MoodCheckInModal: React.FC<MoodCheckInModalProps> = ({ isOpen, onClose }) => {
  const { addMoodLog } = useMood();
  const { recalculateState, refreshState } = usePersonalState();

  const [energyLevel, setEnergyLevel] = useState(7);
  const [selectedMood, setSelectedMood] = useState<MoodLog['moodType']>('Calm');
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEnergyLevel(7);
    setSelectedMood('Calm');
    setNotes('');
    setSelectedTriggers([]);
    setSelectedSensations([]);
    setSubmitPhase('idle');
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const toggleItem = useCallback(
    (
      list: string[],
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      item: string
    ) => {
      setter((prev) =>
        prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
      );
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitPhase !== 'idle' && submitPhase !== 'error') return;

      setErrorMessage(null);
      setSubmitPhase('idle');

      if (energyLevel < 1 || energyLevel > 10) {
        setErrorMessage('Energy level must be between 1 and 10.');
        setSubmitPhase('error');
        return;
      }
      if (!MOOD_TYPES.includes(selectedMood)) {
        setErrorMessage('Please select a mood type.');
        setSubmitPhase('error');
        return;
      }

      setSubmitPhase('saving');

      const result = await addMoodLog(
        {
          energyLevel,
          moodType: selectedMood,
          notes: notes.trim(),
          triggers: selectedTriggers,
          physicalSensations: selectedSensations,
        },
        async () => {
          setSubmitPhase('refreshing');
          try {
            await recalculateState();
            await refreshState();
          } catch {
            // State refresh failure is non-critical — mood was saved successfully
          }
        }
      );

      if (!result.ok) {
        setSubmitPhase('error');
        setErrorMessage(result.error ?? 'An unexpected error occurred. Please try again.');
        return;
      }

      setSubmitPhase('done');
      setTimeout(() => {
        handleClose();
      }, 1400);
    },
    [
      submitPhase,
      energyLevel,
      selectedMood,
      notes,
      selectedTriggers,
      selectedSensations,
      addMoodLog,
      recalculateState,
      refreshState,
      handleClose,
    ]
  );

  const isSubmitting = submitPhase === 'saving' || submitPhase === 'refreshing';
  const isDone = submitPhase === 'done';
  const isError = submitPhase === 'error';

  const submitLabel =
    submitPhase === 'saving'
      ? 'Saving check-in...'
      : submitPhase === 'refreshing'
      ? 'Updating your state...'
      : submitPhase === 'done'
      ? 'Saved'
      : 'Record Emotional Snapshot';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mood Check-in"
      subtitle="How are you feeling right now?"
      maxWidth="md"
    >
      {isDone ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(52,211,153,0.15)',
              border: '1.5px solid rgba(52,211,153,0.35)',
            }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: '#34d399' }} />
          </div>
          <p className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">
            Snapshot recorded
          </p>
          <p className="text-sm text-[rgba(232,234,246,0.45)]">
            Your Personal State Engine is updating...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error banner */}
          {isError && errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[rgba(242,139,130,0.10)] border border-[rgba(242,139,130,0.25)]">
              <AlertCircle className="w-4 h-4 text-[#f28b82] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#f28b82] leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Energy Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2.5">
              <span className="uppercase tracking-wider text-[rgba(232,234,246,0.40)]">
                Energy Level
              </span>
              <span className="text-[#c0c4ea] font-mono">{energyLevel} / 10</span>
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
            <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-2.5">
              Primary Emotion
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TYPES.map((type) => {
                const cfg = MOOD_CONFIG[type];
                const isSelected = selectedMood === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelectedMood(type)}
                    className={
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 disabled:opacity-40 ' +
                      (isSelected ? 'scale-105' : 'opacity-60 hover:opacity-90')
                    }
                    style={
                      isSelected
                        ? {
                            background: cfg.bg,
                            color: cfg.color,
                            borderColor: cfg.color + '40',
                          }
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
            <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-2.5">
              Influencing Triggers
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGERS_LIST.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => toggleItem(selectedTriggers, setSelectedTriggers, t)}
                  className={
                    'text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border disabled:opacity-40 ' +
                    (selectedTriggers.includes(t)
                      ? 'bg-[rgba(108,114,232,0.20)] text-[#c0c4ea] border-[rgba(108,114,232,0.35)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.45)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Somatic Sensations */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-2.5">
              Somatic Sensations
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SENSATIONS_LIST.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => toggleItem(selectedSensations, setSelectedSensations, s)}
                  className={
                    'text-[11px] px-3 py-1.5 rounded-full cursor-pointer transition-all border disabled:opacity-40 ' +
                    (selectedSensations.includes(s)
                      ? 'bg-[rgba(232,121,154,0.18)] text-[#f4a8c0] border-[rgba(232,121,154,0.30)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.45)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]')
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[rgba(232,234,246,0.40)] block mb-2">
              Context Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What brought about this feeling?"
              disabled={isSubmitting}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-3.5 text-xs text-[rgba(232,234,246,0.70)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[rgba(108,114,232,0.40)] h-20 resize-none transition-all disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            leftIcon={!isSubmitting ? <HeartHandshake className="w-4 h-4" /> : undefined}
          >
            {submitLabel}
          </Button>

          {/* Phase status hint */}
          {isSubmitting && (
            <p className="text-center text-[11px] text-[rgba(232,234,246,0.35)]">
              {submitPhase === 'saving'
                ? 'Persisting to your wellness record...'
                : 'Recalculating your Personal State...'}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
};
