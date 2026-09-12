/**
 * Camera Integration & End-to-End Pipeline Tests
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cameraController } from '../src/server/controllers/cameraController';
import { stateService } from '../src/server/services/stateService';
import { AuthenticatedRequest } from '../src/server/middleware/auth';
import { MultimodalFusionEngine } from '../src/server/engine/fusion/fusionEngine';
import { StateEngine } from '../src/server/engine/stateEngine';
import { SignalExtractor } from '../src/server/engine/signalExtractor';

process.env.NODE_ENV = 'test';

function createMockReqRes(user: { id: string } | null, body: any = {}, query: any = {}) {
  const req = {
    user,
    body,
    query,
  } as unknown as AuthenticatedRequest;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

describe('Camera Integration & Intelligence Pipeline Tests', () => {
  const baseValidMetrics = {
    sessionDurationSeconds: 35,
    facePresenceRatio: 0.95,
    multipleFacesDetected: false,
    trackingQuality: 0.85,
    headMovementVelocity: 12.0,
    headPoseVariance: 15.0,
    facialActivityIndex: 0.30,
    blinkRatePerMinute: 18.0,
  };

  it('rejects unauthorized or invalid UUID user session with 401', async () => {
    // Missing user
    const { req: req1, res: res1 } = createMockReqRes(null, { metrics: baseValidMetrics });
    await cameraController.analyzeCamera(req1, res1 as any);
    assert.strictEqual(res1.getStatusCode(), 401);
    assert.match(res1.getData().error, /Unauthorized/);

    // Invalid UUID
    const { req: req2, res: res2 } = createMockReqRes({ id: 'invalid-user-uuid' }, { metrics: baseValidMetrics });
    await cameraController.analyzeCamera(req2, res2 as any);
    assert.strictEqual(res2.getStatusCode(), 401);
    assert.match(res2.getData().error, /Unauthorized/);
  });

  describe('Anti-Exfiltration & Payload Inspection Guard', () => {
    const userId = randomUUID();

    it('rejects payloads exceeding 25 KB with 400', async () => {
      const hugeData = 'A'.repeat(26 * 1024);
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: baseValidMetrics,
        extraPadding: hugeData,
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /25KB/);
    });

    it('rejects payloads containing data:image URI strings with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: baseValidMetrics,
        imageSnippet: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Raw image, frame, or video transmission is strictly prohibited/);
    });

    it('rejects payloads containing base64 string markers with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: baseValidMetrics,
        frameEncoding: 'base64',
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Raw image, frame, or video transmission is strictly prohibited/);
    });

    it('rejects payloads containing blob: URLs with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: baseValidMetrics,
        videoBlob: 'blob:http://localhost:3000/1234-5678',
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Raw image, frame, or video transmission is strictly prohibited/);
    });
  });

  describe('Non-Finite Numeric Input Sanitization & Quality Gating', () => {
    const userId = randomUUID();

    it('rejects NaN sessionDurationSeconds with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, sessionDurationSeconds: NaN },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
    });

    it('rejects duration < 30 seconds with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, sessionDurationSeconds: 25 },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /between 30 and 300 seconds/);
    });

    it('rejects facePresenceRatio < 0.80 with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, facePresenceRatio: 0.65 },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /minimum 0.80 required/);
    });

    it('rejects multipleFacesDetected === true with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, multipleFacesDetected: true },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Multiple faces detected/);
    });

    it('rejects trackingQuality < 0.40 with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, trackingQuality: 0.30 },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /below minimum threshold/);
    });

    it('rejects NaN headMovementVelocity with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, headMovementVelocity: NaN },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
    });

    it('rejects negative headPoseVariance with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, headPoseVariance: -5.0 },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
    });

    it('rejects Infinity blinkRatePerMinute with 400', async () => {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, blinkRatePerMinute: Infinity },
      });
      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
    });
  });

  describe('End-to-End Pipeline & State Engine Ingestion', () => {
    it('processes valid camera behavioral reflection, ingests signal, and recalculates state', async () => {
      const userId = randomUUID();
      const { req, res } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });

      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 201);

      const data = res.getData();
      assert.strictEqual(data.success, true);
      assert.ok(data.signal);
      assert.strictEqual(data.signal.modality, 'camera_behavior');
      assert.strictEqual(data.signal.reliabilityWeight, 0.65);
      assert.ok(data.observationSummary);

      // Verify signal was ingested into StateService
      const state = await stateService.getCurrentState(userId);
      assert.ok(state);
      assert.strictEqual(state.userId, userId);
      // Verify contributing source includes camera_behavior
      assert.ok(state.sourceSummary['camera_behavior'] > 0);
    });

    it('accumulates historical camera observations to transition baseline from preliminary to mature', async () => {
      const userId = randomUUID();

      // Submit session 1
      const { req: r1, res: res1 } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
      await cameraController.analyzeCamera(r1, res1 as any);
      assert.strictEqual(res1.getStatusCode(), 201);

      // Fetch baseline -> 1 observation (Preliminary)
      const { req: bReq1, res: bRes1 } = createMockReqRes({ id: userId });
      await cameraController.getBaseline(bReq1, bRes1 as any);
      assert.strictEqual(bRes1.getStatusCode(), 200);
      const b1 = bRes1.getData().baseline;
      assert.ok(b1);
      assert.strictEqual(b1.observationCount, 1);
      assert.strictEqual(b1.isPreliminary, true);

      // Submit session 2
      const { req: r2, res: res2 } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
      await cameraController.analyzeCamera(r2, res2 as any);
      assert.strictEqual(res2.getStatusCode(), 201);

      // Submit session 3
      const { req: r3, res: res3 } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
      await cameraController.analyzeCamera(r3, res3 as any);
      assert.strictEqual(res3.getStatusCode(), 201);

      // Fetch baseline -> 3 observations (Mature)
      const { req: bReq3, res: bRes3 } = createMockReqRes({ id: userId });
      await cameraController.getBaseline(bReq3, bRes3 as any);
      assert.strictEqual(bRes3.getStatusCode(), 200);
      const b3 = bRes3.getData().baseline;
      assert.ok(b3);
      assert.strictEqual(b3.observationCount, 3);
      assert.strictEqual(b3.isPreliminary, false);
    });

    it('guarantees tenant isolation between User A and User B camera signals', async () => {
      const userA = randomUUID();
      const userB = randomUUID();

      // User A submits 3 sessions
      for (let i = 0; i < 3; i++) {
        const { req, res } = createMockReqRes({ id: userA }, { metrics: baseValidMetrics });
        await cameraController.analyzeCamera(req, res as any);
        assert.strictEqual(res.getStatusCode(), 201);
      }

      // Check User A's baseline (3 observations, Mature)
      const { req: reqA, res: resA } = createMockReqRes({ id: userA });
      await cameraController.getBaseline(reqA, resA as any);
      assert.strictEqual(resA.getData().baseline.observationCount, 3);
      assert.strictEqual(resA.getData().baseline.isPreliminary, false);

      // User B has 0 sessions -> baseline must be null
      const { req: reqB, res: resB } = createMockReqRes({ id: userB });
      await cameraController.getBaseline(reqB, resB as any);
      assert.strictEqual(resB.getData().baseline, null);
    });

    it('integrates cleanly into MultimodalFusionEngine alongside mood check-in and voice', async () => {
      const userId = randomUUID();
      const now = new Date();

      // 1. Mood check-in signal
      const moodSignal = SignalExtractor.fromMoodLog({
        userId,
        energyLevel: 8,
        moodType: 'Joy',
        notes: 'Feeling great and energized',
        triggers: ['work_progress'],
        physicalSensations: ['relaxed_shoulders'],
      });

      // 2. Camera behavioral signal
      const cameraSignal = SignalExtractor.fromCameraObservation({
        userId,
        metrics: baseValidMetrics,
      });

      const defaultBaseline = {
        mood: 70,
        stress: 30,
        fatigue: 35,
        energy: 65,
        focus: 70,
        cognitiveLoad: 35,
      };

      const fusionEngine = new MultimodalFusionEngine();
      const fused = fusionEngine.fuse(userId, [moodSignal, cameraSignal], defaultBaseline, now);

      assert.ok(fused);
      assert.ok(fused.sourceSummary['mood_checkin'] > 0);
      assert.ok(fused.sourceSummary['camera_behavior'] > 0);
      assert.ok(fused.dimensions.stress.modalityBreakdown.camera_behavior);

      // Ingest fused state through StateEngine
      const stateEngine = new StateEngine();
      const state = stateEngine.computeState(
        userId,
        [moodSignal, cameraSignal],
        now
      );

      assert.ok(state);
      assert.strictEqual(state.userId, userId);
      assert.ok(state.sourceSummary['camera_behavior'] > 0);
      assert.ok(state.sourceSummary['mood_checkin'] > 0);
    });
  });

  // ─── Phase 7 Hardening Integration Tests ──────────────────────────────────

  describe('F09 — Baseline Realism: Controller-Pipeline Filtering', () => {
    it('baseline only counts sessions that passed full controller validation (not rejected ones)', async () => {
      const userId = randomUUID();

      // Submit 2 valid sessions through full controller pipeline
      for (let i = 0; i < 2; i++) {
        const { req, res } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
        await cameraController.analyzeCamera(req, res as any);
        assert.strictEqual(res.getStatusCode(), 201, `Valid session ${i + 1} should be accepted`);
      }

      // Attempt to submit 1 invalid session (< 30s) — rejected at controller, NOT stored
      const { req: shortReq, res: shortRes } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, sessionDurationSeconds: 15 },
      });
      await cameraController.analyzeCamera(shortReq, shortRes as any);
      assert.strictEqual(shortRes.getStatusCode(), 400, 'Short-duration session must be rejected');

      // Baseline should reflect only 2 valid observations (preliminary, not mature)
      const { req: bReq, res: bRes } = createMockReqRes({ id: userId });
      await cameraController.getBaseline(bReq, bRes as any);
      const baseline = bRes.getData().baseline;
      assert.ok(baseline, 'Baseline must exist from 2 valid sessions');
      assert.strictEqual(baseline.observationCount, 2,
        'Rejected sessions must NOT appear in baseline observation count');
      assert.strictEqual(baseline.isPreliminary, true,
        '2 valid sessions → still preliminary; rejected session must not count toward maturity');
    });

    it('multiple-face rejection does not contribute to baseline maturity', async () => {
      const userId = randomUUID();

      // 2 valid sessions
      for (let i = 0; i < 2; i++) {
        const { req, res } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
        await cameraController.analyzeCamera(req, res as any);
        assert.strictEqual(res.getStatusCode(), 201);
      }

      // 1 multi-face session — rejected at controller
      const { req: mfReq, res: mfRes } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, multipleFacesDetected: true },
      });
      await cameraController.analyzeCamera(mfReq, mfRes as any);
      assert.strictEqual(mfRes.getStatusCode(), 400, 'Multi-face session must be rejected');

      // Baseline: only 2 valid
      const { req: bReq, res: bRes } = createMockReqRes({ id: userId });
      await cameraController.getBaseline(bReq, bRes as any);
      assert.strictEqual(bRes.getData().baseline.observationCount, 2);
      assert.strictEqual(bRes.getData().baseline.isPreliminary, true);
    });

    it('poor tracking quality session rejected at controller — does not reach baseline', async () => {
      const userId = randomUUID();

      // 1 valid session
      const { req: r1, res: res1 } = createMockReqRes({ id: userId }, { metrics: baseValidMetrics });
      await cameraController.analyzeCamera(r1, res1 as any);
      assert.strictEqual(res1.getStatusCode(), 201);

      // 1 low tracking quality session — rejected at controller (trackingQuality < 0.40)
      const { req: lqReq, res: lqRes } = createMockReqRes({ id: userId }, {
        metrics: { ...baseValidMetrics, trackingQuality: 0.25 },
      });
      await cameraController.analyzeCamera(lqReq, lqRes as any);
      assert.strictEqual(lqRes.getStatusCode(), 400, 'Low tracking quality must be rejected');

      // Baseline: only 1 valid
      const { req: bReq, res: bRes } = createMockReqRes({ id: userId });
      await cameraController.getBaseline(bReq, bRes as any);
      assert.strictEqual(bRes.getData().baseline.observationCount, 1);
      assert.strictEqual(bRes.getData().baseline.isPreliminary, true,
        'Low-quality session must not contribute to maturity threshold');
    });
  });

  describe('F03 — Disconnect / Premature Termination Path', () => {
    it('session terminated prematurely (duration < 30s) is rejected at server — no signal ingested', async () => {
      // Simulates what happens when camera disconnect causes a short session:
      // the client-side teardown produces metrics with short duration,
      // which the controller must reject.
      const userId = randomUUID();
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: {
          ...baseValidMetrics,
          sessionDurationSeconds: 12, // premature termination
        },
      });

      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400,
        'Short session from disconnect must be rejected — no wellness signal emitted');

      // Verify no state was computed from the bad session
      const state = await stateService.getCurrentState(userId);
      // State may exist from baseline defaults but camera_behavior should not be a source
      if (state && state.sourceSummary) {
        assert.ok(
          !state.sourceSummary['camera_behavior'] || state.sourceSummary['camera_behavior'] === 0,
          'Rejected camera session must not appear in state source summary'
        );
      }
    });

    it('session with insufficient face presence (simulating black frames from disconnect) is rejected', async () => {
      // When camera disconnects mid-session, remaining frames are blank/black:
      // → trackingRegionDetected = false for those frames
      // → facePresenceRatio drops below 0.80
      // → session rejected → no wellness signal emitted
      const userId = randomUUID();
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: {
          ...baseValidMetrics,
          facePresenceRatio: 0.40, // many blank frames = low presence ratio
          trackingQuality: 0.20,    // poor quality from dark/blank frames
        },
      });

      await cameraController.analyzeCamera(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400,
        'Low face presence (from disconnect/blank frames) must be rejected');
    });
  });
});
