/**
 * Behavioral Rituals & Habit Action Intelligence Integration & Security Tests
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { habitController } from '../src/server/controllers/habitController';
import { habitService } from '../src/server/services/habitService';
import { HabitSignalProvider } from '../src/server/engine/habits/habitSignalProvider';
import { calculateCompassionateStreak } from '../src/server/engine/habits/streak';
import {
  HabitDefinition,
  validateCreateHabitInput,
  validateUpdateHabitInput,
  validateHabitCompletionInput,
} from '../src/server/engine/habits/types';
import { stateService } from '../src/server/services/stateService';
import { memoryService } from '../src/server/services/memoryService';
import { GraphBuilder } from '../src/server/engine/evidenceGraph/graphBuilder';
import { ExplanationBuilder } from '../src/server/engine/evidenceGraph/explanationBuilder';
import { defaultPatternEngine } from '../src/server/engine/patternEngine/patternEngine';
import { detectHabitRhythms } from '../src/server/engine/patternEngine/detectors/habitRhythmDetector';
import { AuthenticatedRequest } from '../src/server/middleware/auth';
import { WellnessSignal, PersonalState } from '../src/server/engine/types';

process.env.NODE_ENV = 'test';

const USER_A = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

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

  return { req: req as any, res: res as any };
}

function createTestHabit(overrides: Partial<HabitDefinition> = {}): HabitDefinition {
  return {
    id: randomUUID(),
    userId: USER_A,
    title: 'Daily Habit',
    description: 'Test habit description',
    category: 'mindfulness',
    preferredTimeWindow: 'morning',
    status: 'active',
    streak: 1,
    bestStreak: 1,
    targetFrequency: 7,
    completedDates: ['2026-09-12'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Phase 11: Behavioral Rituals & Habit Action Intelligence Tests', () => {
  beforeEach(async () => {
    await habitService.purgeHistory(USER_A);
    await habitService.purgeHistory(USER_B);
    await stateService.purgeSignals(USER_A);
    await stateService.purgeSignals(USER_B);
  });

  // =========================================================================
  // 1. Domain Validation & Sanitization
  // =========================================================================
  describe('1. Domain Validation & Sanitization', () => {
    it('accepts valid habit creation payload with default rest days', () => {
      const input = {
        title: 'Morning Breathwork',
        description: '5 minutes mindful box breathing.',
        category: 'mindfulness' as const,
        targetFrequency: 7,
      };
      const res = validateCreateHabitInput(input);
      assert.equal(res.isValid, true);
      assert.equal(res.error, undefined);
    });

    it('rejects habit creation with empty or whitespace title', () => {
      const input = { title: '   ', category: 'mindfulness' as const };
      const res = validateCreateHabitInput(input);
      assert.equal(res.isValid, false);
      assert.match(res.error!, /non-empty string/i);
    });

    it('rejects habit creation exceeding title max length (100 chars)', () => {
      const input = { title: 'a'.repeat(101), category: 'mindfulness' as const };
      const res = validateCreateHabitInput(input);
      assert.equal(res.isValid, false);
      assert.match(res.error!, /must not exceed 100/i);
    });

    it('rejects habit creation exceeding description max length (500 chars)', () => {
      const input = {
        title: 'Valid Title',
        description: 'd'.repeat(501),
        category: 'movement' as const,
      };
      const res = validateCreateHabitInput(input);
      assert.equal(res.isValid, false);
      assert.match(res.error!, /must not exceed 500/i);
    });

    it('rejects targetFrequency outside [1, 7]', () => {
      const tooLow = validateCreateHabitInput({ title: 'Low', targetFrequency: 0 });
      assert.equal(tooLow.isValid, false);
      const tooHigh = validateCreateHabitInput({ title: 'High', targetFrequency: 8 });
      assert.equal(tooHigh.isValid, false);
    });

    it('rejects restDaysAllowed >= targetFrequency when invalid', () => {
      const invalid = validateCreateHabitInput({
        title: 'Rest Day Mismatch',
        category: 'mindfulness' as const,
        targetFrequency: 3,
        restDaysAllowed: 5,
      });
      assert.equal(invalid.isValid, false);
      assert.match(invalid.error!, /must be fewer than/i);
    });

    it('sanitizes HTML and script tags in title and description', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Evening Reflection <script>alert("hack")</script>',
        description: 'Observing <img src=x onerror=alert(1)> sunset.',
        category: 'reflection',
      });
      assert.ok(!habit.title.includes('<script>'));
      assert.ok(!habit.description?.includes('<img'));
    });

    it('validates ISO-8601 completion timestamp and rejects corrupt timestamps', () => {
      const now = new Date().toISOString();
      const valid = validateHabitCompletionInput({
        completedAt: now,
      });
      assert.equal(valid.isValid, true);

      const invalidDate = validateHabitCompletionInput({
        completedAt: 'not-a-valid-date-string',
      });
      assert.equal(invalidDate.isValid, false);

      const futureDate = validateHabitCompletionInput({
        completedAt: '2030-01-01T00:00:00.000Z',
      });
      assert.equal(futureDate.isValid, false);
      assert.match(futureDate.error!, /future/i);
    });
  });

  // =========================================================================
  // 2. Compassionate Consistency & Streak Invariants
  // =========================================================================
  describe('2. Compassionate Consistency & Streak Invariants', () => {
    it('single completion yields streak = 1 and bestStreak = 1', () => {
      const today = '2026-09-15';
      const streak = calculateCompassionateStreak([today], 7, today, 0, 1);
      assert.equal(streak.currentStreak, 1);
      assert.equal(streak.bestStreak, 1);
      assert.equal(streak.status, 'active');
    });

    it('consecutive daily completions monotonically increment streak', () => {
      const dates = ['2026-09-13', '2026-09-14', '2026-09-15'];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 0, 1);
      assert.equal(streak.currentStreak, 3);
      assert.equal(streak.bestStreak, 3);
    });

    it('compassionate rest day: missing 1 day within restDaysAllowed preserves streak', () => {
      // Completed Sept 13 and Sept 15 (Sept 14 is a rest day, restDaysAllowed = 1)
      const dates = ['2026-09-13', '2026-09-15'];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 0, 1);
      assert.equal(streak.currentStreak, 2);
      assert.equal(streak.restDaysHonored, 1);
      assert.equal(streak.status, 'active');
    });

    it('missed days exceeding restDaysAllowed gracefully resets current streak while preserving bestStreak', () => {
      // Completed Sept 10, then gap until today (Sept 15)
      const dates = ['2026-09-08', '2026-09-09', '2026-09-10'];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 3, 1);
      assert.equal(streak.currentStreak, 0);
      assert.equal(streak.bestStreak, 3);
      assert.equal(streak.status, 'paused');
    });

    it('positive restart: completing today after broken streak sets streak = 1 without penalty', () => {
      const dates = ['2026-09-01', '2026-09-02', '2026-09-15'];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 2, 1);
      assert.equal(streak.currentStreak, 1);
      assert.equal(streak.bestStreak, 2);
      assert.equal(streak.status, 'active');
    });

    it('guarantees streak is never negative even with irregular dates', () => {
      const dates: string[] = [];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 0, 1);
      assert.equal(streak.currentStreak, 0);
      assert.ok(streak.currentStreak >= 0);
      assert.ok(streak.bestStreak >= 0);
    });

    it('when restDaysAllowed = 0, missed day immediately pauses streak', () => {
      const dates = ['2026-09-13', '2026-09-15']; // missed Sept 14
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 0, 0);
      assert.equal(streak.currentStreak, 1); // only Sept 15 counts
    });

    it('multiple completions on identical calendar day count as exactly 1 completion date', () => {
      const dates = ['2026-09-15', '2026-09-15', '2026-09-15'];
      const streak = calculateCompassionateStreak(dates, 7, '2026-09-15', 0, 1);
      assert.equal(streak.currentStreak, 1);
    });
  });

  // =========================================================================
  // 3. Idempotency & Lifecycle Transitions
  // =========================================================================
  describe('3. Idempotency & Lifecycle Transitions', () => {
    it('duplicate completion on same date is idempotent (no duplicate dates, no duplicate signals)', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Morning Stretch',
        category: 'movement',
      });

      const today = new Date().toISOString().split('T')[0];

      const first = await habitService.completeHabit(USER_A, habit.id, {
        completionDate: today,
      });
      assert.equal(first.isNewCompletion, true);
      assert.ok(first.signal !== undefined);

      const duplicate = await habitService.completeHabit(USER_A, habit.id, {
        completionDate: today,
      });
      assert.equal(duplicate.isNewCompletion, false);
      assert.equal(duplicate.signal, undefined);

      const refreshed = await habitService.getHabitById(USER_A, habit.id);
      assert.equal(refreshed?.completedDates.length, 1);
    });

    it('uncomplete removes completion date and recalculates streak backwards', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Evening Sunset Walk',
        category: 'movement',
      });

      const today = new Date().toISOString().split('T')[0];

      await habitService.completeHabit(USER_A, habit.id, {
        completionDate: today,
      });
      let current = await habitService.getHabitById(USER_A, habit.id);
      assert.equal(current?.completedDates.length, 1);

      await habitService.uncompleteHabit(USER_A, habit.id, today);
      current = await habitService.getHabitById(USER_A, habit.id);
      assert.equal(current?.completedDates.length, 0);
      assert.equal(current?.streak, 0);
    });

    it('rejects completion on an archived habit with error', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Old Habit',
        category: 'rest',
      });

      await habitService.archiveHabit(USER_A, habit.id);

      await assert.rejects(
        () => habitService.completeHabit(USER_A, habit.id, {}),
        /Cannot complete habit with status/i
      );
    });

    it('pausing and resuming habit preserves previous streak and completion history', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Daily Reading',
        category: 'reflection',
      });

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      await habitService.completeHabit(USER_A, habit.id, {
        completionDate: yesterday,
      });

      await habitService.updateHabit(USER_A, habit.id, { status: 'paused' });
      let h = await habitService.getHabitById(USER_A, habit.id);
      assert.equal(h?.status, 'paused');
      assert.equal(h?.completedDates.length, 1);

      await habitService.updateHabit(USER_A, habit.id, { status: 'active' });
      h = await habitService.getHabitById(USER_A, habit.id);
      assert.equal(h?.status, 'active');
      assert.equal(h?.completedDates.length, 1);
    });
  });

  // =========================================================================
  // 4. Signal Modality & Score Jump Impossibility
  // =========================================================================
  describe('4. Signal Modality & Score Jump Impossibility', () => {
    it('produces canonical SignalModality = "habit_action" with reliabilityWeight <= 0.35', () => {
      const habit = createTestHabit({
        title: 'Mindful Breathing',
        category: 'mindfulness',
        streak: 5,
        bestStreak: 7,
        completedDates: ['2026-09-12'],
      });

      const signal = HabitSignalProvider.createSignal(habit, '2026-09-12T08:00:00.000Z');
      assert.equal(signal.modality, 'habit_action');
      assert.ok(signal.reliabilityWeight <= 0.35);
      assert.ok(signal.reliabilityWeight >= 0.20);
    });

    it('mood is strictly omitted / invariant (no arbitrary mood score jump)', () => {
      const habit = createTestHabit({
        title: 'Hydration Ritual',
        category: 'movement',
        streak: 10,
        bestStreak: 10,
        completedDates: ['2026-09-12'],
      });

      const signal = HabitSignalProvider.createSignal(habit, '2026-09-12T08:00:00.000Z');
      assert.equal((signal.features as any).mood, undefined);
      assert.equal((signal.features as any).valence, undefined);
    });

    it('stress decrement is bounded to max 8 points', () => {
      const habit = createTestHabit({
        title: 'Unguided Meditation',
        category: 'mindfulness',
        streak: 15,
        bestStreak: 20,
        completedDates: ['2026-09-12'],
      });

      const signal = HabitSignalProvider.createSignal(habit, '2026-09-12T08:00:00.000Z');
      const stressDelta = (signal.features as any).stressDelta;
      assert.ok(stressDelta <= 0);
      assert.ok(stressDelta >= -8);
    });

    it('category mappings reflect physiological anchors without diagnostic claims', () => {
      const categories = ['mindfulness', 'movement', 'reflection', 'rest', 'gratitude'] as const;
      for (const cat of categories) {
        const habit = createTestHabit({
          title: `Daily ${cat}`,
          category: cat,
          completedDates: ['2026-09-12'],
        });
        const signal = HabitSignalProvider.createSignal(habit, '2026-09-12T08:00:00.000Z');
        assert.ok(signal.features.themes?.includes(cat));
      }
    });

    it('completing habit updates PersonalState through StateService without bypassing fusion', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Morning Yoga',
        category: 'movement',
      });

      const res = await habitService.completeHabit(USER_A, habit.id, {
        completionDate: new Date().toISOString().split('T')[0],
      });
      assert.ok(res.signal);

      const signals = await stateService.getActiveSignals(USER_A);
      const habitSignal = signals.find((s) => s.id === res.signal?.id);
      assert.ok(habitSignal);
      assert.equal(habitSignal.modality, 'habit_action');
    });
  });

  // =========================================================================
  // 5. PatternEngine & Longitudinal Rhythm Correlation
  // =========================================================================
  describe('5. PatternEngine & Longitudinal Rhythm Correlation', () => {
    it('requires >= 5 completions across >= 7 distinct days before generating rhythm pattern', () => {
      // 3 completions across 3 days — below threshold
      const observations: any[] = [
        {
          id: randomUUID(),
          timestamp: '2026-09-01T08:00:00.000Z',
          sourceId: 'habit-1',
          data: { category: 'mindfulness' },
        },
        {
          id: randomUUID(),
          timestamp: '2026-09-02T08:00:00.000Z',
          sourceId: 'habit-1',
          data: { category: 'mindfulness' },
        },
        {
          id: randomUUID(),
          timestamp: '2026-09-03T08:00:00.000Z',
          sourceId: 'habit-1',
          data: { category: 'mindfulness' },
        },
      ];

      const detected = detectHabitRhythms(USER_A, observations);
      assert.equal(detected.length, 0);
    });

    it('generates habit_rhythm_correlation pattern when criteria are met', () => {
      const observations: any[] = [];
      const habitDays = [
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06',
        '2026-09-07',
      ];

      // Habit completions on those 7 days
      for (const day of habitDays) {
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T08:00:00.000Z`,
          dateKey: day,
          modality: 'habit_action',
          triggers: ['ritual_mindfulness'],
          dimensions: {},
        });
        // State observation on habit day with low stress (25)
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T12:00:00.000Z`,
          dateKey: day,
          modality: 'mood_checkin',
          triggers: [],
          dimensions: { stress: 25 },
        });
      }

      // Rest days with higher stress (55)
      const restDays = ['2026-09-08', '2026-09-09', '2026-09-10'];
      for (const day of restDays) {
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T12:00:00.000Z`,
          dateKey: day,
          modality: 'mood_checkin',
          triggers: [],
          dimensions: { stress: 55 },
        });
      }

      const detected = detectHabitRhythms(USER_A, observations);
      assert.ok(detected.length >= 1);
      assert.equal(detected[0].type, 'habit_rhythm_correlation');
    });

    it('strictly uses associative language ("tend to coincide with") without causal claims', () => {
      const observations: any[] = [];
      const habitDays = [
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06',
        '2026-09-07',
      ];

      for (const day of habitDays) {
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T08:00:00.000Z`,
          dateKey: day,
          modality: 'habit_action',
          triggers: ['ritual_mindfulness'],
          dimensions: {},
        });
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T12:00:00.000Z`,
          dateKey: day,
          modality: 'mood_checkin',
          triggers: [],
          dimensions: { stress: 20 },
        });
      }
      for (const day of ['2026-09-08', '2026-09-09', '2026-09-10']) {
        observations.push({
          id: randomUUID(),
          timestamp: `${day}T12:00:00.000Z`,
          dateKey: day,
          modality: 'mood_checkin',
          triggers: [],
          dimensions: { stress: 50 },
        });
      }

      const detected = detectHabitRhythms(USER_A, observations);
      assert.ok(detected.length >= 1);
      const desc = detected[0].description.toLowerCase();
      assert.ok(desc.includes('tend to coincide with'));
      assert.ok(!desc.includes('caused'));
      assert.ok(!desc.includes('proves'));
      assert.ok(!desc.includes('cures'));
    });

    it('integrates cleanly into full PatternEngine analyze pipeline', () => {
      const patterns = defaultPatternEngine.analyze(USER_A, []);
      assert.ok(Array.isArray(patterns));
    });
  });

  // =========================================================================
  // 6. EvidenceGraph & Provenance Integration
  // =========================================================================
  describe('6. EvidenceGraph & Provenance Integration', () => {
    it('habit completion signal creates raw_signal node labeled "Behavioral Ritual"', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        modality: 'habit_action',
        sourceId: 'habit-123',
        timestamp: new Date().toISOString(),
        reliabilityWeight: 0.3,
        estimates: {},
        features: {
          themes: ['mindfulness'],
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: null,
        signals: [signal],
      });

      const signalNode = Object.values(graph.nodes).find(
        (n) => n.type === 'raw_signal' && n.modality === 'habit_action'
      );
      assert.ok(signalNode);
      assert.equal(signalNode?.label, 'Behavioral Ritual');
      assert.ok(signalNode?.summary.includes('Behavioral ritual completion'));
    });

    it('sanitizes summary and preserves data minimization in Evidence Graph', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        modality: 'habit_action',
        sourceId: 'habit-456',
        timestamp: new Date().toISOString(),
        reliabilityWeight: 0.25,
        estimates: {},
        features: {
          themes: ['reflection'],
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: null,
        signals: [signal],
      });

      const signalNode = Object.values(graph.nodes).find(
        (n) => n.id === `node-sig-${signal.id}`
      );
      assert.ok(signalNode);
      assert.equal(signalNode?.summary, 'Behavioral ritual completion logged (reflection).');
    });

    it('ExplanationBuilder maps habit_action modality to "behavioral ritual"', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        modality: 'habit_action',
        sourceId: 'habit-789',
        timestamp: new Date().toISOString(),
        reliabilityWeight: 0.35,
        estimates: {},
        features: {
          themes: ['movement'],
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const currentState: PersonalState = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        mood: 60,
        stress: 35,
        fatigue: 40,
        energy: 65,
        focus: 60,
        cognitiveLoad: 30,
        sourceSummary: { habit_action: 1 },
        activeSignalsCount: 1,
        clustersCount: 1,
        confidence: 0.6,
        dimensions: {
          mood: { dimension: 'mood', value: 60, confidence: 0.5, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          stress: {
            dimension: 'stress',
            value: 35,
            confidence: 0.5,
            baselineDeviation: -5,
            trend: 'improving',
            contributingSignalIds: [signal.id],
            divergenceDetected: false,
            consistencyScore: 0.8,
          },
          fatigue: { dimension: 'fatigue', value: 40, confidence: 0.5, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          energy: { dimension: 'energy', value: 65, confidence: 0.5, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          focus: { dimension: 'focus', value: 60, confidence: 0.5, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          cognitiveLoad: { dimension: 'cognitiveLoad', value: 30, confidence: 0.5, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        } as any,
        isCrisisDetected: false,
      } as unknown as PersonalState;

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState,
        signals: [signal],
      });

      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState,
        signals: [signal],
      });

      assert.ok(explanation.dimensions.stress.contributingSources.includes('behavioral ritual'));
    });
  });

  // =========================================================================
  // 7. Intervention-to-Ritual Conversion
  // =========================================================================
  describe('7. Intervention-to-Ritual Conversion', () => {
    it('adoptInterventionAsRitual creates a habit with sourceInterventionId', async () => {
      const habit = await habitService.adoptInterventionAsRitual(
        USER_A,
        'breathing-reset',
        7
      );

      assert.ok(habit.id);
      assert.equal(habit.sourceInterventionId, 'breathing-reset');
      assert.equal(habit.category, 'mindfulness');
      assert.equal(habit.status, 'active');
      assert.equal(habit.targetFrequency, 7);
    });

    it('maps intervention categories accurately to habit categories', async () => {
      const somaticHabit = await habitService.adoptInterventionAsRitual(
        USER_A,
        'somatic-recovery',
        5
      );
      assert.equal(somaticHabit.category, 'movement');

      const focusHabit = await habitService.adoptInterventionAsRitual(
        USER_A,
        'focus-reset',
        7
      );
      assert.equal(focusHabit.category, 'reflection');
    });

    it('rejects adoption of non-existent intervention protocol with error', async () => {
      await assert.rejects(
        () => habitService.adoptInterventionAsRitual(USER_A, 'non_existent_protocol_xyz'),
        /not found/i
      );
    });
  });

  // =========================================================================
  // 8. Tenant Isolation & Multi-User Security
  // =========================================================================
  describe('8. Tenant Isolation & Multi-User Security', () => {
    it('unauthenticated requests to /api/habits return 401', async () => {
      const { req, res } = createMockReqRes(null);
      await habitController.listHabits(req, res);
      assert.equal(res.getStatusCode(), 401);
    });

    it('User A cannot retrieve or view User B habits', async () => {
      const habitB = await habitService.createHabit(USER_B, {
        title: 'Secret Ritual B',
        category: 'rest',
      });

      const { req, res } = createMockReqRes({ id: USER_A }, {}, {}, { id: habitB.id });
      await habitController.getHabitById(req, res);
      assert.equal(res.getStatusCode(), 404);
    });

    it('User A cannot complete User B habit (enforces 404 or 403 ownership gate)', async () => {
      const habitB = await habitService.createHabit(USER_B, {
        title: 'User B Habit',
        category: 'mindfulness',
      });

      const { req, res } = createMockReqRes(
        { id: USER_A },
        { completedAt: new Date().toISOString() },
        {},
        { id: habitB.id }
      );
      await habitController.completeHabit(req, res);
      assert.ok(res.getStatusCode() === 404 || res.getStatusCode() === 403);
    });

    it('User A cannot uncomplete or delete User B habit', async () => {
      const habitB = await habitService.createHabit(USER_B, {
        title: 'User B Habit',
        category: 'movement',
      });

      const { req, res } = createMockReqRes({ id: USER_A }, {}, {}, { id: habitB.id });
      await habitController.deleteHabit(req, res);
      assert.ok(res.getStatusCode() === 404 || res.getStatusCode() === 403);

      const stillExists = await habitService.getHabitById(USER_B, habitB.id);
      assert.ok(stillExists !== null);
    });
  });

  // =========================================================================
  // 9. Safety Precedence & Crisis Screening
  // =========================================================================
  describe('9. Safety Precedence & Crisis Screening', () => {
    it('crisis screening triggers on suicidal or self-harm keywords in habit creation', async () => {
      await assert.rejects(
        () =>
          habitService.createHabit(USER_A, {
            title: 'Want to end my life',
            category: 'rest',
          }),
        /Safety Alert/i
      );
    });

    it('crisis screening triggers on crisis keywords in habit notes/description', async () => {
      await assert.rejects(
        () =>
          habitService.createHabit(USER_A, {
            title: 'Evening routine',
            description: 'Planning suicide tonight',
            category: 'rest',
          }),
        /Safety Alert/i
      );
    });

    it('habit completion does not suppress or mask active crisis state', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Gentle Walk',
        category: 'movement',
      });

      const completionResult = await habitService.completeHabit(USER_A, habit.id, {});
      assert.ok(completionResult.signal);

      // Verify crisis screening priority in StateService is unaffected
      const crisisSignal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        modality: 'mood_checkin',
        sourceId: 'crisis-checkin',
        timestamp: new Date().toISOString(),
        reliabilityWeight: 1.0,
        estimates: {
          mood: { value: 15, confidence: 0.95 },
          stress: { value: 95, confidence: 0.95 },
        },
        features: {
          triggers: ['want to end my life'],
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      await stateService.ingestSignal(crisisSignal);
      const latestState = await stateService.getCurrentState(USER_A);
      assert.equal(latestState?.isCrisisDetected, true);
    });
  });

  // =========================================================================
  // 10. Anti-Exfiltration, Privacy, & Memory Isolation
  // =========================================================================
  describe('10. Anti-Exfiltration, Privacy, & Memory Isolation', () => {
    it('habit action completion signals never leak into Personal AI Memory records', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Daily Meditation',
        description: 'Private reflections about family stress',
        category: 'mindfulness',
      });

      await habitService.completeHabit(USER_A, habit.id, {});

      const memories = await memoryService.listMemories(USER_A);
      const leakedMemory = memories.find((m) =>
        m.summary.toLowerCase().includes('private reflections about family stress')
      );
      assert.equal(leakedMemory, undefined);
    });

    it('habit completion does not trigger unprompted proactive outreach', () => {
      const habit = createTestHabit({
        title: 'Water Intake',
        category: 'movement',
        streak: 30,
        bestStreak: 30,
      });

      const signal = HabitSignalProvider.createSignal(habit, '2026-09-12T08:00:00.000Z');
      // Verify signal does not include proactive escalation flags
      assert.equal((signal.features as any).requiresProactiveOutreach, undefined);
      assert.equal((signal.features as any).bypassDamping, undefined);
    });

    it('purging habit history cleanly removes all user habits and habit_action signals', async () => {
      const habit = await habitService.createHabit(USER_A, {
        title: 'Habit to Purge',
        category: 'movement',
      });

      await habitService.completeHabit(USER_A, habit.id, {});

      const purgeResult = await habitService.purgeHistory(USER_A);
      assert.ok(purgeResult.deletedHabits >= 1);

      const remainingHabits = await habitService.listHabits(USER_A);
      assert.equal(remainingHabits.length, 0);

      const remainingSignals = await stateService.getActiveSignals(USER_A);
      const habitSignals = remainingSignals.filter((s) => s.modality === 'habit_action');
      assert.equal(habitSignals.length, 0);
    });
  });
});
