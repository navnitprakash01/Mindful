/**
 * Wearable API Controller
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Implements strict payload size limits, anti-exfiltration guards (no raw waveforms or GPS),
 * schema validation, baseline retrieval, consent settings, and user data purge.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { isValidUuid } from '../engine/providers';
import { wearableService } from '../services/wearableService';
import { WEARABLE_CONFIG, WearableObservation } from '../engine/wearable/types';

// Strict anti-exfiltration patterns: raw sensor waveforms or location tracking are forbidden
const FORBIDDEN_WEARABLE_PATTERNS = [
  /rawWaveform/i,
  /ppgRaw/i,
  /ecgRaw/i,
  /"waveform"/i,
  /latitude/i,
  /longitude/i,
  /gpsCoordinates/i,
  /locationTrack/i,
  /geolocation/i,
];

export const wearableController = {
  /**
   * POST /api/wearable/sync
   * Ingests a validated batch of WearableObservation records into the Personal State pipeline.
   */
  async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      // 1. Anti-exfiltration & Payload Size Check
      const rawBodyStr = JSON.stringify(req.body || {});
      if (rawBodyStr.length > WEARABLE_CONFIG.MAX_PAYLOAD_BYTES) {
        return res.status(400).json({
          error: `Payload exceeds maximum allowable size (${WEARABLE_CONFIG.MAX_PAYLOAD_BYTES / 1024}KB). High-frequency streams or raw files are strictly prohibited.`,
        });
      }

      for (const pattern of FORBIDDEN_WEARABLE_PATTERNS) {
        if (pattern.test(rawBodyStr)) {
          return res.status(400).json({
            error:
              'Forbidden telemetry detected. Raw sensor waveforms (ECG/PPG) and location/GPS tracking are strictly prohibited.',
          });
        }
      }

      const { observations } = req.body;
      if (!observations || !Array.isArray(observations) || observations.length === 0) {
        return res.status(400).json({ error: 'Missing or empty observations array' });
      }

      if (observations.length > 50) {
        return res.status(400).json({ error: 'Batch exceeds maximum allowable limit of 50 observations per sync' });
      }

      // 2. Sanitize Device Metadata (Defend against prompt injection in untrusted device strings)
      for (const obs of observations as WearableObservation[]) {
        if (obs.sourceDevice?.model) {
          obs.sourceDevice.model = obs.sourceDevice.model.replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 40);
        }
      }

      const result = await wearableService.ingestObservations(userId, observations);
      return res.status(201).json({
        success: true,
        processedCount: result.processedCount,
        deduplicatedCount: result.deduplicatedCount,
        signalsCount: result.signals.length,
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to sync wearable observations';
      const statusCode = msg.includes('INVALID') || msg.includes('WEARABLE_DISABLED') ? 400 : 500;
      return res.status(statusCode).json({ error: msg });
    }
  },

  /**
   * GET /api/wearable/baseline
   * Retrieves the current computed wearable physiological baseline.
   */
  async getBaseline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const baseline = await wearableService.getBaseline(userId);
      return res.json({ baseline });
    } catch (err: any) {
      console.error('[WearableController] getBaseline error:', err);
      return res.status(500).json({ error: 'Failed to retrieve wearable baseline' });
    }
  },

  /**
   * GET /api/wearable/settings
   * Retrieves user consent and connection preferences.
   */
  async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const settings = await wearableService.getSettings(userId);
      return res.json({ settings });
    } catch (err: any) {
      console.error('[WearableController] getSettings error:', err);
      return res.status(500).json({ error: 'Failed to fetch wearable settings' });
    }
  },

  /**
   * POST /api/wearable/settings
   * Updates user consent and connection preferences.
   */
  async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const settings = await wearableService.updateSettings(userId, req.body || {});
      return res.json({ success: true, settings });
    } catch (err: any) {
      console.error('[WearableController] updateSettings error:', err);
      return res.status(500).json({ error: 'Failed to update wearable settings' });
    }
  },

  /**
   * DELETE /api/wearable/purge
   * Permanently deletes user's wearable signals ("Disconnect & Delete Wearable History").
   */
  async purge(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const purgedCount = await wearableService.purgeWearableSignals(userId);
      return res.json({ success: true, purgedCount });
    } catch (err: any) {
      console.error('[WearableController] purge error:', err);
      return res.status(500).json({ error: 'Failed to purge wearable signals' });
    }
  },
};
