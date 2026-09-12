/**
 * Camera API Controller
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 *
 * Handles privacy-preserved camera behavioral metric ingestion,
 * behavioral baseline calculation, and seamless integration into
 * the Personal State Engine pipeline.
 *
 * STRICT PRIVACY & ANTI-EXFILTRATION GUARDS:
 * - Prohibits any image or video payloads (rejects data:image, base64, blob, pixels).
 * - Rejects any payload > 25 KB.
 * - Rejects non-finite numbers (NaN, Infinity).
 * - Enforces minimum session duration (>= 30s) and quality thresholds.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { isValidUuid } from '../engine/providers';
import { stateService } from '../services/stateService';
import { SignalExtractor } from '../engine/signalExtractor';
import { computeCameraBaseline } from '../engine/cameraSignalProvider';

const MAX_PAYLOAD_BYTES = 25 * 1024; // 25 KB max payload limit
const FORBIDDEN_IMAGE_PATTERNS = [
  /data:image/i,
  /base64/i,
  /blob:/i,
  /"frameData"/i,
  /"pixels"/i,
  /"imageData"/i,
  /image\/(jpeg|png|webp|gif)/i,
];

export const cameraController = {
  /**
   * POST /api/camera/analyze
   * Validates client metrics, screens anti-exfiltration guards,
   * computes behavioral baseline, extracts WellnessSignal, and ingests into StateEngine.
   */
  async analyzeCamera(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      // 1. Anti-exfiltration & Payload Size Check
      const rawBodyStr = JSON.stringify(req.body || {});
      if (rawBodyStr.length > MAX_PAYLOAD_BYTES) {
        return res.status(400).json({
          error: 'Payload exceeds maximum allowable size (25KB). Video or image data must not be sent to the server.',
        });
      }

      for (const pattern of FORBIDDEN_IMAGE_PATTERNS) {
        if (pattern.test(rawBodyStr)) {
          return res.status(400).json({
            error:
              'Raw image, frame, or video transmission is strictly prohibited. Camera analysis must be performed entirely on-device.',
          });
        }
      }

      // PAYLOAD SCHEMA CONTRACT:
      // Only 'metrics' and 'sourceId' are consumed from req.body.
      // All other top-level fields are intentionally ignored (not forwarded, not stored).
      // This is by design: destructuring only named keys prevents unknown/extra fields
      // from ever reaching signal construction or the StateEngine.
      const { metrics, sourceId } = req.body;

      // 2. Validate metrics container
      if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
        return res.status(400).json({ error: 'Missing or invalid behavioral metrics object' });
      }

      // sessionDurationSeconds (required, finite number between 30 and 300)
      if (
        typeof metrics.sessionDurationSeconds !== 'number' ||
        !Number.isFinite(metrics.sessionDurationSeconds) ||
        metrics.sessionDurationSeconds < 30 ||
        metrics.sessionDurationSeconds > 300
      ) {
        return res.status(400).json({
          error: 'sessionDurationSeconds must be a finite number between 30 and 300 seconds',
        });
      }

      // facePresenceRatio (required, finite number between 0.0 and 1.0)
      if (
        typeof metrics.facePresenceRatio !== 'number' ||
        !Number.isFinite(metrics.facePresenceRatio) ||
        metrics.facePresenceRatio < 0.0 ||
        metrics.facePresenceRatio > 1.0
      ) {
        return res.status(400).json({
          error: 'facePresenceRatio must be a finite number between 0.0 and 1.0',
        });
      }

      // Minimum face presence ratio threshold: 0.80
      if (metrics.facePresenceRatio < 0.80) {
        return res.status(400).json({
          error: 'Insufficient face presence for reliable behavioral analysis (minimum 0.80 required)',
        });
      }

      // multipleFacesDetected (required, boolean)
      if (typeof metrics.multipleFacesDetected !== 'boolean') {
        return res.status(400).json({
          error: 'multipleFacesDetected must be a boolean flag',
        });
      }

      if (metrics.multipleFacesDetected === true) {
        return res.status(400).json({
          error: 'Multiple faces detected. Camera behavioral analysis requires a single user in frame',
        });
      }

      // trackingQuality (required, finite number between 0.0 and 1.0)
      if (
        typeof metrics.trackingQuality !== 'number' ||
        !Number.isFinite(metrics.trackingQuality) ||
        metrics.trackingQuality < 0.0 ||
        metrics.trackingQuality > 1.0
      ) {
        return res.status(400).json({
          error: 'trackingQuality must be a finite number between 0.0 and 1.0',
        });
      }

      // Minimum tracking quality threshold: 0.40
      if (metrics.trackingQuality < 0.40) {
        return res.status(400).json({
          error: 'Tracking quality below minimum threshold (0.40). Ensure adequate lighting and camera stability',
        });
      }

      // headMovementVelocity (required, non-negative finite number <= 100)
      if (
        typeof metrics.headMovementVelocity !== 'number' ||
        !Number.isFinite(metrics.headMovementVelocity) ||
        metrics.headMovementVelocity < 0.0 ||
        metrics.headMovementVelocity > 100.0
      ) {
        return res.status(400).json({
          error: 'headMovementVelocity must be a non-negative finite number between 0.0 and 100.0',
        });
      }

      // headPoseVariance (required, non-negative finite number <= 500)
      if (
        typeof metrics.headPoseVariance !== 'number' ||
        !Number.isFinite(metrics.headPoseVariance) ||
        metrics.headPoseVariance < 0.0 ||
        metrics.headPoseVariance > 500.0
      ) {
        return res.status(400).json({
          error: 'headPoseVariance must be a non-negative finite number between 0.0 and 500.0',
        });
      }

      // facialActivityIndex (required, finite number between 0.0 and 1.0)
      if (
        typeof metrics.facialActivityIndex !== 'number' ||
        !Number.isFinite(metrics.facialActivityIndex) ||
        metrics.facialActivityIndex < 0.0 ||
        metrics.facialActivityIndex > 1.0
      ) {
        return res.status(400).json({
          error: 'facialActivityIndex must be a finite number between 0.0 and 1.0',
        });
      }

      // blinkRatePerMinute (required, non-negative finite number <= 120)
      if (
        typeof metrics.blinkRatePerMinute !== 'number' ||
        !Number.isFinite(metrics.blinkRatePerMinute) ||
        metrics.blinkRatePerMinute < 0.0 ||
        metrics.blinkRatePerMinute > 120.0
      ) {
        return res.status(400).json({
          error: 'blinkRatePerMinute must be a non-negative finite number between 0.0 and 120.0',
        });
      }

      // confidence (optional, finite number between 0.0 and 1.0)
      if (metrics.confidence !== undefined) {
        if (
          typeof metrics.confidence !== 'number' ||
          !Number.isFinite(metrics.confidence) ||
          metrics.confidence < 0.0 ||
          metrics.confidence > 1.0
        ) {
          return res.status(400).json({
            error: 'confidence must be a finite number between 0.0 and 1.0',
          });
        }
      }

      // 3. Retrieve user's historical signals to compute baseline
      let cameraBaseline = null;
      try {
        const activeSignals = await stateService.getActiveSignals(userId);
        cameraBaseline = computeCameraBaseline(userId, activeSignals);
      } catch (baseErr) {
        console.warn('[CameraController] Camera baseline fetch notice:', baseErr);
      }

      // 4. Extract standardized WellnessSignal
      const signal = SignalExtractor.fromCameraObservation({
        userId,
        metrics: {
          sessionDurationSeconds: Number(metrics.sessionDurationSeconds.toFixed(1)),
          facePresenceRatio: Number(metrics.facePresenceRatio.toFixed(2)),
          multipleFacesDetected: false,
          trackingQuality: Number(metrics.trackingQuality.toFixed(2)),
          headMovementVelocity: Number(metrics.headMovementVelocity.toFixed(2)),
          headPoseVariance: Number(metrics.headPoseVariance.toFixed(2)),
          facialActivityIndex: Number(metrics.facialActivityIndex.toFixed(2)),
          blinkRatePerMinute: Number(metrics.blinkRatePerMinute.toFixed(1)),
          confidence: metrics.confidence !== undefined ? Number(metrics.confidence.toFixed(2)) : undefined,
        },
        sourceId: typeof sourceId === 'string' && isValidUuid(sourceId) ? sourceId : undefined,
        cameraBaseline,
      });

      // 5. Ingest into StateEngine
      await stateService.ingestSignal(signal);

      return res.status(201).json({
        success: true,
        signal,
        observationSummary: signal.features?.sentimentSummary,
        cameraBaseline,
      });
    } catch (err: any) {
      console.error('[CameraController] analyzeCamera error:', err);
      return res.status(500).json({ error: 'Failed to process camera behavioral reflection' });
    }
  },

  /**
   * GET /api/camera/baseline
   * Retrieve user's current behavioral baseline statistics
   */
  async getBaseline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const activeSignals = await stateService.getActiveSignals(userId);
      const baseline = computeCameraBaseline(userId, activeSignals);

      return res.json({ baseline });
    } catch (err: any) {
      console.error('[CameraController] getBaseline error:', err);
      return res.status(500).json({ error: 'Failed to retrieve camera behavioral baseline' });
    }
  },
};
