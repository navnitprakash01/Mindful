/**
 * Wellness Check Outcome Data Flow & Post-State Integrity Regression Tests
 * Mindful 3.0 — Somatic Reset Outcome Pipeline
 *
 * Verifies all 10 architectural requirements:
 * 1. Two different post-state inputs produce two different displayed/persisted results.
 * 2. The result screen and data flow do NOT contain hardcoded 41/61 values.
 * 3. The result screen and data flow do NOT generate random values.
 * 4. Actual post-state data is used when available.
 * 5. Missing post-state data results in "Not measured" / equivalent honest UI rather than fake numbers.
 * 6. Helpfulness rating remains independent from state measurements.
 * 7. Camera mode does not fabricate Fatigue/Energy from camera metrics.
 * 8. Standard mode still works.
 * 9. Existing EffectivenessEngine behavior remains intact.
 * 10. Existing intervention outcome persistence remains intact.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { interventionService } from '../src/server/services/interventionService';
import {
  computeSessionDeltas,
  calculateInterventionEffectiveness,
} from '../src/server/engine/interventionEngine/effectivenessEngine';

process.env.NODE_ENV = 'test';

describe('Wellness Check Outcome Data Flow — Architectural Integrity', () => {
  const testUserId = '11111111-2222-4333-8444-555555555555';
  const modalPath = path.join(
    process.cwd(),
    'src',
    'components',
    'features',
    'intervention',
    'InterventionPlayerModal.tsx'
  );
  const servicePath = path.join(
    process.cwd(),
    'src',
    'server',
    'services',
    'interventionService.ts'
  );

  const modalSource = fs.readFileSync(modalPath, 'utf8');
  const serviceSource = fs.readFileSync(servicePath, 'utf8');

  beforeEach(() => {
    interventionService._clearMemory();
  });

  it('1. Two different post-state inputs produce two different displayed/persisted results', async () => {
    // RUN 1: Post-state Fatigue = 30, Energy = 75
    const session1 = await interventionService.startSession(testUserId, 'somatic-recovery');
    const result1 = await interventionService.completeSession(testUserId, session1.id, {
      postStateSnapshot: {
        fatigue: 30,
        energy: 75,
      } as any,
      perceivedUsefulness: 4,
    });

    assert.ok(result1);
    assert.strictEqual(result1.postStateSnapshot?.fatigue, 30);
    assert.strictEqual(result1.postStateSnapshot?.energy, 75);

    // RUN 2: Post-state Fatigue = 70, Energy = 35
    const session2 = await interventionService.startSession(testUserId, 'somatic-recovery');
    const result2 = await interventionService.completeSession(testUserId, session2.id, {
      postStateSnapshot: {
        fatigue: 70,
        energy: 35,
      } as any,
      perceivedUsefulness: 2,
    });

    assert.ok(result2);
    assert.strictEqual(result2.postStateSnapshot?.fatigue, 70);
    assert.strictEqual(result2.postStateSnapshot?.energy, 35);

    // Results must be meaningfully distinct
    assert.notStrictEqual(result1.postStateSnapshot?.fatigue, result2.postStateSnapshot?.fatigue);
    assert.notStrictEqual(result1.postStateSnapshot?.energy, result2.postStateSnapshot?.energy);
    assert.notStrictEqual(result1.dimensionDeltas?.fatigue, result2.dimensionDeltas?.fatigue);
    assert.notStrictEqual(result1.dimensionDeltas?.energy, result2.dimensionDeltas?.energy);
  });

  it('2. The result screen and data flow do NOT contain hardcoded 41/61 values', () => {
    // Modal source must not hardcode 41 or 61 as fallback or initial state
    assert.doesNotMatch(
      modalSource,
      /postRatings.*41/,
      'Modal must not hardcode 41 in postRatings'
    );
    assert.doesNotMatch(
      modalSource,
      /postRatings.*61/,
      'Modal must not hardcode 61 in postRatings'
    );
    assert.doesNotMatch(
      serviceSource,
      /41/,
      'interventionService must not hardcode 41'
    );
    assert.doesNotMatch(
      serviceSource,
      /61/,
      'interventionService must not hardcode 61'
    );
  });

  it('3. The result screen and data flow do NOT generate random values', () => {
    assert.doesNotMatch(
      modalSource,
      /Math\.random\(\)/,
      'Modal must not generate random numbers for state scores'
    );
    assert.doesNotMatch(
      serviceSource,
      /Math\.random\(\)/,
      'interventionService must not generate random numbers for state'
    );
  });

  it('4. Actual post-state data is used when available without alteration', async () => {
    const session = await interventionService.startSession(testUserId, 'somatic-recovery');
    const exactFatigue = 28;
    const exactEnergy = 82;

    const completed = await interventionService.completeSession(testUserId, session.id, {
      postStateSnapshot: {
        fatigue: exactFatigue,
        energy: exactEnergy,
      } as any,
      perceivedUsefulness: 5,
    });

    assert.strictEqual(completed.postStateSnapshot?.fatigue, exactFatigue);
    assert.strictEqual(completed.postStateSnapshot?.energy, exactEnergy);

    // Modal UI must support rendering user postStateSnapshot
    assert.match(
      modalSource,
      /completedSession\.postStateSnapshot\?\.\[dim\]/,
      'Modal must read actual postStateSnapshot for dimensions'
    );
  });

  it('5. Missing post-state data results in "Not measured" / equivalent honest UI rather than fake numbers', async () => {
    const session = await interventionService.startSession(testUserId, 'somatic-recovery');

    // Complete session with NO post-state snapshot provided
    const completed = await interventionService.completeSession(testUserId, session.id, {
      perceivedUsefulness: 4,
    });

    // Backend must NOT fabricate postStateSnapshot
    assert.strictEqual(completed.postStateSnapshot, undefined);
    assert.strictEqual(completed.dimensionDeltas, undefined);

    // Modal UI must contain honest "Not measured" display
    assert.match(
      modalSource,
      /Not measured/,
      'Modal must render "Not measured" when post-state data is missing'
    );
    assert.match(
      modalSource,
      /No post-intervention state self-report was recorded for this session/,
      'Modal must explain that no post-state was recorded rather than fabricating fake numbers'
    );
  });

  it('6. Helpfulness rating remains independent from state measurements', async () => {
    const session1 = await interventionService.startSession(testUserId, 'somatic-recovery');
    const res1 = await interventionService.completeSession(testUserId, session1.id, {
      perceivedUsefulness: 1, // Lowest rating
      postStateSnapshot: { fatigue: 20, energy: 80 } as any,
    });

    const session2 = await interventionService.startSession(testUserId, 'somatic-recovery');
    const res2 = await interventionService.completeSession(testUserId, session2.id, {
      perceivedUsefulness: 5, // Highest rating
      postStateSnapshot: { fatigue: 20, energy: 80 } as any,
    });

    // The post-state ratings must remain identical regardless of helpfulness rating
    assert.strictEqual(res1.postStateSnapshot?.fatigue, res2.postStateSnapshot?.fatigue);
    assert.strictEqual(res1.postStateSnapshot?.energy, res2.postStateSnapshot?.energy);
    assert.strictEqual(res1.perceivedUsefulness, 1);
    assert.strictEqual(res2.perceivedUsefulness, 5);
  });

  it('7. Camera mode does not fabricate Fatigue/Energy from camera metrics', async () => {
    const session = await interventionService.startSession(testUserId, 'somatic-recovery');
    const completed = await interventionService.completeSession(testUserId, session.id, {
      perceivedUsefulness: 4,
      biofeedbackSummary: {
        biofeedbackAssisted: true,
        somaticStillnessScore: 92,
        trackingQuality: 0.95,
        pacingCycleSeconds: 8.0,
        samplesCount: 240,
      },
    });

    // biofeedbackSummary is preserved in biofeedbackSummary
    assert.strictEqual(completed.biofeedbackSummary?.somaticStillnessScore, 92);
    // But fatigue/energy post-state must NOT be fabricated from stillness score
    assert.strictEqual(completed.postStateSnapshot, undefined);

    // Modal UI must state camera metrics are not converted to fatigue/energy scores
    assert.match(
      modalSource,
      /Camera biofeedback adapts pacing only and is not converted to emotional or fatigue scores/,
      'UI must explicitly state camera biofeedback is not converted to fatigue/energy scores'
    );
  });

  it('8. Standard mode still works without camera', async () => {
    const session = await interventionService.startSession(testUserId, 'somatic-recovery');
    const completed = await interventionService.completeSession(testUserId, session.id, {
      postStateSnapshot: { fatigue: 25, energy: 75 } as any,
      perceivedUsefulness: 4,
      durationSeconds: 240,
    });

    assert.strictEqual(completed.status, 'completed');
    assert.strictEqual(completed.biofeedbackSummary, undefined);
    assert.strictEqual(completed.postStateSnapshot?.fatigue, 25);
    assert.strictEqual(completed.postStateSnapshot?.energy, 75);
    assert.ok(completed.dimensionDeltas);
  });

  it('9. Existing EffectivenessEngine behavior remains intact', () => {
    const pre = {
      mood: 60,
      stress: 40,
      fatigue: 45,
      energy: 55,
      focus: 60,
      cognitiveLoad: 40,
    };
    const post = {
      fatigue: 25,
      energy: 70,
    } as any;

    const deltas = computeSessionDeltas(pre, post);
    assert.strictEqual(deltas.fatigue, -20);
    assert.strictEqual(deltas.energy, 15);
    // Unmeasured dimensions must NOT produce deltas
    assert.strictEqual(deltas.mood, undefined);
    assert.strictEqual(deltas.stress, undefined);

    // Effectiveness calculation with completed sessions
    const mockSessions: any[] = [
      {
        id: 's1',
        interventionId: 'somatic-recovery',
        status: 'completed',
        perceivedUsefulness: 5,
        dimensionDeltas: { fatigue: -15, energy: 10 },
      },
      {
        id: 's2',
        interventionId: 'somatic-recovery',
        status: 'completed',
        perceivedUsefulness: 4,
        dimensionDeltas: { fatigue: -10, energy: 15 },
      },
    ];

    const eff = calculateInterventionEffectiveness('somatic-recovery', mockSessions);
    assert.strictEqual(eff.completedCount, 2);
    assert.strictEqual(eff.avgUsefulness, 4.5);
    assert.strictEqual(eff.dimensionStats.fatigue?.avgDelta, -12.5);
    assert.strictEqual(eff.dimensionStats.energy?.avgDelta, 12.5);
  });

  it('10. Existing intervention outcome persistence remains intact', async () => {
    const session = await interventionService.startSession(testUserId, 'somatic-recovery');
    await interventionService.completeSession(testUserId, session.id, {
      postStateSnapshot: { fatigue: 30, energy: 70 } as any,
      perceivedUsefulness: 5,
      userFeedback: 'Felt immediate relief in neck',
    });

    const history = await interventionService.getUserHistory(testUserId);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, session.id);
    assert.strictEqual(history[0].status, 'completed');
    assert.strictEqual(history[0].userFeedback, 'Felt immediate relief in neck');
    assert.strictEqual(history[0].postStateSnapshot?.fatigue, 30);
    assert.strictEqual(history[0].postStateSnapshot?.energy, 70);

    // Idempotency: attempting to complete again should return same session without overwrite
    const secondCall = await interventionService.completeSession(testUserId, session.id, {
      perceivedUsefulness: 1,
    });
    assert.strictEqual(secondCall.perceivedUsefulness, 5);
  });
});
