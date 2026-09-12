/**
 * Pattern Service Integration Tests
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Tests multi-tenant isolation, read-only idempotency, refresh deduplication,
 * and service persistence boundaries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { patternService } from '../src/server/services/patternService';
import { moodService } from '../src/server/services/moodService';
import { isValidUuid } from '../src/server/engine/providers';

process.env.NODE_ENV = 'test';

describe('PatternService - Multi-Tenant Scoping, Idempotency & Persistence', () => {
  const userAlpha = '00000000-0000-4000-8000-0000000000a1';
  const userBeta = '00000000-0000-4000-8000-0000000000b1';

  it('strictly isolates patterns between distinct users', async () => {
    // Record 5 mood check-ins for User Alpha with low energy & 'Deadlines'
    for (let i = 0; i < 5; i++) {
      await moodService.createMoodLog(userAlpha, {
        energyLevel: 3,
        moodType: 'Anxiety',
        notes: `User Alpha Check-in ${i + 1}`,
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
      });
    }

    // Record 5 mood check-ins for User Beta with high energy & 'Nature'
    for (let i = 0; i < 5; i++) {
      await moodService.createMoodLog(userBeta, {
        energyLevel: 9,
        moodType: 'Joy',
        notes: `User Beta Check-in ${i + 1}`,
        triggers: ['Nature'],
        physicalSensations: ['Deep breathing'],
      });
    }

    // Refresh patterns for both users
    const patternsAlpha = await patternService.analyzeAndPersistPatterns(userAlpha);
    const patternsBeta = await patternService.analyzeAndPersistPatterns(userBeta);

    // User Alpha should only own User Alpha patterns
    assert.ok(patternsAlpha.length > 0, 'User Alpha should have discovered patterns');
    assert.ok(patternsAlpha.every((p) => p.userId === userAlpha));

    // User Beta should only own User Beta patterns
    assert.ok(patternsBeta.length > 0, 'User Beta should have discovered patterns');
    assert.ok(patternsBeta.every((p) => p.userId === userBeta));

    // User Beta should NOT contain 'Deadlines' trigger pattern
    assert.ok(!patternsBeta.some((p) => p.patternKey === 'trigger_deadlines'));
    // User Alpha should NOT contain 'Nature' trigger pattern
    assert.ok(!patternsAlpha.some((p) => p.patternKey === 'trigger_nature'));
  });

  it('guarantees getPatterns is read-only and idempotent across repeated calls', async () => {
    const user = '00000000-0000-4000-8000-0000000000c1';

    const firstRead = await patternService.getPatterns(user);
    const secondRead = await patternService.getPatterns(user);

    assert.deepStrictEqual(firstRead, secondRead, 'Repeated reads must return identical patterns without mutation');
  });

  it('guarantees refresh idempotency and prevents duplicate pattern records', async () => {
    const user = '00000000-0000-4000-8000-0000000000d1';

    // Log 4 consistent entries
    for (let i = 0; i < 4; i++) {
      await moodService.createMoodLog(user, {
        energyLevel: 8,
        moodType: 'Calm',
        notes: `Log ${i + 1}`,
        triggers: ['Meditation'],
        physicalSensations: ['Relaxed shoulders'],
      });
    }

    // Run refresh twice
    const firstRun = await patternService.analyzeAndPersistPatterns(user);
    const secondRun = await patternService.analyzeAndPersistPatterns(user);

    // Counts and unique pattern keys must be preserved (no doubling of records)
    assert.strictEqual(firstRun.length, secondRun.length, 'Pattern counts must remain identical on re-run');

    const firstKeys = firstRun.map((p) => p.patternKey).sort();
    const secondKeys = secondRun.map((p) => p.patternKey).sort();
    assert.deepStrictEqual(firstKeys, secondKeys, 'Pattern keys must be deduplicated across runs');

    // All pattern IDs must be valid UUIDs
    for (const p of secondRun) {
      assert.ok(isValidUuid(p.id), `Pattern ID "${p.id}" must be a valid UUID`);
    }
  });

  it('returns empty array when user has 0 historical observations (cold-start safety)', async () => {
    const coldUser = '00000000-0000-4000-8000-0000000000e1';

    const patterns = await patternService.analyzeAndPersistPatterns(coldUser);
    assert.strictEqual(patterns.length, 0, 'Cold user with 0 observations must yield 0 patterns');

    const retrieved = await patternService.getPatterns(coldUser);
    assert.strictEqual(retrieved.length, 0);
  });
});
