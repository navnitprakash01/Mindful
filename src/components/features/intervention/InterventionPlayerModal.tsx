/**
 * InterventionPlayerModal Component
 * Mindful 3.0 — Somatic Reset & Biofeedback Runner
 *
 * Implements the responsive, non-clipping interactive protocol runner:
 * 1. Protocol Preview & Intent
 * 2. Pre-Session Camera Preparation / Consent Flow (Simplified User-Facing Copy)
 * 3. Step-by-Step Guided Runner with Adaptive Somatic Pacer or Standard Timer
 * 4. Post-Session Reflective Check-In (Usefulness & Dimension Sliders)
 * 5. Outcome & Mathematical Delta Summary
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Video,
  VideoOff,
  ShieldCheck,
  X,
  Activity,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import {
  InterventionDefinition,
  InterventionSession,
  StateDimensionKey,
} from '../../../types';
import { useIntervention } from '../../../context/InterventionContext';
import { usePersonalState } from '../../../context/StateContext';
import { useAuth } from '../../../context/AuthContext';
import { useBiofeedbackSession } from '../../../hooks/useBiofeedbackSession';
import { SomaticPacerVisual } from './SomaticPacerVisual';
import { isStepPacingCompatible } from '../../../types/biofeedback';

interface InterventionPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention?: InterventionDefinition | null;
}

type PlayerStage = 'preview' | 'consent' | 'active' | 'reflection' | 'summary';

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
  const { getAccessToken } = useAuth();
  const [completedSession, setCompletedSession] = useState<InterventionSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [isAdopted, setIsAdopted] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [biofeedbackOptIn, setBiofeedbackOptIn] = useState<boolean>(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);

  // Somatic Biofeedback Session Hook
  const biofeedback = useBiofeedbackSession({
    baseCycleSeconds: 8.0,
    inhaleSeconds: 4.0,
    holdInSeconds: activeIntervention?.id === 'breathing-reset' ? 4.0 : 0.0,
    exhaleSeconds: activeIntervention?.id === 'sleep-winddown' ? 7.0 : 4.0,
    holdOutSeconds: activeIntervention?.id === 'breathing-reset' ? 4.0 : 0.0,
    enabled: biofeedbackOptIn,
  });

  // Handle keyboard ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Reset when modal opens or intervention changes
  useEffect(() => {
    if (isOpen) {
      setStage('preview');
      setCurrentStepIndex(0);
      setActiveSession(null);
      setCompletedSession(null);
      setIsTimerRunning(false);
      setIsAdopted(false);
      setAdoptError(null);
      setBiofeedbackOptIn(false);
      setCameraNotice(null);
      biofeedback.stopBiofeedback();
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
    } else {
      biofeedback.stopBiofeedback();
      if (timerRef.current) clearTimeout(timerRef.current);
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

  const handleSafeClose = useCallback(() => {
    biofeedback.stopBiofeedback();
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  }, [biofeedback, onClose]);

  if (!isOpen || !activeIntervention) {
    return null;
  }

  const currentStep = activeIntervention.steps[currentStepIndex];
  const isLastStep = currentStepIndex >= activeIntervention.steps.length - 1;

  // Start with camera choice
  const handleStartWithCameraChoice = async (enableCamera: boolean) => {
    setIsSaving(true);
    setCameraNotice(null);
    setBiofeedbackOptIn(enableCamera);
    try {
      const session = await startSession(activeIntervention.id);
      setActiveSession(session);
      setStage('active');
      setCurrentStepIndex(0);

      if (enableCamera) {
        try {
          await biofeedback.startBiofeedback();
        } catch {
          setCameraNotice('Camera access was not granted. Continuing with standard guided steps.');
          setBiofeedbackOptIn(false);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCameraMidSession = () => {
    if (biofeedbackOptIn) {
      biofeedback.stopBiofeedback();
      setBiofeedbackOptIn(false);
      setCameraNotice('Camera turned off. Using standard visual pacer.');
    } else {
      setBiofeedbackOptIn(true);
      biofeedback.startBiofeedback().catch(() => {
        setCameraNotice('Camera access was not granted. Continuing with standard guided steps.');
        setBiofeedbackOptIn(false);
      });
    }
  };

  const handleNextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setStage('reflection');
      biofeedback.stopBiofeedback();
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
        biofeedbackSummary: biofeedback.summary.biofeedbackAssisted ? biofeedback.summary : undefined,
      });

      if (finished) {
        setCompletedSession(finished);
        setStage('summary');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdoptAsRitual = async () => {
    if (!activeIntervention) return;
    setIsAdopting(true);
    setAdoptError(null);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/habits/adopt-intervention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          interventionId: activeIntervention.id,
          targetFrequency: 7,
        }),
      });
      if (res.ok) {
        setIsAdopted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setAdoptError(data.error || 'Failed to adopt ritual');
      }
    } catch (err: unknown) {
      setAdoptError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsAdopting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const modalElement = (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center pt-24 sm:pt-24 pb-20 sm:pb-8 px-3 sm:px-4 md:px-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSafeClose}
        className="fixed inset-0 bg-[rgba(13,15,26,0.75)] backdrop-blur-[16px]"
      />

      {/* Modal Dialog Container: strictly bounded to viewport below navbar */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-runner-title"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-xl max-h-[calc(100dvh-11rem)] sm:max-h-[calc(100dvh-8rem)] flex flex-col bg-[rgba(18,20,32,0.97)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.10)] rounded-[28px] sm:rounded-[36px] shadow-[0_24px_80px_rgba(0,0,0,0.80)] overflow-hidden z-10"
      >
        {/* ── STICKY TOP HEADER ── */}
        <div className="shrink-0 px-6 py-4 sm:px-8 sm:py-5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(13,15,26,0.50)] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#6ee7b7]">
                {stage === 'active'
                  ? `Step ${currentStepIndex + 1} of ${activeIntervention.steps.length}`
                  : activeIntervention.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[rgba(232,234,246,0.50)]">
                <Clock className="w-3 h-3" />
                {activeIntervention.durationMinutes}m
              </span>
            </div>
            <h2
              id="modal-runner-title"
              className="font-display-lg text-lg sm:text-2xl text-[rgba(232,234,246,0.95)] truncate tracking-tight"
            >
              {stage === 'consent'
                ? 'Session Preparation'
                : stage === 'reflection'
                ? 'Post-Reset Reflection'
                : stage === 'summary'
                ? 'Outcome Recorded'
                : activeIntervention.title}
            </h2>
          </div>

          <button
            onClick={handleSafeClose}
            aria-label="Close session runner"
            className="shrink-0 p-2 text-[rgba(232,234,246,0.40)] hover:text-white rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY CONTENT (Single scroll container) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-6 min-h-0">
          <AnimatePresence mode="wait">
            {/* STAGE 1: PROTOCOL PREVIEW */}
            {stage === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                {/* Meta Badges */}
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
                <p className="text-sm text-[rgba(232,234,246,0.75)] leading-relaxed">
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
                        <li key={i} className="text-xs text-[rgba(232,234,246,0.65)] flex items-start gap-2">
                          <span className="text-[#6ee7b7] mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps Outline */}
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[rgba(232,234,246,0.45)] font-semibold">
                    Protocol Steps ({activeIntervention.steps.length})
                  </span>
                  <div className="space-y-2">
                    {activeIntervention.steps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                      >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-[rgba(192,196,234,0.15)] text-[#c0c4ea] shrink-0">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[rgba(232,234,246,0.90)]">
                            {step.title}
                          </div>
                          <div className="text-[11px] text-[rgba(232,234,246,0.50)] truncate mt-0.5">
                            {step.instruction}
                          </div>
                        </div>
                        {step.durationSeconds && (
                          <span className="text-[11px] text-[rgba(232,234,246,0.35)] shrink-0 font-mono">
                            {step.durationSeconds}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety notice */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.15)] text-xs text-[rgba(251,191,36,0.85)] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{activeIntervention.safetyNotes}</span>
                </div>
              </motion.div>
            )}

            {/* STAGE 2: PRE-SESSION CAMERA PREPARATION / CONSENT FLOW */}
            {stage === 'consent' && (
              <motion.div
                key="consent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                    How do you want to do this?
                  </h3>
                  <p className="text-xs text-[rgba(192,196,234,0.70)] mt-1">
                    Choose how you would like to follow this reset.
                  </p>
                </div>

                {/* Two Clear Choices */}
                <div className="grid grid-cols-1 gap-3">
                  {/* OPTION 1: Standard */}
                  <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[rgba(232,234,246,0.95)]">
                          Standard
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(232,234,246,0.65)] leading-relaxed">
                        Follow the guided steps and timer. No camera needed.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartWithCameraChoice(false)}
                      disabled={isSaving}
                      className="shrink-0"
                    >
                      Start Standard
                    </Button>
                  </div>

                  {/* OPTION 2: With camera feedback */}
                  <div className="p-4 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[rgba(232,234,246,0.95)]">
                          With camera feedback
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#6ee7b7]/15 text-[#6ee7b7] border border-[#6ee7b7]/25">
                          Optional
                        </span>
                      </div>
                      <p className="text-xs text-[rgba(192,196,234,0.75)] leading-relaxed">
                        Let Mindful use your camera on this device to adjust the pace based on simple movement. Nothing is recorded or uploaded.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartWithCameraChoice(true)}
                      disabled={isSaving}
                      className="shrink-0"
                    >
                      Enable Camera
                    </Button>
                  </div>
                </div>

                {/* Small privacy explanation */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-[11px] text-[rgba(232,234,246,0.50)] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#6ee7b7] shrink-0 mt-0.5" />
                  <span>
                    Camera use is optional. Processing stays on your device. No video is recorded or uploaded.
                  </span>
                </div>
              </motion.div>
            )}

            {/* STAGE 3: ACTIVE GUIDED RUNNER */}
            {stage === 'active' && currentStep && (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6 text-center py-2"
              >
                {/* Off-screen hidden video for client-side processing */}
                <video ref={biofeedback.videoRef as any} style={{ display: 'none' }} playsInline muted />

                {/* Camera Notice if fallback happened */}
                {cameraNotice && (
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(232,234,246,0.70)]">
                    {cameraNotice}
                  </div>
                )}

                {/* In-Session Camera Control Pill */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-xs text-[rgba(232,234,246,0.50)]">
                    <span className="font-mono">
                      Step {currentStepIndex + 1} of {activeIntervention.steps.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleCameraMidSession}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.75)] hover:text-white transition-all cursor-pointer"
                  >
                    {biofeedbackOptIn ? (
                      <>
                        <VideoOff className="w-3.5 h-3.5 text-[#f4a8c0]" />
                        <span>Turn Off Camera</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5 text-[#818cf8]" />
                        <span>Turn On Camera</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Somatic Pacer Visual or Standard Circular Timer */}
                {biofeedbackOptIn && isStepPacingCompatible(currentStep.title, currentStep.instruction, activeIntervention.category) ? (
                  <SomaticPacerVisual
                    pacingState={biofeedback.pacingState}
                    status={biofeedback.status}
                    metrics={biofeedback.metrics}
                    secondsRemaining={secondsRemaining}
                    onDisableBiofeedback={handleToggleCameraMidSession}
                    formatTime={formatTime}
                  />
                ) : (
                  <div className="relative flex items-center justify-center my-4">
                    <div className="w-40 h-40 rounded-full border border-[rgba(192,196,234,0.20)] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(192,196,234,0.10)_0%,transparent_70%)] relative">
                      <div className="text-3xl font-display-lg font-light text-[rgba(232,234,246,0.95)]">
                        {formatTime(secondsRemaining)}
                      </div>
                      <button
                        onClick={() => setIsTimerRunning((prev) => !prev)}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[rgba(232,234,246,0.70)] transition-all cursor-pointer"
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
                )}

                {/* Step Instruction */}
                <div className="space-y-2 px-2">
                  <h3 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm text-[rgba(232,234,246,0.75)] leading-relaxed max-w-md mx-auto">
                    {currentStep.instruction}
                  </p>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: POST-SESSION REFLECTION */}
            {stage === 'reflection' && (
              <motion.div
                key="reflection"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6 py-1"
              >
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[rgba(52,211,153,0.15)] text-[#6ee7b7] flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                    Protocol Complete
                  </h3>
                  <p className="text-xs text-[rgba(232,234,246,0.50)]">
                    Reflect on your current state to close the feedback loop and calibrate your intelligence.
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
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
              </motion.div>
            )}

            {/* STAGE 5: OUTCOME & DELTA SUMMARY */}
            {stage === 'summary' && completedSession && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6 py-1"
              >
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-[rgba(52,211,153,0.15)] text-[#6ee7b7] flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display-md text-[rgba(232,234,246,0.95)]">
                    Session Outcome Recorded
                  </h3>
                  <p className="text-xs text-[rgba(232,234,246,0.50)]">
                    Your Personal State and learning model have been calibrated.
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

                {/* Adopt as Daily Ritual Recommendation */}
                {(() => {
                  const hasFavorableDelta = completedSession.dimensionDeltas
                    ? Object.entries(completedSession.dimensionDeltas).some(([dim, rawDelta]) => {
                        const delta = typeof rawDelta === 'number' ? rawDelta : Number(rawDelta || 0);
                        const higherGood = HIGHER_IS_POSITIVE[dim as StateDimensionKey] ?? true;
                        return higherGood ? delta > 0 : delta < 0;
                      })
                    : false;
                  const canAdopt = usefulness >= 4 || hasFavorableDelta;
                  if (!canAdopt) return null;

                  return (
                    <div className="p-4 rounded-2xl bg-[rgba(192,196,234,0.06)] border border-[rgba(192,196,234,0.18)] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-medium text-[rgba(232,234,246,0.95)]">
                            Turn this practice into a daily rhythm?
                          </h4>
                          <p className="text-xs text-[rgba(232,234,246,0.60)]">
                            Reinforce this reset by adding it to your daily rituals.
                          </p>
                        </div>
                        <Button
                          variant={isAdopted ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={handleAdoptAsRitual}
                          disabled={isAdopting || isAdopted}
                          className={isAdopted ? 'text-[#6ee7b7] border-[#6ee7b7]/30' : ''}
                        >
                          {isAdopted ? (
                            <span className="flex items-center gap-1.5 text-xs text-[#6ee7b7]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ritual Adopted
                            </span>
                          ) : isAdopting ? (
                            'Adopting...'
                          ) : (
                            'Adopt as Ritual'
                          )}
                        </Button>
                      </div>
                      {adoptError && (
                        <p className="text-xs text-rose-400 mt-1">{adoptError}</p>
                      )}
                    </div>
                  );
                })()}

                <p className="text-xs text-center text-[rgba(232,234,246,0.45)] italic">
                  "Every intentional pause refines your personal wellness intelligence."
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── STICKY BOTTOM FOOTER CONTROLS ── */}
        <div className="shrink-0 px-6 py-4 sm:px-8 sm:py-4 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(13,15,26,0.60)] flex items-center justify-between gap-3">
          {stage === 'preview' && (
            <>
              <Button variant="ghost" onClick={handleSafeClose}>
                Maybe Later
              </Button>
              <Button
                variant="primary"
                onClick={() => setStage('consent')}
                disabled={isSaving}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Begin Protocol
              </Button>
            </>
          )}

          {stage === 'consent' && (
            <>
              <Button variant="ghost" onClick={() => setStage('preview')}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStartWithCameraChoice(false)}
                  disabled={isSaving}
                >
                  Start Standard
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleStartWithCameraChoice(true)}
                  disabled={isSaving}
                >
                  Enable Camera
                </Button>
              </div>
            </>
          )}

          {stage === 'active' && (
            <>
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
            </>
          )}

          {stage === 'reflection' && (
            <>
              <Button variant="ghost" onClick={handleSafeClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCompleteReflection}
                disabled={isSaving}
                className="flex-1 justify-center sm:flex-initial"
              >
                {isSaving ? 'Calculating Shift...' : 'Save & View Outcome'}
              </Button>
            </>
          )}

          {stage === 'summary' && (
            <Button variant="primary" onClick={handleSafeClose} className="w-full justify-center">
              Close & Return to Sanctuary
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }

  return modalElement;
};
