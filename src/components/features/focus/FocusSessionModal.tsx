/**
 * FocusSessionModal Component
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Implements user-controlled deep work focus sessions with real-time non-diagnostic
 * cognitive load & focus clarity feedback, zero keylogging, and seamless integration
 * with the InterventionSelectionEngine.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useFocusSession } from '../../../hooks/useFocusSession';
import { FocusSessionType } from '../../../server/engine/cognitive/types';

interface FocusSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerIntervention?: (interventionId: string) => void;
}

type ModalStage = 'configure' | 'active' | 'summary';

interface PresetOption {
  type: FocusSessionType;
  label: string;
  durationMinutes: number;
  description: string;
}

const PRESETS: PresetOption[] = [
  {
    type: 'pomodoro_25',
    label: '25m Focus Sprint',
    durationMinutes: 25,
    description: 'Brisk single-task sprint aligned with standard ultradian work rhythms.',
  },
  {
    type: 'deep_work_50',
    label: '50m Deep Work',
    durationMinutes: 50,
    description: 'Extended cognitive immersion designed for complex synthesis and flow.',
  },
  {
    type: 'flow_90',
    label: '90m Master Cycle',
    durationMinutes: 90,
    description: 'Full ultradian focus cycle with gradual cognitive strain tracking.',
  },
];

export const FocusSessionModal: React.FC<FocusSessionModalProps> = ({
  isOpen,
  onClose,
  onTriggerIntervention,
}) => {
  const {
    activeSession,
    isActive,
    isPaused,
    elapsedSeconds,
    focusClarity,
    cognitiveLoad,
    recommendationTriggered,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    discardSession,
    isSyncing,
    error,
  } = useFocusSession();

  const [stage, setStage] = useState<ModalStage>('configure');
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(PRESETS[1]);
  const [activityLabel, setActivityLabel] = useState('Deep Work');
  const [completedResult, setCompletedResult] = useState<any>(null);
  const [selfReportStrain, setSelfReportStrain] = useState(50);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await startSession(selectedPreset.type, selectedPreset.durationMinutes, activityLabel);
      setStage('active');
    } catch {
      // Error handled by hook
    }
  };

  const handleComplete = async () => {
    try {
      const result = await completeSession(selfReportStrain);
      setCompletedResult(result);
      setStage('summary');
    } catch {
      // Error handled by hook
    }
  };

  const handleDiscard = async () => {
    await discardSession();
    setStage('configure');
    onClose();
  };

  const handleClose = () => {
    if (isActive) {
      // Keep running in background
      onClose();
    } else {
      setStage('configure');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      maxWidth="max-w-2xl"
      className="p-0 overflow-hidden bg-[#0d0f1a] border border-[rgba(108,114,232,0.25)] text-white shadow-2xl"
    >
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[rgba(108,114,232,0.18)] border border-[rgba(108,114,232,0.30)] flex items-center justify-center text-[#c0c4ea]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {stage === 'configure' && 'Deep Work Focus Session'}
                {stage === 'active' && (activityLabel || 'Deep Work Session')}
                {stage === 'summary' && 'Focus Session Complete'}
              </h2>
              <span className="text-xs text-[rgba(192,196,234,0.60)]">
                Phase 10 — Real-Time Cognitive Monitoring
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-[rgba(192,196,234,0.50)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE 1: CONFIGURE */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === 'configure' && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-[rgba(192,196,234,0.70)] uppercase tracking-wider block mb-2">
                Select Session Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRESETS.map((p) => {
                  const isSelected = selectedPreset.type === p.type;
                  return (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => setSelectedPreset(p)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[rgba(108,114,232,0.20)] border-[#6c72e8] shadow-[0_0_20px_rgba(108,114,232,0.20)]'
                          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white">{p.label}</span>
                        <Clock className="w-4 h-4 text-[#a5b4fc]" />
                      </div>
                      <p className="text-xs text-[rgba(192,196,234,0.50)] leading-relaxed">
                        {p.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[rgba(192,196,234,0.70)] uppercase tracking-wider block mb-2">
                Activity Focus
              </label>
              <input
                type="text"
                value={activityLabel}
                onChange={(e) => setActivityLabel(e.target.value.slice(0, 50))}
                placeholder="e.g., Coding, Synthesis, Writing, Research"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#6c72e8]"
              />
            </div>

            {/* Privacy Badge */}
            <div className="p-4 rounded-2xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.20)] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#34d399] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-[#34d399] block mb-0.5">
                  Zero-Keylogging Privacy Guarantee
                </span>
                <p className="text-xs text-[rgba(192,196,234,0.60)] leading-relaxed">
                  Mindful never records your keystrokes, characters, clipboard, URLs, or screen contents.
                  Telemetry measures only timing intervals between strokes and window transitions to estimate
                  cognitive strain and focus flow.
                </p>
              </div>
            </div>

            <Button
              onClick={handleStart}
              variant="primary"
              size="lg"
              className="w-full py-3.5 bg-gradient-to-r from-[#6c72e8] to-[#818cf8] text-white font-medium text-sm rounded-xl shadow-lg"
              disabled={isSyncing}
            >
              Start Focus Session
            </Button>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE 2: ACTIVE SESSION */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === 'active' && (
          <div className="space-y-6">
            {/* Timer Display */}
            <div className="text-center py-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-3xl">
              <span className="text-xs uppercase tracking-widest text-[rgba(192,196,234,0.50)] block mb-1">
                {isPaused ? 'Session Paused' : 'Active Flow State'}
              </span>
              <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-white mb-2">
                {formatTime(elapsedSeconds)}
              </div>
              <span className="text-xs text-[rgba(192,196,234,0.40)]">
                Target: {selectedPreset.durationMinutes} minutes
              </span>
            </div>

            {/* Cognitive & Focus Meters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[rgba(192,196,234,0.60)]">Focus Clarity</span>
                  <Zap className="w-4 h-4 text-[#818cf8]" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mb-2">
                  {focusClarity}
                  <span className="text-xs text-[rgba(192,196,234,0.40)]">/100</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.08)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#6c72e8] to-[#34d399] h-full transition-all duration-500"
                    style={{ width: `${focusClarity}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[rgba(192,196,234,0.60)]">Cognitive Strain</span>
                  <Activity className="w-4 h-4 text-[#fbbf24]" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mb-2">
                  {cognitiveLoad}
                  <span className="text-xs text-[rgba(192,196,234,0.40)]">/100</span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.08)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      cognitiveLoad >= 65 ? 'bg-[#f59e0b]' : 'bg-[#60a5fa]'
                    }`}
                    style={{ width: `${cognitiveLoad}%` }}
                  />
                </div>
              </div>
            </div>

            {recommendationTriggered && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Cognitive strain is climbing. Consider wrapping up in the next few minutes for an offload reset.
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3">
              {isPaused ? (
                <Button
                  onClick={resumeSession}
                  variant="secondary"
                  size="md"
                  className="flex-1 py-3"
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  onClick={pauseSession}
                  variant="secondary"
                  size="md"
                  className="flex-1 py-3"
                  leftIcon={<Pause className="w-4 h-4" />}
                >
                  Pause
                </Button>
              )}
              <Button
                onClick={handleComplete}
                variant="primary"
                size="md"
                className="flex-1 py-3 bg-[#6c72e8] text-white"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                disabled={isSyncing}
              >
                Complete & Log
              </Button>
              <Button
                onClick={handleDiscard}
                variant="ghost"
                size="md"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-3"
                title="Discard session"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* STAGE 3: SUMMARY */}
        {/* ───────────────────────────────────────────────────────────── */}
        {stage === 'summary' && completedResult && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center text-[#34d399] mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Focus Session Summarized</h3>
              <p className="text-xs text-[rgba(192,196,234,0.50)] mt-1">
                {completedResult.session?.summaryMetrics?.sessionDurationMinutes} minutes of focused work
              </p>
            </div>

            {/* Observational Findings */}
            <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] space-y-3">
              <span className="text-xs font-semibold text-[rgba(192,196,234,0.70)] uppercase tracking-wider block">
                Evidence Summary
              </span>
              <p className="text-sm text-[rgba(232,234,246,0.85)] leading-relaxed">
                {completedResult.signal?.features?.sentimentSummary ||
                  'Deep work focus telemetry recorded and integrated into Personal State.'}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-center">
                <div>
                  <span className="text-[10px] text-[rgba(192,196,234,0.45)] block">Focus Score</span>
                  <span className="text-base font-bold font-mono text-white">
                    {completedResult.signal?.estimates?.focus?.value ?? '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[rgba(192,196,234,0.45)] block">Cognitive Strain</span>
                  <span className="text-base font-bold font-mono text-white">
                    {completedResult.signal?.estimates?.cognitiveLoad?.value ?? '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[rgba(192,196,234,0.45)] block">Post-Fatigue</span>
                  <span className="text-base font-bold font-mono text-white">
                    {completedResult.signal?.estimates?.fatigue?.value ?? '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Suggested Intervention (from InterventionSelectionEngine) */}
            {completedResult.suggestedIntervention && (
              <div className="p-4 rounded-2xl bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.25)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#a5b4fc] block">
                    Recommended Decompression Protocol
                  </span>
                  <span className="text-sm font-bold text-white block mt-0.5">
                    {completedResult.suggestedIntervention.title}
                  </span>
                  <span className="text-xs text-[rgba(192,196,234,0.50)]">
                    {completedResult.suggestedIntervention.durationMinutes} min reset
                  </span>
                </div>
                {onTriggerIntervention && (
                  <Button
                    onClick={() => {
                      onClose();
                      onTriggerIntervention(completedResult.suggestedIntervention.id);
                    }}
                    variant="primary"
                    size="sm"
                    className="bg-[#6c72e8] text-white"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Start Reset
                  </Button>
                )}
              </div>
            )}

            <Button
              onClick={() => {
                setStage('configure');
                onClose();
              }}
              variant="secondary"
              size="md"
              className="w-full py-3"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
