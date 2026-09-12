/**
 * Voice Integration & End-to-End Pipeline Tests
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 *
 * Validates the complete pipeline:
 * Voice Observation -> Crisis Screening -> Baseline Computation -> Signal Extraction
 * -> Ingestion into State Engine -> Evidence Synthesis -> State Recalculation
 * -> Intervention Alignment.
 *
 * Also validates authentication, input bounds, crisis interception, and tenant isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { voiceController } from '../src/server/controllers/voiceController';
import { stateService } from '../src/server/services/stateService';
import { interventionService } from '../src/server/services/interventionService';
import { AuthenticatedRequest } from '../src/server/middleware/auth';

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

describe('Voice Integration & Intelligence Pipeline Tests', () => {
  it('rejects unauthorized or invalid UUID user session with 401', async () => {
    // Missing user
    const { req: req1, res: res1 } = createMockReqRes(null, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 0.2, pauseCount: 2 },
    });
    await voiceController.analyzeVoice(req1, res1 as any);
    assert.strictEqual(res1.getStatusCode(), 401);
    assert.match(res1.getData().error, /Unauthorized/);

    // Invalid UUID
    const { req: req2, res: res2 } = createMockReqRes({ id: 'non-uuid-user' }, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 0.2, pauseCount: 2 },
    });
    await voiceController.analyzeVoice(req2, res2 as any);
    assert.strictEqual(res2.getStatusCode(), 401);
  });

  it('validates and rejects out-of-bounds acoustic metrics with 400', async () => {
    const userId = randomUUID();

    // Missing metrics
    const { req: req1, res: res1 } = createMockReqRes({ id: userId }, {});
    await voiceController.analyzeVoice(req1, res1 as any);
    assert.strictEqual(res1.getStatusCode(), 400);
    assert.match(res1.getData().error, /Missing or invalid acoustic metrics/);

    // Audio duration < 0.1s
    const { req: req2, res: res2 } = createMockReqRes({ id: userId }, {
      metrics: { audioDurationSeconds: 0.05, pauseRatio: 0.2, pauseCount: 0 },
    });
    await voiceController.analyzeVoice(req2, res2 as any);
    assert.strictEqual(res2.getStatusCode(), 400);
    assert.match(res2.getData().error, /audioDurationSeconds/);

    // Audio duration > 600s
    const { req: req3, res: res3 } = createMockReqRes({ id: userId }, {
      metrics: { audioDurationSeconds: 601, pauseRatio: 0.2, pauseCount: 0 },
    });
    await voiceController.analyzeVoice(req3, res3 as any);
    assert.strictEqual(res3.getStatusCode(), 400);

    // Invalid pauseRatio > 1.0
    const { req: req4, res: res4 } = createMockReqRes({ id: userId }, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 1.5, pauseCount: 2 },
    });
    await voiceController.analyzeVoice(req4, res4 as any);
    assert.strictEqual(res4.getStatusCode(), 400);
    assert.match(res4.getData().error, /pauseRatio/);

    // Invalid negative pauseCount
    const { req: req5, res: res5 } = createMockReqRes({ id: userId }, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 0.2, pauseCount: -1 },
    });
    await voiceController.analyzeVoice(req5, res5 as any);
    assert.strictEqual(res5.getStatusCode(), 400);
    assert.match(res5.getData().error, /pauseCount/);

    // Out of bounds speechRateWpm
    const { req: req6, res: res6 } = createMockReqRes({ id: userId }, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 0.2, pauseCount: 2, speechRateWpm: 999 },
    });
    await voiceController.analyzeVoice(req6, res6 as any);
    assert.strictEqual(res6.getStatusCode(), 400);
    assert.match(res6.getData().error, /speechRateWpm/);
  });

  it('immediately intercepts crisis transcript and returns 24/7 helpline notice without ingesting signal', async () => {
    const userId = randomUUID();

    const { req, res } = createMockReqRes({ id: userId }, {
      metrics: {
        audioDurationSeconds: 8,
        speechDurationSeconds: 6,
        pauseCount: 2,
        pauseRatio: 0.25,
        speechRateWpm: 120,
      },
      transcript: 'I feel completely hopeless and I want to end my life',
    });

    await voiceController.analyzeVoice(req, res as any);
    assert.strictEqual(res.getStatusCode(), 200);

    const data = res.getData();
    assert.strictEqual(data.isCrisisDetected, true);
    assert.ok(data.helplineNotice);
    assert.match(data.helplineNotice, /988/);
    assert.strictEqual(data.observationSummary, 'Immediate support resources available.');

    // Assert that NO wellness signal was ingested for this user
    const activeSignals = await stateService.getActiveSignals(userId);
    assert.strictEqual(activeSignals.length, 0, 'Crisis event must NOT ingest normal wellness signals');
  });

  it('processes valid voice reflection, creates voice_transcript signal, and updates personal state', async () => {
    const userId = randomUUID();

    const { req, res } = createMockReqRes({ id: userId }, {
      metrics: {
        audioDurationSeconds: 15,
        speechDurationSeconds: 11,
        pauseCount: 4,
        pauseRatio: 0.27,
        speechRateWpm: 135,
        vocalEnergy: 0.52,
        quality: 0.88,
        confidence: 0.82,
      },
      transcript: 'I had a steady morning working through my tasks and feeling focused.',
    });

    await voiceController.analyzeVoice(req, res as any);
    assert.strictEqual(res.getStatusCode(), 201);

    const data = res.getData();
    assert.strictEqual(data.success, true);
    assert.ok(data.signal);
    assert.strictEqual(data.signal.modality, 'voice_transcript');
    assert.strictEqual(data.signal.userId, userId);
    assert.strictEqual(data.signal.reliabilityWeight, 0.80);
    assert.ok(data.signal.features);
    assert.strictEqual(data.signal.features.speechRateWpm, 135);

    // Verify signal is in stateService
    const activeSignals = await stateService.getActiveSignals(userId);
    assert.strictEqual(activeSignals.length, 1);
    assert.strictEqual(activeSignals[0].modality, 'voice_transcript');

    // Verify StateEngine computes personal state incorporating this voice signal
    const state = await stateService.getCurrentState(userId);
    assert.ok(state);
    assert.strictEqual(state.sourceSummary['voice_transcript'], 1);

    // Verify that evidence generated by StateEngine includes voice_transcript
    assert.ok(state.evidence.length > 0, 'Personal state should contain evidence');
    const voiceEvidence = state.evidence.filter((e) => e.source === 'voice_transcript');
    assert.ok(voiceEvidence.length > 0, 'Evidence must reflect voice_transcript modality');
  });

  it('accumulates historical voice signals to transition from preliminary to mature acoustic baseline', async () => {
    const userId = randomUUID();

    // Initially no baseline
    const { req: bReq0, res: bRes0 } = createMockReqRes({ id: userId });
    await voiceController.getBaseline(bReq0, bRes0 as any);
    assert.strictEqual(bRes0.getStatusCode(), 200);
    assert.strictEqual(bRes0.getData().baseline, null);

    // Ingest 2 voice observations -> preliminary baseline
    for (let i = 1; i <= 2; i++) {
      const { req, res } = createMockReqRes({ id: userId }, {
        metrics: {
          audioDurationSeconds: 10,
          pauseCount: 2,
          pauseRatio: 0.20,
          speechRateWpm: 120 + i * 10,
          vocalEnergy: 0.50,
          quality: 0.80,
        },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 201);
    }

    const { req: bReq2, res: bRes2 } = createMockReqRes({ id: userId });
    await voiceController.getBaseline(bReq2, bRes2 as any);
    const b2 = bRes2.getData().baseline;
    assert.ok(b2);
    assert.strictEqual(b2.observationCount, 2);
    assert.strictEqual(b2.isPreliminary, true, 'isPreliminary must be true for 2 observations');

    // Ingest 3rd observation -> mature baseline
    const { req: req3, res: res3 } = createMockReqRes({ id: userId }, {
      metrics: {
        audioDurationSeconds: 12,
        pauseCount: 3,
        pauseRatio: 0.25,
        speechRateWpm: 150,
        vocalEnergy: 0.55,
        quality: 0.80,
      },
    });
    await voiceController.analyzeVoice(req3, res3 as any);
    assert.strictEqual(res3.getStatusCode(), 201);

    const { req: bReq3, res: bRes3 } = createMockReqRes({ id: userId });
    await voiceController.getBaseline(bReq3, bRes3 as any);
    const b3 = bRes3.getData().baseline;
    assert.ok(b3);
    assert.strictEqual(b3.observationCount, 3);
    assert.strictEqual(b3.isPreliminary, false, 'isPreliminary must be false for 3 observations');
  });

  it('guarantees tenant isolation between User A and User B voice signals', async () => {
    const userA = randomUUID();
    const userB = randomUUID();

    // Ingest voice for User A
    const { req: reqA, res: resA } = createMockReqRes({ id: userA }, {
      metrics: { audioDurationSeconds: 10, pauseRatio: 0.2, pauseCount: 2, speechRateWpm: 140 },
      transcript: 'User A voice check-in',
    });
    await voiceController.analyzeVoice(reqA, resA as any);
    assert.strictEqual(resA.getStatusCode(), 201);

    // Verify User B has zero active signals and baseline is null
    const signalsB = await stateService.getActiveSignals(userB);
    assert.strictEqual(signalsB.length, 0);

    const { req: reqB, res: resB } = createMockReqRes({ id: userB });
    await voiceController.getBaseline(reqB, resB as any);
    assert.strictEqual(resB.getData().baseline, null);
  });

  it('influences intervention recommendation when voice indicates elevated tension or fatigue', async () => {
    const userId = randomUUID();

    // User expresses high stress / fatigue via voice
    const { req, res } = createMockReqRes({ id: userId }, {
      metrics: {
        audioDurationSeconds: 12,
        pauseCount: 2,
        pauseRatio: 0.15,
        speechRateWpm: 175,
        vocalEnergy: 0.72,
      },
      transcript: 'I am so overwhelmed by this deadline and tense everywhere',
    });
    await voiceController.analyzeVoice(req, res as any);
    assert.strictEqual(res.getStatusCode(), 201);

    // Call intervention engine for recommendation
    const rec = await interventionService.getRecommendation(userId);
    assert.ok(rec);
    assert.ok(rec.intervention);
    // When stress is elevated, breathing, grounding, or wind-down interventions take priority
    assert.ok(
      ['breathing-reset', 'box-breathing', 'grounding-54321', 'progressive-relaxation', 'sleep-winddown'].includes(
        rec.intervention.id
      ),
      `Expected stress-mitigating intervention, got ${rec.intervention.id}`
    );
  });

  // ============================================================
  // MUST-FIX #2 REGRESSION TESTS: NON-FINITE NUMERIC INPUT VALIDATION
  // ============================================================

  describe('Non-Finite Numeric Input Sanitization (MUST-FIX #2)', () => {
    const baseValidMetrics = {
      audioDurationSeconds: 10,
      pauseCount: 2,
      pauseRatio: 0.20,
      speechRateWpm: 130,
      vocalEnergy: 0.50,
      quality: 0.80,
      confidence: 0.75,
    };

    it('1. NaN vocalEnergy → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, vocalEnergy: NaN },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /vocalEnergy/);
    });

    it('2. Infinity vocalEnergy → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, vocalEnergy: Infinity },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /vocalEnergy/);
    });

    it('3. NaN quality → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, quality: NaN },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /quality/);
    });

    it('4. Infinity quality → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, quality: Infinity },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /quality/);
    });

    it('5. NaN confidence → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, confidence: NaN },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /confidence/);
    });

    it('6. Infinity confidence → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, confidence: Infinity },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /confidence/);
    });

    it('7. NaN speechRateWpm → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, speechRateWpm: NaN },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /speechRateWpm/);
    });

    it('8. Infinity speechRateWpm → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, speechRateWpm: Infinity },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /speechRateWpm/);
    });

    it('9. NaN pauseRatio → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, pauseRatio: NaN },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /pauseRatio/);
    });

    it('10. Infinity pauseRatio → HTTP 400', async () => {
      const { req, res } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, pauseRatio: Infinity },
      });
      await voiceController.analyzeVoice(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /pauseRatio/);
    });

    it('11. Negative/out-of-range values continue to return HTTP 400', async () => {
      // Negative vocalEnergy
      const { req: r1, res: s1 } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, vocalEnergy: -0.1 },
      });
      await voiceController.analyzeVoice(r1, s1 as any);
      assert.strictEqual(s1.getStatusCode(), 400);

      // vocalEnergy > 1.0
      const { req: r2, res: s2 } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, vocalEnergy: 1.5 },
      });
      await voiceController.analyzeVoice(r2, s2 as any);
      assert.strictEqual(s2.getStatusCode(), 400);

      // Negative quality
      const { req: r3, res: s3 } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, quality: -0.5 },
      });
      await voiceController.analyzeVoice(r3, s3 as any);
      assert.strictEqual(s3.getStatusCode(), 400);

      // Negative confidence
      const { req: r4, res: s4 } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, confidence: -0.1 },
      });
      await voiceController.analyzeVoice(r4, s4 as any);
      assert.strictEqual(s4.getStatusCode(), 400);

      // Negative pauseDurationSeconds
      const { req: r5, res: s5 } = createMockReqRes({ id: randomUUID() }, {
        metrics: { ...baseValidMetrics, pauseDurationSeconds: -2 },
      });
      await voiceController.analyzeVoice(r5, s5 as any);
      assert.strictEqual(s5.getStatusCode(), 400);
    });
  });
});
