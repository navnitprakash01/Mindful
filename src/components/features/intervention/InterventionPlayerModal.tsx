/**
 * InterventionPlayerModal Component
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Implements the interactive protocol runner:
 * 1. Protocol Brief & Affirmation
 * 2. Step-by-Step Guided Runner with Timer
 * 3. Post-Session Reflective Check-In (Usefulness & Dimension Sliders)
 * 4. Outcome & Mathematical Delta Summary
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Sparkles,
  ShieldAlert,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Star,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import {
  InterventionDefinition,
  InterventionSession,
  StateDimensionKey,
} from '../../../types';
import { useIntervention } from '../../../context/InterventionContext';
import { usePersonalState } from '../../../context/StateContext';

interface InterventionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention?: InterventionDefinition | null;
}

type PlayerStage = 'preview' | 'active' | 'reflection' | 'summary';

const HIGHER_IS_POSITIVE: Record<StateDimensionKey, boolean> = {
  mood: true,
  energy: true,
  focus: true,
  stress: false,
  fatigue: false,
  cognitiveLoad: false,
};

export const InterventionPlayerModal: React.FC<InterventionPlayerModalProps> = ({
  isOpen,
  onClose,
  intervention: propIntervention,
}) => {
  const {
    recommendation,
    playerIntervention,
    startSession,
    completeSession,
  } = useIntervention();
  const { personalState } = usePersonalState();

  const activeIntervention: InterventionDefinition | null =
    propIntervention || playerIntervention || recommendation?.intervention || null;

  const [stage, setStage] = useState<PlayerStage>('preview');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeSession, setActiveSession] = useState<InterventionSession | null>(null);

  // Timer state for guided runner
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Post-check-in reflective inputs
  const [postRatings, setPostRatings] = useState<Record<StateDimensionKey, number>>({
    mood: 70,
    stress: 30,
    fatigue: 35,
    energy: 65,
    focus: 70,
    cognitiveLoad: 35,
  });
  const [usefulness, setUsefulness] = useState<number>(4);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [completedSession, setCompletedSession] = useState<InterventionSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when modal opens or intervention changes
  useEffect(() => {
    if (isOpen) {
      setStage('preview');
      setCurrentStepIndex(0);
      setActiveSession(null);
      setCompletedSession(null);
      setIsTimerRunning(false);
      if (personalState) {
        setPostRatings({
          mood: personalState.mood,
          stress: personalState.stress,
          fatigue: personalState.fatigue,
          energy: personalState.energy,
          focus: personalState.focus,
          cognitiveLoad: personalState.cognitiveLoad,
        });
      }
    }
  }, [isOpen, activeIntervention?.id, personalState]);

  // Sync step timer
  useEffect(() => {
    if (stage === 'active' && activeIntervention) {
      const step = activeIntervention.steps[currentStepIndex];
      const duration = step?.durationSeconds || 45;
      setSecondsRemaining(duration);
      setIsTimerRunning(true);
    }
  }, [stage, currentStepIndex, activeIntervention]);

  // Handle countdown interval
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsTimerRunning(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining]);

  if (!activeIntervention) {
    return null;
  }

  const currentStep = activeIntervention.steps[currentStepIndex];
  const isLastStep = currentStepIndex >= activeIntervention.steps.length - 1;

  const handleStart = async () => {
    setIsSaving(true);
    try {
      const session = await startSession(activeIntervention.id);
      setActiveSession(session);
      setStage('active');
      setCurrentStepIndex(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setStage('reflection');
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleCompleteReflection = async () => {
    if (!activeSession) return;
    setIsSaving(true);
    try {
      const finished = await completeSession(activeSession.id, {
        postStateSnapshot: postRatings,
        perceivedUsefulness: usefulness,
        userFeedback: feedbackNotes.trim() || undefined,
        durationSeconds: activeIntervention.durationMinutes * 60,
      });

      if (finished) {
        setCompletedSession(finished);
        setStage('summary');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stage === 'preview' ? activeIntervention.title : undefined}
      subtitle={stage === 'preview' ? activeIntervention.shortDescription : undefined}
      maxWidth="lg"
    >
      <AnimatePresence mode="wait">
        {/* STAGE 1: PROTOCOL PREVIEW & INTENT */}
        {stage === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(192,196,234,0.12)] text-[#c0c4ea] border border-[rgba(192,196,234,0.20)]">
                <Clock className="w-3.5 h-3.5" />
                {activeIntervention.durationMinutes} min protocol
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[rgba(52,211,153,0.12)] text-[#6ee7b7] border border-[rgba(52,211,153,0.20)] uppercase tracking-wider">
                {activeIntervention.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.05)] text-[rgba(232,234,246,0.60)]">
                {activeIntervention.difficulty}
              </span>
            </div>

            {/* Long Description */}
            <p className="text-sm text-[rgba(232,234,246,0.70)] leading-relaxed">
              {activeIntervention.longDescription}
            </p>

            {/* Recommendation Reasons if present */}
            {recommendation?.reasons && recommendation.reasons.length > 0 && (
              <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#c0c4ea] tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#c0c4ea]" />
                  Why this is recommended for you
                </div>
                <ul className="space-y-1">
                  {recommendation.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-[rgba(232,234,246,0.60)] flex items-start gap-2">
                      <span className="text-[#6ee7b7] mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Steps Outline */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[rgba(232,234,246,0.40)] font-medium">
                Protocol Steps ({activeIntervention.steps.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {activeIntervention.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-[rgba(192,196,234,0.15)] text-[#c0c4ea]">
                      {step.stepNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[rgba(232,234,246,0.85)] truncate">
                        {step.title}
                      </div>
                    </div>
                    {step.durationSeconds && (
                      <span className="text-[11px] text-[rgba(232,234,246,0.35)]">
                        {step.durationSeconds}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Safety notice */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.15)] text-xs text-[rgba(251,191,36,0.80)]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{activeIntervention.safetyNotes}</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Maybe Later
              </Button>
              <Button variant="primary" onClick={handleStart} disabled={isSaving}>
                {isSaving ? 'Preparing...' : 'Begin Protocol'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 2: ACTIVE GUIDED RUNNER */}
        {stage === 'active' && currentStep && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 text-center py-4"
          >
            {/* Step header */}
            <div className="flex items-center justify-between text-xs text-[rgba(232,234,246,0.40)]">
              <span>{activeIntervention.title}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] font-mono">
                Step {currentStepIndex + 1} of {activeIntervention.steps.length}
              </span>
            </div>

            {/* Circular Timer Visual */}
            <div className="relative flex items-center justify-center my-6">
              <div className="w-44 h-44 rounded-full border border-[rgba(192,196,234,0.15)] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(192,196,234,0.08)_0%,transparent_70%)] relative">
                <div className="text-3xl font-display-lg font-light text-[rgba(232,234,246,0.95)]">
                  {formatTime(secondsRemaining)}
                </div>
                <button
                  onClick={() => setIsTimerRunning((prev) => !prev)}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[rgba(232,234,246,0.70)] transition-all"
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-3 h-3" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" /> Resume
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step Instruction */}
            <div className="space-y-3 px-4">
              <h4 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                {currentStep.title}
              </h4>
              <p className="text-sm text-[rgba(232,234,246,0.70)] leading-relaxed max-w-md mx-auto">
                {currentStep.instruction}
              </p>
            </div>

            {/* Step navigation */}
            <div className="pt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <Button variant="primary" onClick={handleNextStep} className="gap-1.5">
                {isLastStep ? (
                  <>
                    Finish Protocol <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next Step <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: POST-SESSION REFLECTION */}
        {stage === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 py-2"
          >
            <div className="text-center space-y-1">
              <h4 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                Protocol Complete
              </h4>
              <p className="text-xs text-[rgba(232,234,246,0.45)]">
                Reflect on your current state to close the feedback loop.
              </p>
            </div>

            {/* Perceived usefulness rating */}
            <div className="space-y-2 p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[rgba(232,234,246,0.60)]">
                How helpful was this reset? (1-5)
              </label>
              <div className="flex items-center justify-between gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setUsefulness(val)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                      usefulness === val
                        ? 'bg-[rgba(192,196,234,0.20)] border-[#c0c4ea] text-[rgba(232,234,246,0.95)] shadow-[0_0_12px_rgba(192,196,234,0.15)]'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.50)] hover:text-white'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        usefulness >= val ? 'fill-[#fbbf24] text-[#fbbf24]' : 'text-zinc-600'
                      }`}
                    />
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Target Dimension Sliders */}
            <div className="space-y-4 p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[rgba(232,234,246,0.60)]">
                Current Felt State
              </div>
              {activeIntervention.targetDimensions.map((dim) => {
                const label = dim.charAt(0).toUpperCase() + dim.slice(1);
                const val = postRatings[dim] ?? 50;
                return (
                  <div key={dim} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[rgba(232,234,246,0.80)] capitalize">{label}</span>
                      <span className="font-mono text-[#c0c4ea] font-semibold">{val} / 100</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={val}
                      onChange={(e) =>
                        setPostRatings((prev) => ({
                          ...prev,
                          [dim]: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full h-1.5 bg-[rgba(255,255,255,0.10)] rounded-lg appearance-none cursor-pointer accent-[#c0c4ea]"
                    />
                  </div>
                );
              })}
            </div>

            {/* Optional notes */}
            <div className="space-y-1.5">
              <label className="text-xs text-[rgba(232,234,246,0.50)]">
                Reflection Note (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief observation (e.g. neck feels looser, breath deeper)..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(232,234,246,0.85)] placeholder-[rgba(232,234,246,0.25)] focus:outline-none focus:border-[#c0c4ea]"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="primary"
                onClick={handleCompleteReflection}
                disabled={isSaving}
                className="w-full justify-center"
              >
                {isSaving ? 'Calculating Shift...' : 'Save & View Outcome'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 4: OUTCOME & DELTA SUMMARY */}
        {stage === 'summary' && completedSession && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 py-2"
          >
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-[rgba(52,211,153,0.15)] text-[#6ee7b7] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                Session Outcome Recorded
              </h4>
              <p className="text-xs text-[rgba(232,234,246,0.45)]">
                Your Personal State and learning model have been updated.
              </p>
            </div>

            {/* Deltas Card */}
            {completedSession.dimensionDeltas && (
              <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-3">
                <span className="text-xs uppercase tracking-wider text-[rgba(232,234,246,0.50)] font-medium">
                  Observed Dimension Shifts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(completedSession.dimensionDeltas).map(([dim, rawDelta]) => {
                    const delta = typeof rawDelta === 'number' ? rawDelta : Number(rawDelta || 0);
                    const isZero = delta === 0;
                    const higherGood = HIGHER_IS_POSITIVE[dim as StateDimensionKey] ?? true;
                    const isFavorable = higherGood ? delta > 0 : delta < 0;
                    return (
                      <div
                        key={dim}
                        className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] flex items-center justify-between"
                      >
                        <span className="text-xs text-[rgba(232,234,246,0.75)] capitalize">
                          {dim}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-xs font-mono font-semibold ${
                            isZero
                              ? 'text-zinc-400'
                              : isFavorable
                              ? 'text-[#6ee7b7]'
                              : 'text-[#f4a8c0]'
                          }`}
                        >
                          {delta < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5" />
                          )}
                          {delta > 0 ? `+${delta}` : delta} pts
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-center text-[rgba(232,234,246,0.50)] italic">
              "Every intentional pause refines your personal wellness intelligence."
            </p>

            <div className="pt-2">
              <Button variant="primary" onClick={onClose} className="w-full justify-center">
                Close & Return to Sanctuary
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
