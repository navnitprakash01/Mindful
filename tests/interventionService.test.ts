/**
 * Intervention Service Integration Tests
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Tests the complete loop:
 * Check-In -> State -> Recommendation -> Session Execution -> Post-Check-In Deltas -> State Signal Ingestion
 * Also validates strict UUID validation, idempotency, and multi-tenant isolation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { interventionService } from '../src/server/services/interventionService';
import { stateService } from '../src/server/services/stateService';

process.env.NODE_ENV = 'test';

describe('Intervention Service — Lifecycle & Persistence Isolation', () => {
  const testUserA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const testUserB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(() => {
    interventionService._clearMemory();
  });

  it('retrieves available intervention library list', () => {
    const list = interventionService.getAvailableInterventions();
    assert.strictEqual(list.length, 8);
    assert.ok(list.some((i) => i.id === 'breathing-reset'));
  });

  it('rejects invalid UUID user ID on recommendation', async () => {
    await assert.rejects(
      async () => {
        await interventionService.getRecommendation('not-a-uuid');
      },
      /INVALID_USER_ID/
    );
  });

  it('starts an intervention session with a valid UUID and captures pre-state snapshot', async () => {
    const session = await interventionService.startSession(testUserA, 'breathing-reset');

    assert.ok(session.id);
    assert.match(session.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.strictEqual(session.userId, testUserA);
    assert.strictEqual(session.interventionId, 'breathing-reset');
    assert.strictEqual(session.status, 'started');
    assert.ok(session.preStateSnapshot);
    assert.strictEqual(typeof session.preStateSnapshot.stress, 'number');
  });

  it('completes an intervention session, computes deltas, and updates history', async () => {
    const session = await interventionService.startSession(testUserA, 'breathing-reset');

    const completed = await interventionService.completeSession(testUserA, session.id, {
      postStateSnapshot: {
        mood: 75,
        stress: 20, // Pre was likely 30 or default, so -10 shift
        fatigue: 35,
        energy: 65,
        focus: 70,
        cognitiveLoad: 35,
      },
      perceivedUsefulness: 5,
      userFeedback: 'Felt much more centered afterward.',
      durationSeconds: 180,
    });

    assert.strictEqual(completed.status, 'completed');
    assert.ok(completed.completedAt);
    assert.strictEqual(completed.perceivedUsefulness, 5);
    assert.strictEqual(completed.userFeedback, 'Felt much more centered afterward.');
    assert.ok(completed.dimensionDeltas);
    assert.strictEqual(typeof completed.dimensionDeltas.stress, 'number');

    const history = await interventionService.getUserHistory(testUserA);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, session.id);
    assert.strictEqual(history[0].status, 'completed');
  });

  it('guarantees idempotency when completing an already completed session', async () => {
    const session = await interventionService.startSession(testUserA, 'focus-reset');

    const firstComplete = await interventionService.completeSession(testUserA, session.id, {
      perceivedUsefulness: 4,
      durationSeconds: 420,
    });

    const secondComplete = await interventionService.completeSession(testUserA, session.id, {
      perceivedUsefulness: 1, // Should not overwrite
      durationSeconds: 999,
    });

    assert.strictEqual(firstComplete.completedAt, secondComplete.completedAt);
    assert.strictEqual(secondComplete.perceivedUsefulness, 4);
  });

  it('enforces multi-tenant isolation (User B cannot complete User A session)', async () => {
    const sessionA = await interventionService.startSession(testUserA, 'cognitive-unload');

    await assert.rejects(
      async () => {
        await interventionService.completeSession(testUserB, sessionA.id, {
          perceivedUsefulness: 5,
        });
      },
      /SESSION_NOT_FOUND/
    );

    const historyB = await interventionService.getUserHistory(testUserB);
    assert.strictEqual(historyB.length, 0);
  });

  it('computes personal effectiveness statistics from completed sessions', async () => {
    const session1 = await interventionService.startSession(testUserA, 'breathing-reset');
    await interventionService.completeSession(testUserA, session1.id, {
      postStateSnapshot: { mood: 75, stress: 20, fatigue: 30, energy: 65, focus: 75, cognitiveLoad: 25 },
      perceivedUsefulness: 5,
    });

    const session2 = await interventionService.startSession(testUserA, 'breathing-reset');
    await interventionService.completeSession(testUserA, session2.id, {
      postStateSnapshot: { mood: 80, stress: 25, fatigue: 30, energy: 70, focus: 75, cognitiveLoad: 25 },
      perceivedUsefulness: 4,
    });

    const eff = await interventionService.getEffectiveness(testUserA);
    const breathingEff = eff['breathing-reset'];

    assert.ok(breathingEff);
    assert.strictEqual(breathingEff.completedCount, 2);
    assert.strictEqual(breathingEff.avgUsefulness, 4.5);
    assert.strictEqual(breathingEff.completionRate, 1.0);
  });

  it('feeds completed intervention outcome back into State Engine as a WellnessSignal closing the loop', async () => {
    // Start with fresh state
    const session = await interventionService.startSession(testUserA, 'somatic-recovery');

    // Complete session with reflective post-state
    await interventionService.completeSession(testUserA, session.id, {
      postStateSnapshot: {
        mood: 82,
        stress: 18,
        fatigue: 22,
        energy: 78,
        focus: 80,
        cognitiveLoad: 20,
      },
      perceivedUsefulness: 5,
      userFeedback: 'Felt immediate tension release in shoulders',
      durationSeconds: 240,
    });

    // Check State Engine — it should have ingested the outcome signal!
    const currentState = await stateService.getCurrentState(testUserA);
    assert.ok(currentState);
    assert.ok(currentState.activeSignalsCount > 0);
    // Source summary should reflect intervention outcome modality
    assert.ok(
      currentState.sourceSummary['intervention_outcome'] !== undefined,
      'intervention_outcome must be registered in state source summary'
    );
    // Triggers should include intervention ID
    assert.ok(currentState.contextualTriggers.includes('somatic-recovery'));
  });

  it('rejects unknown intervention IDs on session start', async () => {
    await assert.rejects(
      async () => {
        await interventionService.startSession(testUserA, 'non-existent-protocol');
      },
      /INTERVENTION_NOT_FOUND/
    );
  });

  it('rejects invalid UUIDs across session methods', async () => {
    await assert.rejects(
      async () => {
        await interventionService.startSession('invalid-uuid', 'breathing-reset');
      },
      /INVALID_USER_ID/
    );

    await assert.rejects(
      async () => {
        await interventionService.completeSession('invalid-user', '11111111-1111-4111-8111-111111111111', {});
      },
      /INVALID_USER_ID/
    );

    await assert.rejects(
      async () => {
        await interventionService.completeSession(testUserA, 'invalid-session', {});
      },
      /INVALID_SESSION_ID/
    );
  });
});
