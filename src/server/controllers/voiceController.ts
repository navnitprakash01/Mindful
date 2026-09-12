/**
 * Voice API Controller
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 *
 * Handles voice observation analysis, crisis screening, acoustic baseline computation,
 * and seamless ingestion into the Personal State Engine pipeline.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { isValidUuid } from '../engine/providers';
import { stateService } from '../services/stateService';
import { SignalExtractor } from '../engine/signalExtractor';
import { computeAcousticBaseline } from '../engine/voiceSignalProvider';
import { screenForCrisis } from '../engine/interventionEngine/safety';

export const voiceController = {
  /**
   * POST /api/voice/analyze
   * Screen transcript for crisis, compute acoustic baseline, derive WellnessSignal,
   * and ingest into the State Engine.
   */
  async analyzeVoice(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const { metrics, transcript, sourceId } = req.body;

      // 1. Validate metrics payload
      if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
        return res.status(400).json({ error: 'Missing or invalid acoustic metrics object' });
      }

      // audioDurationSeconds (required, finite number between 0.1 and 600)
      if (
        typeof metrics.audioDurationSeconds !== 'number' ||
        !Number.isFinite(metrics.audioDurationSeconds) ||
        metrics.audioDurationSeconds < 0.1 ||
        metrics.audioDurationSeconds > 600
      ) {
        return res.status(400).json({ error: 'audioDurationSeconds must be a finite number between 0.1 and 600' });
      }

      // pauseRatio (required, finite number between 0.0 and 1.0)
      if (
        typeof metrics.pauseRatio !== 'number' ||
        !Number.isFinite(metrics.pauseRatio) ||
        metrics.pauseRatio < 0.0 ||
        metrics.pauseRatio > 1.0
      ) {
        return res.status(400).json({ error: 'pauseRatio must be a finite number between 0.0 and 1.0' });
      }

      // pauseCount (required, non-negative finite integer)
      if (
        typeof metrics.pauseCount !== 'number' ||
        !Number.isFinite(metrics.pauseCount) ||
        metrics.pauseCount < 0 ||
        !Number.isInteger(metrics.pauseCount)
      ) {
        return res.status(400).json({ error: 'pauseCount must be a non-negative finite integer' });
      }

      // speechRateWpm (optional, finite number between 10 and 500)
      if (metrics.speechRateWpm !== undefined) {
        if (
          typeof metrics.speechRateWpm !== 'number' ||
          !Number.isFinite(metrics.speechRateWpm) ||
          metrics.speechRateWpm < 10 ||
          metrics.speechRateWpm > 500
        ) {
          return res.status(400).json({ error: 'speechRateWpm must be a finite number between 10 and 500' });
        }
      }

      // speechDurationSeconds (optional, non-negative finite number <= 600)
      if (metrics.speechDurationSeconds !== undefined) {
        if (
          typeof metrics.speechDurationSeconds !== 'number' ||
          !Number.isFinite(metrics.speechDurationSeconds) ||
          metrics.speechDurationSeconds < 0 ||
          metrics.speechDurationSeconds > 600
        ) {
          return res.status(400).json({ error: 'speechDurationSeconds must be a finite number between 0 and 600' });
        }
      }

      // pauseDurationSeconds (optional, non-negative finite number <= 600)
      if (metrics.pauseDurationSeconds !== undefined) {
        if (
          typeof metrics.pauseDurationSeconds !== 'number' ||
          !Number.isFinite(metrics.pauseDurationSeconds) ||
          metrics.pauseDurationSeconds < 0 ||
          metrics.pauseDurationSeconds > 600
        ) {
          return res.status(400).json({ error: 'pauseDurationSeconds must be a finite number between 0 and 600' });
        }
      }

      // vocalEnergy (optional, finite number between 0.0 and 1.0)
      if (metrics.vocalEnergy !== undefined) {
        if (
          typeof metrics.vocalEnergy !== 'number' ||
          !Number.isFinite(metrics.vocalEnergy) ||
          metrics.vocalEnergy < 0.0 ||
          metrics.vocalEnergy > 1.0
        ) {
          return res.status(400).json({ error: 'vocalEnergy must be a finite number between 0.0 and 1.0' });
        }
      }

      // vocalEnergyVariance (optional, finite number between 0.0 and 1.0)
      if (metrics.vocalEnergyVariance !== undefined) {
        if (
          typeof metrics.vocalEnergyVariance !== 'number' ||
          !Number.isFinite(metrics.vocalEnergyVariance) ||
          metrics.vocalEnergyVariance < 0.0 ||
          metrics.vocalEnergyVariance > 1.0
        ) {
          return res.status(400).json({ error: 'vocalEnergyVariance must be a finite number between 0.0 and 1.0' });
        }
      }

      // pitchVariance (optional, non-negative finite number)
      if (metrics.pitchVariance !== undefined) {
        if (
          typeof metrics.pitchVariance !== 'number' ||
          !Number.isFinite(metrics.pitchVariance) ||
          metrics.pitchVariance < 0.0
        ) {
          return res.status(400).json({ error: 'pitchVariance must be a non-negative finite number' });
        }
      }

      // quality (optional, finite number between 0.0 and 1.0)
      if (metrics.quality !== undefined) {
        if (
          typeof metrics.quality !== 'number' ||
          !Number.isFinite(metrics.quality) ||
          metrics.quality < 0.0 ||
          metrics.quality > 1.0
        ) {
          return res.status(400).json({ error: 'quality must be a finite number between 0.0 and 1.0' });
        }
      }

      // confidence (optional, finite number between 0.0 and 1.0)
      if (metrics.confidence !== undefined) {
        if (
          typeof metrics.confidence !== 'number' ||
          !Number.isFinite(metrics.confidence) ||
          metrics.confidence < 0.0 ||
          metrics.confidence > 1.0
        ) {
          return res.status(400).json({ error: 'confidence must be a finite number between 0.0 and 1.0' });
        }
      }

      // 2. Validate and sanitize transcript
      let cleanTranscript: string | undefined = undefined;
      if (typeof transcript === 'string') {
        cleanTranscript = transcript.trim().slice(0, 5000);
      }

      // 3. Mandatory Crisis Screening Gate
      if (cleanTranscript) {
        const crisis = screenForCrisis(cleanTranscript);
        if (crisis.isCrisisDetected) {
          // Immediately halt normal wellness ingestion and return 24/7 crisis lifelines
          return res.status(200).json({
            isCrisisDetected: true,
            matchedTrigger: crisis.matchedTrigger,
            helplineNotice: crisis.helplineNotice,
            observationSummary: 'Immediate support resources available.',
          });
        }
      }

      // 4. Retrieve user's past signals to compute acoustic baseline
      let acousticBaseline = null;
      try {
        const activeSignals = await stateService.getActiveSignals(userId);
        acousticBaseline = computeAcousticBaseline(userId, activeSignals);
      } catch (baseErr) {
        console.warn('[VoiceController] Acoustic baseline fetch notice:', baseErr);
      }

      // 5. Extract standardized WellnessSignal
      const signal = SignalExtractor.fromVoiceObservation({
        userId,
        metrics: {
          audioDurationSeconds: Number(metrics.audioDurationSeconds.toFixed(2)),
          speechDurationSeconds: metrics.speechDurationSeconds !== undefined ? Number(metrics.speechDurationSeconds.toFixed(2)) : undefined,
          pauseCount: Math.round(metrics.pauseCount),
          pauseDurationSeconds: metrics.pauseDurationSeconds !== undefined ? Number(metrics.pauseDurationSeconds.toFixed(2)) : undefined,
          pauseRatio: Number(metrics.pauseRatio.toFixed(2)),
          speechRateWpm: metrics.speechRateWpm !== undefined ? Math.round(metrics.speechRateWpm) : undefined,
          vocalEnergy: metrics.vocalEnergy !== undefined ? Number(metrics.vocalEnergy.toFixed(2)) : undefined,
          vocalEnergyVariance: metrics.vocalEnergyVariance !== undefined ? Number(metrics.vocalEnergyVariance.toFixed(3)) : undefined,
          pitchVariance: metrics.pitchVariance !== undefined ? Number(metrics.pitchVariance.toFixed(2)) : undefined,
          quality: metrics.quality !== undefined ? Number(metrics.quality.toFixed(2)) : undefined,
          confidence: metrics.confidence !== undefined ? Number(metrics.confidence.toFixed(2)) : undefined,
        },
        transcript: cleanTranscript,
        sourceId: typeof sourceId === 'string' && isValidUuid(sourceId) ? sourceId : undefined,
        acousticBaseline,
      });

      // 6. Ingest into existing State Engine
      await stateService.ingestSignal(signal);

      return res.status(201).json({
        success: true,
        signal,
        observationSummary: signal.features?.sentimentSummary,
        acousticBaseline,
      });
    } catch (err: any) {
      console.error('[VoiceController] analyzeVoice error:', err);
      return res.status(500).json({ error: 'Failed to process voice reflection' });
    }
  },

  /**
   * GET /api/voice/baseline
   * Retrieve user's current acoustic baseline statistics
   */
  async getBaseline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const activeSignals = await stateService.getActiveSignals(userId);
      const baseline = computeAcousticBaseline(userId, activeSignals);

      return res.json({ baseline });
    } catch (err: any) {
      console.error('[VoiceController] getBaseline error:', err);
      return res.status(500).json({ error: 'Failed to retrieve acoustic baseline' });
    }
  },
};
