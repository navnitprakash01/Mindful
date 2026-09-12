import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { moodService } from '../src/server/services/moodService';
import { stateService } from '../src/server/services/stateService';
import { isValidUuid } from '../src/server/engine/providers';
import { SignalExtractor } from '../src/server/engine/signalExtractor';

process.env.NODE_ENV = 'test';

describe('Mood Integration & Signal Pipeline Tests', () => {
  const testUserId = '00000000-0000-4000-8000-000000000001';

  it('validates all 7 mood types and creates mood log with valid UUID', async () => {
    const moodTypes = ['Joy', 'Calm', 'Focus', 'Anxiety', 'Melancholy', 'Gratitude', 'Restless'] as const;

    for (const moodType of moodTypes) {
      const log = await moodService.createMoodLog(testUserId, {
        energyLevel: 7,
        moodType,
        notes: `Checking in with ${moodType}`,
        triggers: ['Test Trigger'],
        physicalSensations: ['Deep breathing'],
      });

      assert.ok(log.id, 'Log should have an id');
      assert.ok(isValidUuid(log.id), `Generated ID "${log.id}" must be a valid UUID`);
      assert.strictEqual(log.userId, testUserId);
      assert.strictEqual(log.moodType, moodType);
      assert.strictEqual(log.energyLevel, 7);
      assert.strictEqual(log.notes, `Checking in with ${moodType}`);
    }
  });

  it('automatically extracts and ingests high-confidence wellness signal upon mood check-in', async () => {
    const joyUser = '00000000-0000-4000-8000-000000000002';

    await moodService.createMoodLog(joyUser, {
      energyLevel: 9,
      moodType: 'Joy',
      notes: 'Feeling radiant and full of vitality',
      triggers: ['Nature', 'Exercise'],
      physicalSensations: ['Warmth', 'Lightness in chest'],
    });

    const activeSignals = await stateService.getActiveSignals(joyUser);
    assert.ok(activeSignals.length > 0, 'Should have at least 1 active signal');

    const moodSignal = activeSignals.find((s) => s.modality === 'mood_checkin');
    assert.ok(moodSignal, 'Active signals should include a mood_checkin modality signal');
    assert.ok(isValidUuid(moodSignal.id), 'Signal ID must be valid UUID');
    assert.strictEqual(moodSignal.userId, joyUser);
    assert.strictEqual(moodSignal.reliabilityWeight, 1.0, 'Self-report mood check-in should have reliabilityWeight = 1.0');

    // Check estimates
    assert.ok(moodSignal.estimates.mood, 'Signal should estimate mood');
    assert.ok((moodSignal.estimates.mood?.value ?? 0) >= 80, 'Joy should produce high mood estimate');
    assert.ok(moodSignal.estimates.energy, 'Signal should estimate energy');
    assert.ok((moodSignal.estimates.energy?.value ?? 0) >= 80, 'Level 9 energy should produce high energy estimate');
  });

  it('updates personal state dynamically after mood check-in ingestion', async () => {
    const calmUser = '00000000-0000-4000-8000-000000000003';

    // Prior to check-in, state has 0 confidence / 0 signals
    const initialState = await stateService.getCurrentState(calmUser);
    assert.strictEqual(initialState.activeSignalsCount, 0);
    assert.strictEqual(initialState.overallConfidence, 0);

    // Record calm check-in
    await moodService.createMoodLog(calmUser, {
      energyLevel: 6,
      moodType: 'Calm',
      notes: 'Peaceful afternoon',
      triggers: ['Meditation'],
      physicalSensations: ['Relaxed shoulders', 'Deep breathing'],
    });

    // Recompute state
    const updatedState = await stateService.recomputeState(calmUser);
    assert.ok(updatedState.activeSignalsCount >= 1, 'Should have active signals counted');
    assert.ok(updatedState.overallConfidence > 0, 'Overall confidence should now be > 0');
    assert.ok(updatedState.stress < 40, 'Calm check-in should lower stress below 40');
    assert.ok(updatedState.mood > 60, 'Calm check-in should raise mood above 60');
  });

  it('SignalExtractor maps Restless mood to elevated energy and stress', () => {
    const signal = SignalExtractor.fromMoodLog({
      id: '00000000-0000-4000-8000-000000000004',
      userId: 'test-restless-user',
      timestamp: new Date().toISOString(),
      energyLevel: 8,
      moodType: 'Restless',
      notes: 'Cannot sit still',
      triggers: ['Deadlines'],
      physicalSensations: ['Tightness in neck'],
    });

    assert.strictEqual(signal.modality, 'mood_checkin');
    assert.ok(signal.estimates.stress, 'Restless should map to stress estimate');
    assert.ok((signal.estimates.stress?.value ?? 0) >= 60, 'Restless should have elevated stress >= 60');
    assert.ok(signal.estimates.energy, 'Restless should map to energy estimate');
    assert.ok((signal.estimates.energy?.value ?? 0) >= 70, 'Restless with level 8 should have energy >= 70');
  });

  it('SignalExtractor maps Anxiety mood to high stress and cognitive load', () => {
    const signal = SignalExtractor.fromMoodLog({
      id: '00000000-0000-4000-8000-000000000005',
      userId: 'test-anxiety-user',
      timestamp: new Date().toISOString(),
      energyLevel: 4,
      moodType: 'Anxiety',
      notes: 'Feeling nervous about tomorrow',
      triggers: ['Public Speaking'],
      physicalSensations: ['Shallow breathing'],
    });

    assert.ok((signal.estimates.stress?.value ?? 0) >= 75, 'Anxiety should yield high stress');
    assert.ok((signal.estimates.mood?.value ?? 0) <= 35, 'Anxiety should yield low mood');
  });

  it('SignalExtractor maps Melancholy mood to low energy and elevated fatigue', () => {
    const signal = SignalExtractor.fromMoodLog({
      id: '00000000-0000-4000-8000-000000000006',
      userId: 'test-melancholy-user',
      timestamp: new Date().toISOString(),
      energyLevel: 3,
      moodType: 'Melancholy',
      notes: 'Feeling down today',
      triggers: [],
      physicalSensations: [],
    });

    assert.ok((signal.estimates.mood?.value ?? 0) <= 40, 'Melancholy should yield low mood');
    assert.ok((signal.estimates.energy?.value ?? 0) <= 40, 'Melancholy should yield low energy');
    assert.ok((signal.estimates.fatigue?.value ?? 0) >= 60, 'Melancholy should yield elevated fatigue');
  });

  it('lists mood logs for user in reverse chronological order', async () => {
    const listUser = '00000000-0000-4000-8000-000000000007';

    await moodService.createMoodLog(listUser, {
      energyLevel: 5,
      moodType: 'Focus',
      notes: 'First log',
      triggers: [],
      physicalSensations: [],
    });

    await moodService.createMoodLog(listUser, {
      energyLevel: 8,
      moodType: 'Gratitude',
      notes: 'Second log',
      triggers: [],
      physicalSensations: [],
    });

    const logs = await moodService.listMoodLogs(listUser, 10);
    assert.ok(logs.length >= 2);
    assert.strictEqual(logs[0].notes, 'Second log', 'Most recent log should appear first');
    assert.strictEqual(logs[1].notes, 'First log');
  });

  it('isolates mood logs strictly between different users', async () => {
    const userX = '00000000-0000-4000-8000-000000000008';
    const userY = '00000000-0000-4000-8000-000000000009';

    await moodService.createMoodLog(userX, {
      energyLevel: 9,
      moodType: 'Joy',
      notes: 'User X Private Log',
      triggers: [],
      physicalSensations: [],
    });

    const logsForY = await moodService.listMoodLogs(userY, 10);
    assert.ok(
      logsForY.every((l) => l.userId === userY),
      'User Y should not see User X mood logs'
    );
    assert.ok(
      !logsForY.some((l) => l.notes === 'User X Private Log'),
      'User Y logs must not contain User X logs'
    );
  });
});

