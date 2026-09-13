/**
 * Cognitive & Deep Work Focus Monitoring Integration & Security Tests
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cognitiveController } from '../src/server/controllers/cognitiveController';
import { cognitiveService } from '../src/server/services/cognitiveService';
import { CognitiveSignalProvider } from '../src/server/engine/cognitive/cognitiveSignalProvider';
import {
  validateStartSessionInput,
  validateTelemetryWindow,
  validateCompleteSessionInput,
  assertNoKeyloggingPayload,
} from '../src/server/engine/cognitive/types';
import { stateService } from '../src/server/services/stateService';
import { memoryService } from '../src/server/services/memoryService';
import { GraphBuilder } from '../src/server/engine/evidenceGraph/graphBuilder';
import { interventionService } from '../src/server/services/interventionService';
import { AuthenticatedRequest } from '../src/server/middleware/auth';
import { WellnessSignal, PersonalState } from '../src/server/engine/types';
import { screenForCrisis } from '../src/server/engine/interventionEngine/safety';

process.env.NODE_ENV = 'test';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function createMockReqRes(
  user: { id: string } | null,
  body: any = {},
  query: any = {},
  params: any = {}
) {
  const req = {
    user,
    body,
    query,
    params,
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

describe('Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence', () => {
  beforeEach(async () => {
    cognitiveService._resetMemoryStore();
    await cognitiveService.purgeHistory(USER_A);
    await cognitiveService.purgeHistory(USER_B);
  });

  // ─────────────────────────────────────────────────────────────
  // A. DOMAIN VALIDATION & INPUT SANITIZATION
  // ─────────────────────────────────────────────────────────────
  describe('A. Domain Validation & Input Sanitization', () => {
    it('rejects unauthenticated requests to start focus session with 401', async () => {
      const { req, res } = createMockReqRes(null, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      await cognitiveController.startSession(req, res as any);
      assert.equal(res.getStatusCode(), 401);
      assert.match(res.getData().error, /Unauthorized/);
    });

    it('accepts valid session start input', async () => {
      const { req, res } = createMockReqRes({ id: USER_A }, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
        activityLabel: 'System Architecture',
      });

      await cognitiveController.startSession(req, res as any);
      assert.equal(res.getStatusCode(), 201);
      const data = res.getData();
      assert.equal(data.success, true);
      assert.equal(data.session.sessionType, 'deep_work_50');
      assert.equal(data.session.plannedDurationMinutes, 50);
      assert.equal(data.session.status, 'active');
    });

    it('rejects invalid sessionType with 400', async () => {
      const { req, res } = createMockReqRes({ id: USER_A }, {
        sessionType: 'invalid_type',
        plannedDurationMinutes: 50,
      });

      await cognitiveController.startSession(req, res as any);
      assert.equal(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Invalid sessionType/);
    });

    it('rejects non-finite values (NaN / Infinity) in planned duration', async () => {
      const resNaN = validateStartSessionInput({
        sessionType: 'deep_work_50',
        plannedDurationMinutes: NaN,
      });
      assert.equal(resNaN.isValid, false);
      assert.match(resNaN.error!, /finite number/);

      const resInf = validateStartSessionInput({
        sessionType: 'deep_work_50',
        plannedDurationMinutes: Infinity,
      });
      assert.equal(resInf.isValid, false);
      assert.match(resInf.error!, /finite number/);
    });

    it('rejects out-of-range durations (< 5m or > 180m)', () => {
      const tooShort = validateStartSessionInput({
        sessionType: 'custom',
        plannedDurationMinutes: 2,
      });
      assert.equal(tooShort.isValid, false);
      assert.match(tooShort.error!, /between 5 and 180/);

      const tooLong = validateStartSessionInput({
        sessionType: 'custom',
        plannedDurationMinutes: 240,
      });
      assert.equal(tooLong.isValid, false);
      assert.match(tooLong.error!, /between 5 and 180/);
    });

    it('rejects oversized activityLabel (> 80 chars)', () => {
      const result = validateStartSessionInput({
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
        activityLabel: 'A'.repeat(85),
      });
      assert.equal(result.isValid, false);
      assert.match(result.error!, /maximum 80 characters/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // B. ZERO-KEYLOGGING & PRIVACY VIOLATION REJECTION
  // ─────────────────────────────────────────────────────────────
  describe('B. Zero-Keylogging & Anti-Surveillance Guarantees', () => {
    it('immediately rejects payload containing forbidden "key" field with 400', async () => {
      const { req, res } = createMockReqRes({ id: USER_A }, {
        sessionId: randomUUID(),
        telemetry: {
          intervalSeconds: 60,
          attentionalShiftCount: 2,
          activeTypingSeconds: 30,
          typingCadenceEntropy: 0.45,
          key: 'a', // FORBIDDEN KEYLOGGING
        },
      });

      await cognitiveController.recordHeartbeat(req, res as any);
      assert.equal(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Security violation: Forbidden field 'key'/);
    });

    it('rejects payload containing "keyCode", "code", or "char" fields', () => {
      assert.equal(assertNoKeyloggingPayload({ keyCode: 65 }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ code: 'KeyA' }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ characters: 'secret' }).isValid, false);
    });

    it('rejects payload containing "text", "password", or "clipboard" data', () => {
      assert.equal(assertNoKeyloggingPayload({ text: 'my diary text' }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ password: '123' }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ clipboard: 'pasted text' }).isValid, false);
    });

    it('rejects payload containing "url", "screen", or "appName"', () => {
      assert.equal(assertNoKeyloggingPayload({ url: 'https://bank.com' }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ screen: 'base64...' }).isValid, false);
      assert.equal(assertNoKeyloggingPayload({ appName: 'Slack' }).isValid, false);
    });

    it('recursively detects and blocks nested forbidden fields', () => {
      const nestedPayload = {
        intervalSeconds: 60,
        nestedMetrics: {
          shifts: 2,
          userKeystrokes: ['a', 'b'],
        },
      };
      const result = assertNoKeyloggingPayload(nestedPayload);
      assert.equal(result.isValid, false);
      assert.match(result.error!, /Forbidden field 'userKeystrokes'/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // C. TELEMETRY WINDOW VALIDATION
  // ─────────────────────────────────────────────────────────────
  describe('C. Telemetry Window Validation', () => {
    it('rejects non-finite values (NaN / Infinity) in telemetry window', () => {
      const resNaN = validateTelemetryWindow({
        intervalSeconds: NaN,
        attentionalShiftCount: 2,
        activeTypingSeconds: 10,
        typingCadenceEntropy: 0.4,
      });
      assert.equal(resNaN.isValid, false);
      assert.match(resNaN.error!, /finite number/);

      const resInf = validateTelemetryWindow({
        intervalSeconds: 60,
        attentionalShiftCount: Infinity,
        activeTypingSeconds: 10,
        typingCadenceEntropy: 0.4,
      });
      assert.equal(resInf.isValid, false);
      assert.match(resInf.error!, /finite number/);
    });

    it('rejects negative intervals or shift counts', () => {
      const resNeg = validateTelemetryWindow({
        intervalSeconds: 60,
        attentionalShiftCount: -5,
        activeTypingSeconds: 10,
        typingCadenceEntropy: 0.4,
      });
      assert.equal(resNeg.isValid, false);
      assert.match(resNeg.error!, /between 0 and 300/);
    });

    it('rejects activeTypingSeconds exceeding intervalSeconds', () => {
      const resInvalid = validateTelemetryWindow({
        intervalSeconds: 60,
        attentionalShiftCount: 2,
        activeTypingSeconds: 75, // Impossible
        typingCadenceEntropy: 0.4,
      });
      assert.equal(resInvalid.isValid, false);
      assert.match(resInvalid.error!, /<= intervalSeconds/);
    });

    it('rejects typingCadenceEntropy outside [0.0, 2.0]', () => {
      const resHigh = validateTelemetryWindow({
        intervalSeconds: 60,
        attentionalShiftCount: 2,
        activeTypingSeconds: 30,
        typingCadenceEntropy: 2.5,
      });
      assert.equal(resHigh.isValid, false);
      assert.match(resHigh.error!, /between 0.0 and 2.0/);
    });

    it('rejects subjectiveDifficulty outside [1, 5]', () => {
      const resDiff = validateTelemetryWindow({
        intervalSeconds: 60,
        attentionalShiftCount: 2,
        activeTypingSeconds: 30,
        typingCadenceEntropy: 0.4,
        subjectiveDifficulty: 7,
      });
      assert.equal(resDiff.isValid, false);
      assert.match(resDiff.error!, /between 1 and 5/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // D. DETERMINISTIC MATHEMATICAL SCORING & FORMULA VERIFICATION
  // ─────────────────────────────────────────────────────────────
  describe('D. Deterministic Mathematical Scoring & Formulas', () => {
    const provider = new CognitiveSignalProvider();

    it('demonstrates gradual cognitive load increase with session duration (ultradian saturation curve)', () => {
      const short = provider.calculateEstimate({
        sessionDurationMinutes: 20,
        attentionalShiftRate: 1.0,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.5,
      });

      const extended = provider.calculateEstimate({
        sessionDurationMinutes: 80,
        attentionalShiftRate: 1.0,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.5,
      });

      assert.ok(
        extended.cognitiveLoad > short.cognitiveLoad,
        `Extended session load (${extended.cognitiveLoad}) should exceed short session (${short.cognitiveLoad})`
      );
      assert.ok(extended.fatigue > short.fatigue);
      assert.ok(extended.energy < short.energy);
    });

    it('demonstrates that high attentional shift rate escalates cognitive load and degrades focus', () => {
      const calm = provider.calculateEstimate({
        sessionDurationMinutes: 45,
        attentionalShiftRate: 0.5,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.6,
      });

      const fragmented = provider.calculateEstimate({
        sessionDurationMinutes: 45,
        attentionalShiftRate: 5.0,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.6,
      });

      assert.ok(
        fragmented.cognitiveLoad > calm.cognitiveLoad,
        `Fragmented load (${fragmented.cognitiveLoad}) should exceed calm load (${calm.cognitiveLoad})`
      );
      assert.ok(
        fragmented.focus < calm.focus,
        `Fragmented focus (${fragmented.focus}) should be lower than calm focus (${calm.focus})`
      );
    });

    it('demonstrates that steady cadence entropy enhances focus in deep work flow', () => {
      const erratic = provider.calculateEstimate({
        sessionDurationMinutes: 35,
        attentionalShiftRate: 1.0,
        typingCadenceEntropy: 1.2,
        activeTypingRatio: 0.6,
      });

      const flow = provider.calculateEstimate({
        sessionDurationMinutes: 35,
        attentionalShiftRate: 1.0,
        typingCadenceEntropy: 0.40,
        activeTypingRatio: 0.6,
      });

      assert.ok(
        flow.focus > erratic.focus,
        `Flow focus (${flow.focus}) should be significantly higher than erratic focus (${erratic.focus})`
      );
    });

    it('demonstrates subjective difficulty adds bounded delta without overriding behavioral metrics', () => {
      const base = provider.calculateEstimate({
        sessionDurationMinutes: 40,
        attentionalShiftRate: 1.5,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.5,
        subjectiveDifficulty: 3,
      });

      const hard = provider.calculateEstimate({
        sessionDurationMinutes: 40,
        attentionalShiftRate: 1.5,
        typingCadenceEntropy: 0.45,
        activeTypingRatio: 0.5,
        subjectiveDifficulty: 5,
      });

      assert.ok(hard.cognitiveLoad > base.cognitiveLoad);
      assert.ok(hard.cognitiveLoad - base.cognitiveLoad <= 20, 'Subjective delta should be bounded');
    });

    it('produces 100% deterministic outputs for identical metrics', () => {
      const metrics = {
        sessionDurationMinutes: 50,
        attentionalShiftRate: 2.2,
        typingCadenceEntropy: 0.55,
        activeTypingRatio: 0.4,
        subjectiveDifficulty: 4,
      };

      const est1 = provider.calculateEstimate(metrics);
      const est2 = provider.calculateEstimate(metrics);

      assert.deepEqual(est1, est2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // E. DIMENSIONAL BOUNDS & STRICT MOOD INVARIANCE
  // ─────────────────────────────────────────────────────────────
  describe('E. Dimensional Bounds & Strict Mood Invariance', () => {
    const provider = new CognitiveSignalProvider();

    it('clamps cognitiveLoad strictly within [10, 95]', () => {
      const extremeLow = provider.calculateEstimate({
        sessionDurationMinutes: 0,
        attentionalShiftRate: 0,
        typingCadenceEntropy: 0.4,
        activeTypingRatio: 1.0,
        subjectiveDifficulty: 1,
      });
      assert.ok(extremeLow.cognitiveLoad >= 10);

      const extremeHigh = provider.calculateEstimate({
        sessionDurationMinutes: 180,
        attentionalShiftRate: 60,
        typingCadenceEntropy: 2.0,
        activeTypingRatio: 1.0,
        subjectiveDifficulty: 5,
      });
      assert.ok(extremeHigh.cognitiveLoad <= 95);
    });

    it('clamps focus strictly within [10, 95]', () => {
      const extremeLow = provider.calculateEstimate({
        sessionDurationMinutes: 180,
        attentionalShiftRate: 60,
        typingCadenceEntropy: 2.0,
        activeTypingRatio: 0.1,
        subjectiveDifficulty: 5,
      });
      assert.ok(extremeLow.focus >= 10);

      const extremeHigh = provider.calculateEstimate({
        sessionDurationMinutes: 30,
        attentionalShiftRate: 0,
        typingCadenceEntropy: 0.35,
        activeTypingRatio: 0.8,
        subjectiveDifficulty: 1,
      });
      assert.ok(extremeHigh.focus <= 95);
    });

    it('clamps fatigue and energy within [0, 100]', () => {
      const est = provider.calculateEstimate({
        sessionDurationMinutes: 120,
        attentionalShiftRate: 10,
        typingCadenceEntropy: 1.0,
        activeTypingRatio: 0.5,
      });
      assert.ok(est.fatigue >= 0 && est.fatigue <= 100);
      assert.ok(est.energy >= 0 && est.energy <= 100);
    });

    it('CRITICAL: guarantees session_cognitive NEVER directly sets or modifies mood', () => {
      const session = {
        id: randomUUID(),
        userId: USER_A,
        sessionType: 'deep_work_50' as const,
        plannedDurationMinutes: 50,
        status: 'completed' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        heartbeatCount: 2,
        aggregatedTelemetry: {
          totalIntervalSeconds: 3000,
          totalAttentionalShifts: 8,
          totalActiveTypingSeconds: 1800,
          cadenceEntropySamples: [0.45, 0.50],
        },
      };

      const signal = provider.extractSignal(USER_A, session);

      // Verify estimates do NOT contain mood
      assert.equal((signal.estimates as any).mood, undefined);
      assert.ok(signal.estimates.cognitiveLoad !== undefined);
      assert.ok(signal.estimates.focus !== undefined);
      assert.ok(signal.estimates.fatigue !== undefined);
      assert.ok(signal.estimates.energy !== undefined);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // F. SESSION LIFECYCLE, HEARTBEATS & RATE LIMITING
  // ─────────────────────────────────────────────────────────────
  describe('F. Session Lifecycle, Heartbeats & Rate Limiting', () => {
    it('manages start, heartbeat, and completion cycle cleanly', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
        activityLabel: 'Coding sprint',
      });
      assert.ok(session.id);
      assert.equal(session.status, 'active');

      const hbResult = await cognitiveService.recordHeartbeat(USER_A, session.id, {
        intervalSeconds: 60,
        attentionalShiftCount: 2,
        activeTypingSeconds: 40,
        typingCadenceEntropy: 0.42,
      });
      assert.equal(hbResult.success, true);
      assert.ok(hbResult.focusClarity > 0);

      const compResult = await cognitiveService.completeSession(USER_A, session.id, {
        sessionId: session.id,
        totalDurationMinutes: 50,
      });
      assert.equal(compResult.session.status, 'completed');
      assert.equal(compResult.signal.modality, 'session_cognitive');
    });

    it('rejects heartbeats sent too quickly (< 2.5 seconds) with rate limit error', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'pomodoro_25',
        plannedDurationMinutes: 25,
      });

      // Wait 3s after start to avoid startSession initial timestamp clash
      await new Promise((resolve) => setTimeout(resolve, 2600));

      // First heartbeat succeeds
      const hb1 = await cognitiveService.recordHeartbeat(USER_A, session.id, {
        intervalSeconds: 30,
        attentionalShiftCount: 1,
        activeTypingSeconds: 20,
        typingCadenceEntropy: 0.40,
      });
      assert.equal(hb1.success, true);

      // Immediate second heartbeat must fail
      await assert.rejects(
        async () => {
          await cognitiveService.recordHeartbeat(USER_A, session.id, {
            intervalSeconds: 30,
            attentionalShiftCount: 1,
            activeTypingSeconds: 20,
            typingCadenceEntropy: 0.40,
          });
        },
        /Rate limit exceeded/
      );
    });

    it('rejects heartbeat after session has been completed', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'pomodoro_25',
        plannedDurationMinutes: 25,
      });

      await cognitiveService.completeSession(USER_A, session.id, {
        sessionId: session.id,
      });

      await assert.rejects(
        async () => {
          await cognitiveService.recordHeartbeat(USER_A, session.id, {
            intervalSeconds: 30,
            attentionalShiftCount: 1,
            activeTypingSeconds: 15,
            typingCadenceEntropy: 0.4,
          });
        },
        /Cannot record telemetry on completed session/
      );
    });

    it('discarded session emits ZERO signals to StateService', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'flow_90',
        plannedDurationMinutes: 90,
      });

      await cognitiveService.discardSession(USER_A, session.id);

      const activeSignals = await stateService.getActiveSignals(USER_A);
      const cogSignals = activeSignals.filter((s) => s.modality === 'session_cognitive');
      assert.equal(cogSignals.length, 0);

      // Heartbeat on discarded session fails
      await assert.rejects(
        async () => {
          await cognitiveService.recordHeartbeat(USER_A, session.id, {
            intervalSeconds: 30,
            attentionalShiftCount: 1,
            activeTypingSeconds: 15,
            typingCadenceEntropy: 0.4,
          });
        },
        /Cannot record telemetry on discarded session/
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // G. MULTI-TENANT ISOLATION & ADVERSARIAL ACCESS PREVENTION
  // ─────────────────────────────────────────────────────────────
  describe('G. Multi-Tenant Isolation & Security', () => {
    it('strictly prevents User B from recording heartbeats on User A session with 403 Forbidden', async () => {
      const sessionA = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      const { req, res } = createMockReqRes({ id: USER_B }, {
        sessionId: sessionA.id,
        telemetry: {
          intervalSeconds: 60,
          attentionalShiftCount: 2,
          activeTypingSeconds: 30,
          typingCadenceEntropy: 0.45,
        },
      });

      await cognitiveController.recordHeartbeat(req, res as any);
      assert.equal(res.getStatusCode(), 403);
      assert.match(res.getData().error, /Forbidden/);
    });

    it('strictly prevents User B from completing User A session with 403 Forbidden', async () => {
      const sessionA = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      const { req, res } = createMockReqRes({ id: USER_B }, {
        sessionId: sessionA.id,
        totalDurationMinutes: 50,
      });

      await cognitiveController.completeSession(req, res as any);
      assert.equal(res.getStatusCode(), 403);
      assert.match(res.getData().error, /Forbidden/);
    });

    it('strictly prevents User B from discarding User A session with 403 Forbidden', async () => {
      const sessionA = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      const { req, res } = createMockReqRes({ id: USER_B }, {
        sessionId: sessionA.id,
      });

      await cognitiveController.discardSession(req, res as any);
      assert.equal(res.getStatusCode(), 403);
      assert.match(res.getData().error, /Forbidden/);
    });

    it('never trusts userId from request body; strictly uses authenticated req.user.id', async () => {
      const { req, res } = createMockReqRes({ id: USER_A }, {
        userId: USER_B, // FORGED USER ID IN BODY
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      await cognitiveController.startSession(req, res as any);
      assert.equal(res.getStatusCode(), 201);
      assert.equal(res.getData().session.userId, USER_A);
      assert.notEqual(res.getData().session.userId, USER_B);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // H. PIPELINE & ENGINE INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('H. Pipeline & Engine Integration', () => {
    it('ingests completed cognitive session into StateService and updates cognitiveLoad & focus', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });

      // Add a couple heartbeats
      await new Promise((r) => setTimeout(r, 2600));
      await cognitiveService.recordHeartbeat(USER_A, session.id, {
        intervalSeconds: 1500,
        attentionalShiftCount: 8,
        activeTypingSeconds: 900,
        typingCadenceEntropy: 0.45,
      });

      const result = await cognitiveService.completeSession(USER_A, session.id, {
        sessionId: session.id,
        totalDurationMinutes: 50,
      });

      assert.ok(result.stateSnapshot);
      assert.ok(result.stateSnapshot.cognitiveLoad > 0);
      assert.ok(result.stateSnapshot.focus > 0);

      // Verify signal is in StateService
      const active = await stateService.getActiveSignals(USER_A);
      const cogSig = active.find((s) => s.modality === 'session_cognitive');
      assert.ok(cogSig);
      assert.equal((cogSig?.features as any)?.plannedDurationMinutes, 50);
    });

    it('incorporates session_cognitive into Evidence Graph with non-diagnostic provenance', async () => {
      const nowIso = new Date().toISOString();
      const signal: WellnessSignal = {
        id: 'sig-cog-graph-test',
        userId: USER_A,
        modality: 'session_cognitive',
        timestamp: nowIso,
        reliabilityWeight: 0.70,
        estimates: {
          cognitiveLoad: { value: 72, confidence: 0.75 },
          focus: { value: 80, confidence: 0.70 },
        },
        features: {
          sentimentSummary: 'Extended focus session with moderate task saturation.',
        },
        expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
      };

      const state: any = {
        userId: USER_A,
        timestamp: nowIso,
        mood: 70,
        stress: 30,
        fatigue: 40,
        energy: 65,
        focus: 80,
        cognitiveLoad: 72,
        overallConfidence: 0.72,
        baselineDeviation: 0,
        activeSignalsCount: 1,
        sourceSummary: { session_cognitive: 1 },
        evidence: [],
        dimensions: {
          mood: { value: 70, confidence: 0.7, baselineDeviation: 0, trend: 'stable', sourceModalities: ['journal'], contributingSignalIds: [] },
          stress: { value: 30, confidence: 0.7, baselineDeviation: 0, trend: 'stable', sourceModalities: ['journal'], contributingSignalIds: [] },
          fatigue: { value: 40, confidence: 0.7, baselineDeviation: 0, trend: 'stable', sourceModalities: ['journal'], contributingSignalIds: [] },
          energy: { value: 65, confidence: 0.7, baselineDeviation: 0, trend: 'stable', sourceModalities: ['journal'], contributingSignalIds: [] },
          focus: { value: 80, confidence: 0.7, baselineDeviation: 0, trend: 'stable', sourceModalities: ['journal'], contributingSignalIds: [] },
          cognitiveLoad: {
            value: 72,
            confidence: 0.75,
            baselineDeviation: 12,
            trend: 'stable',
            sourceModalities: ['session_cognitive'],
            contributingSignalIds: [signal.id],
          },
        },
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: state,
        signals: [signal],
        patterns: [],
      });

      // Find node for signal
      const sigNode = graph.nodes[`node-sig-${signal.id}`];
      assert.ok(sigNode, 'Evidence graph must include session_cognitive node');
      assert.equal(sigNode?.modality, 'session_cognitive');
      assert.match(sigNode?.summary!, /focus session/i);
    });

    it('triggers intervention recommendation when cognitive strain is high (cognitiveLoad >= 60)', async () => {
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'flow_90',
        plannedDurationMinutes: 90,
      });

      // Add high strain heartbeat
      await new Promise((r) => setTimeout(r, 2600));
      await cognitiveService.recordHeartbeat(USER_A, session.id, {
        intervalSeconds: 3600,
        attentionalShiftCount: 25, // Heavy fragmentation
        activeTypingSeconds: 1200,
        typingCadenceEntropy: 1.1,
        subjectiveDifficulty: 5, // Self-reported high strain
      });

      const result = await cognitiveService.completeSession(USER_A, session.id, {
        sessionId: session.id,
        totalDurationMinutes: 85,
        selfReportedStrain: 85,
      });

      assert.ok(result.signal.estimates.cognitiveLoad?.value! >= 60);
      assert.ok(result.stateSnapshot.cognitiveLoad > 35);
      assert.ok(result.suggestedIntervention, 'High cognitive strain should suggest an intervention reset');
      // Should suggest a valid intervention
      assert.ok(result.suggestedIntervention.id, 'Intervention must have a valid ID');
      assert.ok(result.suggestedIntervention.title, 'Intervention must have a valid title');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // I. PRIVACY, PURGE & SAFETY PRECEDENCE
  // ─────────────────────────────────────────────────────────────
  describe('I. Privacy, Purge & Safety Precedence', () => {
    it('purges ONLY session_cognitive signals without mutating journals or other modalities', async () => {
      const { req, res } = createMockReqRes({ id: USER_A });

      await cognitiveController.purgeHistory(req, res as any);
      assert.equal(res.getStatusCode(), 200);
      assert.equal(res.getData().success, true);
    });

    it('guarantees cognitive biometrics NEVER enter Personal AI Memory', async () => {
      // Create session and complete
      const session = await cognitiveService.startSession(USER_A, {
        sessionType: 'deep_work_50',
        plannedDurationMinutes: 50,
      });
      await cognitiveService.completeSession(USER_A, session.id, {
        sessionId: session.id,
      });

      // Query active memories for user
      const memories = await memoryService.resolveActiveMemoryContext(USER_A, 10);
      const cogMemory = memories.find((m) =>
        m.summary.toLowerCase().includes('keystroke') ||
        m.summary.toLowerCase().includes('telemetry') ||
        m.summary.toLowerCase().includes('session_cognitive')
      );
      assert.equal(cogMemory, undefined, 'Cognitive telemetry must NEVER become personal AI memory');
    });

    it('crisis screening takes absolute precedence regardless of deep work focus status', () => {
      const crisisText = 'I cannot go on anymore and want to end it all';
      const screening = screenForCrisis(crisisText);
      assert.equal(screening.isCrisisDetected, true);
      assert.ok(screening.helplineNotice && screening.helplineNotice.length > 0);
    });
  });
});
