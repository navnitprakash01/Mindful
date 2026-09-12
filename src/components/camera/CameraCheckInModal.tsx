/**
 * Camera Check-In Modal
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 *
 * Provides a privacy-preserving, consent-driven 30-second camera check-in experience.
 *
 * PRIVACY GUARANTEES:
 * - 100% On-device client extraction.
 * - ZERO video, frames, images, or biometric embeddings are transmitted or saved.
 * - Immediate hardware teardown when closed, cancelled, or finished.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Activity,
  X,
} from 'lucide-react';
import {
  CameraBehavioralAnalyzer,
  validateCameraSession,
} from '../../lib/camera/cameraAnalyzer';
import { CameraBehavioralMetrics } from '../../server/engine/cameraSignalProvider';

interface CameraCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (summary: string) => void;
}

export const CameraCheckInModal: React.FC<CameraCheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [sessionState, setSessionState] = useState<'idle' | 'recording' | 'submitting' | 'complete' | 'error'>('idle');
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [targetSeconds] = useState(30);
  const [qualityScore, setQualityScore] = useState(1.0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [observationSummary, setObservationSummary] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analyzerRef = useRef<CameraBehavioralAnalyzer | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleTeardown();
      setSessionState('idle');
      setProgressSeconds(0);
      setErrorMessage(null);
      setObservationSummary(null);
    }
    return () => {
      handleTeardown();
    };
  }, [isOpen]);

  const handleTeardown = () => {
    if (analyzerRef.current) {
      analyzerRef.current.cancelSession();
      analyzerRef.current = null;
    }
  };

  const startCheckIn = async () => {
    if (!videoRef.current) return;
    setErrorMessage(null);
    setSessionState('recording');
    setProgressSeconds(0);

    const analyzer = new CameraBehavioralAnalyzer({
      onProgress: (current, target) => {
        setProgressSeconds(Math.round(current));
      },
      onQualityUpdate: (quality, detected) => {
        setQualityScore(quality);
        setFaceDetected(detected);
      },
      onError: (err) => {
        console.error('[CameraCheckInModal] Analyzer error:', err);
        setErrorMessage(err.message || 'Camera access error. Please check permissions.');
        setSessionState('error');
        handleTeardown();
      },
      onComplete: async (metrics: CameraBehavioralMetrics) => {
        await handleSubmitMetrics(metrics);
      },
    });

    analyzerRef.current = analyzer;

    try {
      await analyzer.startSession(videoRef.current, targetSeconds);
    } catch (err: any) {
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : err.message || 'Failed to initialize camera.'
      );
      setSessionState('error');
      handleTeardown();
    }
  };

  const handleSubmitMetrics = async (metrics: CameraBehavioralMetrics) => {
    const validation = validateCameraSession(metrics);
    if (!validation.valid) {
      setErrorMessage(validation.reason || 'Session quality insufficient for reliable behavioral baseline.');
      setSessionState('error');
      return;
    }

    setSessionState('submitting');

    try {
      const token = localStorage.getItem('mindful_token') || sessionStorage.getItem('mindful_token');
      const response = await fetch('/api/camera/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ metrics }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const summary = data.observationSummary || 'Camera behavioral reflection successfully integrated.';
      setObservationSummary(summary);
      setSessionState('complete');
      onSuccess?.(summary);
    } catch (submitErr: any) {
      console.error('[CameraCheckInModal] Ingestion error:', submitErr);
      setErrorMessage(submitErr.message || 'Failed to submit behavioral observation.');
      setSessionState('error');
    }
  };

  const handleClose = () => {
    handleTeardown();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Camera Behavioral Check-In"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Privacy Disclosure Header */}
        <div className="flex items-start gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <span className="font-semibold block text-emerald-800 dark:text-emerald-300">
              100% On-Device Privacy Guarantee
            </span>
            No video frames or images ever leave your device or are stored. Only minimal numeric behavioral measurements — head movement velocity, posture stability, blink cadence — are processed locally on your device and transmitted as scalars.
          </div>
        </div>

        {/* Video / Preview Viewport */}
        <div className="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700/50 shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${sessionState === 'recording' ? 'block' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {sessionState === 'idle' && (
            <div className="text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-indigo-400">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-200">
                30-Second Physical Baseline Check-In
              </div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Sit naturally facing your camera. Mindful measures movement rhythm and blink dynamics to provide objective evidence of fatigue or focus.
              </p>
            </div>
          )}

          {sessionState === 'submitting' && (
            <div className="text-center p-6 space-y-3">
              <Activity className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <div className="text-sm font-medium text-slate-200">
                Synthesizing Behavioral Metrics...
              </div>
              <p className="text-xs text-slate-400">
                Integrating observation into Personal State Engine
              </p>
            </div>
          )}

          {sessionState === 'complete' && (
            <div className="text-center p-6 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-medium text-slate-200">
                Observation Complete
              </div>
              <p className="text-xs text-emerald-300 max-w-sm mx-auto leading-relaxed">
                {observationSummary}
              </p>
            </div>
          )}

          {sessionState === 'error' && (
            <div className="text-center p-6 space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="text-sm font-medium text-slate-200">
                Check-In Incomplete
              </div>
              <p className="text-xs text-rose-300 max-w-sm mx-auto leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Active Overlay Status */}
          {sessionState === 'recording' && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <Badge
                  variant={faceDetected ? 'success' : 'warning'}
                  className="backdrop-blur-md bg-slate-900/80 text-xs px-2 py-0.5"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {faceDetected ? 'Face In Frame' : 'Align Face In Frame'}
                </Badge>
                <Badge
                  variant={qualityScore >= 0.5 ? 'secondary' : 'warning'}
                  className="backdrop-blur-md bg-slate-900/80 text-xs px-2 py-0.5"
                >
                  Quality: {Math.round(qualityScore * 100)}%
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 backdrop-blur-md bg-slate-900/80 text-slate-200 text-xs px-2.5 py-1 rounded-full border border-slate-700">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{progressSeconds}s / {targetSeconds}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar (during recording) */}
        {sessionState === 'recording' && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${(progressSeconds / targetSeconds) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Remain natural and attentive</span>
              <span>{Math.max(0, targetSeconds - progressSeconds)}s remaining</span>
            </div>
          </div>
        )}

        {/* Controls Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          {sessionState === 'idle' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={startCheckIn}>
                Start 30-Second Check-In
              </Button>
            </>
          )}

          {sessionState === 'recording' && (
            <Button variant="danger" onClick={handleClose}>
              <X className="w-4 h-4 mr-1.5" />
              Cancel Check-In
            </Button>
          )}

          {sessionState === 'complete' && (
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          )}

          {sessionState === 'error' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary" onClick={startCheckIn}>
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