describe('Your Emotional Rhythm - 7-Day Timeline & Factual Trend Engine', () => {
  const baseDate = new Date('2026-09-12T12:00:00.000Z');

  it('handles empty state (0 logs) with exactly 7 empty slots and isToday on final slot', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    const slots = calculateSevenDaySlots([], baseDate);
    assert.strictEqual(slots.length, 7, 'Must generate exactly 7 day slots');

    // All slots have no primaryLog
    assert.ok(slots.every((s) => s.primaryLog === null), 'All slots must be empty when no logs exist');

    // Exactly one slot is today (the last one)
    assert.strictEqual(slots[6].isToday, true, 'Slot 6 must be marked as today');
    assert.ok(slots.slice(0, 6).every((s) => !s.isToday), 'Prior slots must not be marked as today');

    // Trend insight displays cold start guidance
    const trend = calculateTrendInsight(slots);
    assert.strictEqual(trend.hasEnoughData, false);
    assert.strictEqual(trend.title, 'Building your emotional rhythm');
    assert.strictEqual(trend.description, 'Log a few more check-ins to uncover patterns.');
  });

  it('accurately maps single mood entry to correct date slot without fabricating missing days', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    // One log on today
    const singleLog = {
      id: 'log-today-1',
      timestamp: baseDate.toISOString(),
      energyLevel: 8,
      moodType: 'Calm' as const,
      notes: 'Peaceful afternoon',
      triggers: ['Meditation'],
      physicalSensations: ['Deep breathing'],
    };

    const slots = calculateSevenDaySlots([singleLog], baseDate);
    assert.strictEqual(slots.length, 7);

    // Slot 6 (today) has the log
    assert.ok(slots[6].primaryLog !== null);
    assert.strictEqual(slots[6].primaryLog?.energyLevel, 8);
    assert.strictEqual(slots[6].primaryLog?.moodType, 'Calm');

    // Slots 0 to 5 must remain null (no fabrication / no interpolation)
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(slots[i].primaryLog, null, `Slot ${i} must have primaryLog === null`);
    }

    // Still insufficient for psychological trend (< 3 observations)
    const trend = calculateTrendInsight(slots);
    assert.strictEqual(trend.hasEnoughData, false);
    assert.strictEqual(trend.title, 'Building your emotional rhythm');
  });

  it('handles sparse data (2 entries) with missing days preserved as null', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    // One log 4 days ago, one log today
    const dateFourDaysAgo = new Date(baseDate.getTime() - 4 * 86400000);

    const logs = [
      {
        id: 'log-today',
        timestamp: baseDate.toISOString(),
        energyLevel: 7,
        moodType: 'Focus' as const,
        notes: 'Productive coding',
        triggers: ['Creative Work'],
        physicalSensations: [],
      },
      {
        id: 'log-past',
        timestamp: dateFourDaysAgo.toISOString(),
        energyLevel: 5,
        moodType: 'Calm' as const,
        notes: 'Quiet evening',
        triggers: [],
        physicalSensations: [],
      },
    ];

    const slots = calculateSevenDaySlots(logs, baseDate);
    assert.strictEqual(slots.filter((s) => s.primaryLog !== null).length, 2);

    // The days in between must be strictly null
    const populatedIndices = slots.map((s, idx) => (s.primaryLog !== null ? idx : -1)).filter((idx) => idx !== -1);
    assert.deepStrictEqual(populatedIndices, [2, 6], 'Only slots 2 and 6 should be populated');

    // 2 entries is still < 3: no speculative claims
    const trend = calculateTrendInsight(slots);
    assert.strictEqual(trend.hasEnoughData, false);
  });

  it('detects upward energy trend and most common mood when 3+ entries exist', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    // Logs spanning 4 days with increasing energy and mostly Calm
    const logs = [
      {
        id: 'log-1',
        timestamp: new Date(baseDate.getTime() - 4 * 86400000).toISOString(),
        energyLevel: 4,
        moodType: 'Calm' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-2',
        timestamp: new Date(baseDate.getTime() - 2 * 86400000).toISOString(),
        energyLevel: 6,
        moodType: 'Calm' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-3',
        timestamp: new Date(baseDate.getTime() - 1 * 86400000).toISOString(),
        energyLevel: 7,
        moodType: 'Joy' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-4',
        timestamp: baseDate.toISOString(),
        energyLevel: 8,
        moodType: 'Calm' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
    ];

    const slots = calculateSevenDaySlots(logs, baseDate);
    const trend = calculateTrendInsight(slots);

    assert.strictEqual(trend.hasEnoughData, true);
    // Delta is 8 - 4 = 4 (upward >= 2)
    assert.ok(trend.title.includes('trending upward (+4 pts)'));
    assert.ok(trend.description.includes('Calm was logged on 3 of 4 recorded days'));
  });

  it('detects downward energy trend when delta <= -2', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    const logs = [
      {
        id: 'log-1',
        timestamp: new Date(baseDate.getTime() - 3 * 86400000).toISOString(),
        energyLevel: 8,
        moodType: 'Joy' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-2',
        timestamp: new Date(baseDate.getTime() - 2 * 86400000).toISOString(),
        energyLevel: 6,
        moodType: 'Focus' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-3',
        timestamp: baseDate.toISOString(),
        energyLevel: 5,
        moodType: 'Melancholy' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
    ];

    const slots = calculateSevenDaySlots(logs, baseDate);
    const trend = calculateTrendInsight(slots);

    assert.strictEqual(trend.hasEnoughData, true);
    assert.ok(trend.title.includes('trending downward (-3 pts)'));
  });

  it('detects high energy variance when range >= 4', async () => {
    const { calculateSevenDaySlots, calculateTrendInsight } = await import(
      '../src/lib/emotionalRhythm'
    );

    // Delta between first and last is 0, but range is 9 - 3 = 6 >= 4
    const logs = [
      {
        id: 'log-1',
        timestamp: new Date(baseDate.getTime() - 4 * 86400000).toISOString(),
        energyLevel: 5,
        moodType: 'Calm' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-2',
        timestamp: new Date(baseDate.getTime() - 3 * 86400000).toISOString(),
        energyLevel: 9,
        moodType: 'Joy' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-3',
        timestamp: new Date(baseDate.getTime() - 2 * 86400000).toISOString(),
        energyLevel: 3,
        moodType: 'Melancholy' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
      {
        id: 'log-4',
        timestamp: baseDate.toISOString(),
        energyLevel: 5,
        moodType: 'Calm' as const,
        notes: '',
        triggers: [],
        physicalSensations: [],
      },
    ];

    const slots = calculateSevenDaySlots(logs, baseDate);
    const trend = calculateTrendInsight(slots);

    assert.strictEqual(trend.hasEnoughData, true);
    assert.ok(trend.title.includes('varied significantly this week (3–9/10)'));
  });
});

