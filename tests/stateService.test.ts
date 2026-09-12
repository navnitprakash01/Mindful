import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stateService } from '../src/server/services/stateService';
import { WellnessSignal } from '../src/server/engine/types';

process.env.NODE_ENV = 'test';

describe('StateService - Persistence, Scoping, and Multi-Tenant Isolation', () => {
  it('strictly isolates signals and state estimates between distinct users', async () => {
    const userA = 'user-alpha';
    const userB = 'user-beta';

    const now = new Date();

    // Signal for User A (High anxiety & stress)
    const signalA: WellnessSignal = {
      id: 'sig-a-1',
      userId: userA,
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: 20, confidence: 0.95 },
        stress: { value: 90, confidence: 0.90 },
      },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    // Signal for User B (High joy & calm)
    const signalB: WellnessSignal = {
      id: 'sig-b-1',
      userId: userB,
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: 90, confidence: 0.95 },
        stress: { value: 15, confidence: 0.90 },
      },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    await stateService.ingestSignal(signalA);
    await stateService.ingestSignal(signalB);

    const stateA = await stateService.getCurrentState(userA);
    const stateB = await stateService.getCurrentState(userB);

    // User A should reflect elevated stress and low mood
    assert.strictEqual(stateA.userId, userA);
    assert.ok(stateA.stress > 50, `Expected User A stress > 50, got ${stateA.stress}`);
    assert.ok(stateA.mood < 55, `Expected User A mood < 55, got ${stateA.mood}`);

    // User B should reflect low stress and high mood
    assert.strictEqual(stateB.userId, userB);
    assert.ok(stateB.stress < 30, `Expected User B stress < 30, got ${stateB.stress}`);
    assert.ok(stateB.mood > 70, `Expected User B mood > 70, got ${stateB.mood}`);
    assert.ok(stateA.stress > stateB.stress, 'User A stress should significantly exceed User B');
    assert.ok(stateB.mood > stateA.mood, 'User B mood should significantly exceed User A');

    // Ensure User A's signals are not present in User B's active signals
    const signalsForA = await stateService.getActiveSignals(userA);
    const signalsForB = await stateService.getActiveSignals(userB);

    assert.ok(signalsForA.every((s) => s.userId === userA));
    assert.ok(signalsForB.every((s) => s.userId === userB));
  });

  it('retrieves evidence items explaining the current state', async () => {
    const user = 'user-evidence-test';
    const now = new Date();

    const signal: WellnessSignal = {
      id: 'sig-ev-1',
      userId: user,
      timestamp: now.toISOString(),
      modality: 'text_journal',
      estimates: {
        mood: { value: 82, confidence: 0.85 },
        focus: { value: 85, confidence: 0.80 },
      },
      features: {
        sentimentSummary: 'Felt deep mental clarity while meditating',
      },
      reliabilityWeight: 0.85,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    await stateService.ingestSignal(signal);

    const evidence = await stateService.getStateEvidence(user);
    assert.ok(evidence.length >= 1);
    assert.ok(evidence.some((e) => e.observation.includes('mental clarity')));
  });

  it('calculates personal baseline dynamically for user with recorded history', async () => {
    const user = 'user-baseline-test';
    const baseline = await stateService.getPersonalBaseline(user);

    assert.strictEqual(baseline.userId, user);
    assert.ok(typeof baseline.overallConfidence === 'number');
    assert.ok(typeof baseline.dimensions.mood.mean === 'number');
    assert.ok(typeof baseline.dimensions.stress.mean === 'number');
  });
});
