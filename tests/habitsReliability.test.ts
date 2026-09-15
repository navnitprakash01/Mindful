/**
 * Mindful 3.0 Habits Reliability & Seeding Test Suite
 *
 * Test coverage:
 * 1. Create Habit Persistence
 * 2. 5 Starter Habits Seeded
 * 3. Seeding Idempotency
 * 4. Habit Completion Persistence
 * 5. Habit Uncomplete Persistence
 * 6. Rapid-Click / Double-Click Resilience
 * 7. Tab Remount / Re-render Stability
 * 8. Multi-Tenant Habit Isolation
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { habitService } from '../src/server/services/habitService';
import { STARTER_HABITS } from '../src/context/HabitsContext';
import { habitController } from '../src/server/controllers/habitController';
import { AuthenticatedRequest } from '../src/server/middleware/auth';

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

  return { req: req as any, res: res as any };
}

describe('Mindful Habits Reliability & Seeding Test Suite', () => {
  beforeEach(async () => {
    habitService._resetMemoryStore();
    await habitService.purgeHistory(USER_A);
    await habitService.purgeHistory(USER_B);
    habitService._resetMemoryStore();
  });

  // 1. Create Habit Persistence
  it('1. Create Habit Persistence: creates a habit with valid input and persists with correct schema', async () => {
    const input = {
      title: 'Midday Breath Awareness',
      description: 'Pause for 3 mindful diaphragmatic breaths before lunch.',
      category: 'mindfulness' as const,
      targetFrequency: 7,
      preferredTimeWindow: 'midday' as const,
    };

    const created = await habitService.createHabit(USER_A, input);
    assert.ok(created.id, 'Habit should have an id');
    assert.equal(created.userId, USER_A);
    assert.equal(created.title, 'Midday Breath Awareness');
    assert.equal(created.category, 'mindfulness');
    assert.equal(created.targetFrequency, 7);
    assert.equal(created.streak, 0);
    assert.deepEqual(created.completedDates, []);

    // Verify it appears in habit list
    const habits = await habitService.listHabits(USER_A);
    const found = habits.find((h) => h.id === created.id);
    assert.ok(found, 'Created habit must exist in habit list');
    assert.equal(found.title, 'Midday Breath Awareness');
    assert.equal(found.category, 'mindfulness');
    assert.equal(found.targetFrequency, 7);
    assert.equal(found.streak, 0);
    assert.deepEqual(found.completedDates, []);
  });

  // 2. 5 Starter Habits Seeded
  it('2. 5 Starter Habits Seeded: fresh user querying habits returns all 5 starter habits with correct details', async () => {
    const habits = await habitService.listHabits(USER_A);
    assert.equal(habits.length, 5, 'Fresh user must receive exactly 5 starter rituals');

    const expectedTitles = [
      'Morning Presence',
      '5-Minute Movement',
      'Mental Unload',
      'Evening Wind-Down',
      'Daily Gratitude',
    ];

    const expectedCategories = ['mindfulness', 'movement', 'reflection', 'rest', 'gratitude'];

    for (let i = 0; i < expectedTitles.length; i++) {
      const habit = habits.find((h) => h.title === expectedTitles[i]);
      assert.ok(habit, 'Expected starter habit to be present: ' + expectedTitles[i]);
      assert.equal(habit.category, expectedCategories[i]);
      assert.equal(habit.streak, 0);
      assert.equal(habit.targetFrequency, 7);
      assert.deepEqual(habit.completedDates, []);
      assert.ok(habit.description.length > 0, 'Description should not be empty');
    }

    // Verify frontend STARTER_HABITS array matches required specs
    assert.equal(STARTER_HABITS.length, 5);
    assert.deepEqual(
      STARTER_HABITS.map((h) => h.title),
      expectedTitles
    );
    assert.deepEqual(
      STARTER_HABITS.map((h) => h.category),
      expectedCategories
    );
  });

  // 3. Seeding Idempotency
  it('3. Seeding Idempotency: multiple calls or subsequent creations do not duplicate starter habits', async () => {
    // Initial fetch seeds 5 habits
    const firstFetch = await habitService.listHabits(USER_A);
    assert.equal(firstFetch.length, 5);

    // Second fetch must NOT re-seed or duplicate
    const secondFetch = await habitService.listHabits(USER_A);
    assert.equal(secondFetch.length, 5, 'Second fetch must still return exactly 5 habits');
    assert.deepEqual(
      firstFetch.map((h) => h.id),
      secondFetch.map((h) => h.id),
      'Habit IDs must be identical across fetches'
    );

    // Creating a custom habit retains starter habits + custom habit without duplicating
    const custom = await habitService.createHabit(USER_A, {
      title: 'Custom Reading Habit',
      category: 'reflection',
    });

    const thirdFetch = await habitService.listHabits(USER_A);
    assert.equal(thirdFetch.length, 6, 'Should now have 5 starter habits + 1 custom habit = 6');
    assert.ok(thirdFetch.some((h) => h.id === custom.id));
  });

  // 4. Habit Completion Persistence
  it('4. Habit Completion Persistence: completing a habit updates completedDates and increments streak stably', async () => {
    const habits = await habitService.listHabits(USER_A);
    const targetHabit = habits[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const result = await habitService.completeHabit(USER_A, targetHabit.id, {
      completionDate: todayStr,
    });

    assert.ok(result.habit.completedDates.includes(todayStr));
    assert.equal(result.habit.streak, 1);
    assert.equal(result.isNewCompletion, true);

    // Re-query from service to verify persistence
    const reloaded = await habitService.getHabitById(USER_A, targetHabit.id);
    assert.ok(reloaded, 'Habit must exist');
    assert.ok(reloaded.completedDates.includes(todayStr), 'completedDates must include today');
    assert.equal(reloaded.streak, 1, 'streak must be 1');

    // Re-query listHabits to verify list view also reflects completion
    const allHabits = await habitService.listHabits(USER_A);
    const listHabit = allHabits.find((h) => h.id === targetHabit.id);
    assert.ok(listHabit);
    assert.ok(listHabit.completedDates.includes(todayStr));
    assert.equal(listHabit.streak, 1);
  });

  // 5. Habit Uncomplete Persistence
  it('5. Habit Uncomplete Persistence: uncompleting a habit removes the date and adjusts streak accurately', async () => {
    const habits = await habitService.listHabits(USER_A);
    const targetHabit = habits[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Complete first
    await habitService.completeHabit(USER_A, targetHabit.id, {
      completionDate: todayStr,
    });

    // Verify uncomplete via controller route payload format (completionDate)
    const { req, res } = createMockReqRes(
      { id: USER_A },
      { completionDate: todayStr },
      {},
      { id: targetHabit.id }
    );

    await habitController.uncompleteHabit(req, res);
    assert.equal(res.getStatusCode(), 200);

    const updated = res.getData().habit;
    assert.ok(!updated.completedDates.includes(todayStr), 'Date must be removed from completedDates');
    assert.equal(updated.streak, 0, 'Streak must adjust back to 0');

    // Confirm persisted state from DB / memory
    const verified = await habitService.getHabitById(USER_A, targetHabit.id);
    assert.ok(verified);
    assert.ok(!verified.completedDates.includes(todayStr));
    assert.equal(verified.streak, 0);
  });

  // 6. Rapid-Click / Double-Click Resilience
  it('6. Rapid-Click / Double-Click Resilience: concurrent completion calls resolve safely without race conditions or duplicates', async () => {
    const habits = await habitService.listHabits(USER_A);
    const targetHabit = habits[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Fire two completion requests concurrently simulating rapid user clicks
    const [res1, res2] = await Promise.all([
      habitService.completeHabit(USER_A, targetHabit.id, { completionDate: todayStr }),
      habitService.completeHabit(USER_A, targetHabit.id, { completionDate: todayStr }),
    ]);

    // One of them is a new completion, one is idempotent
    const newCompletions = [res1.isNewCompletion, res2.isNewCompletion].filter(Boolean);
    assert.equal(newCompletions.length, 1, 'Only one call should register as isNewCompletion');

    // Both returned habit representations must have no duplicate dates
    assert.equal(
      res1.habit.completedDates.filter((d) => d === todayStr).length,
      1,
      'No duplicate dates in completedDates'
    );
    assert.equal(
      res2.habit.completedDates.filter((d) => d === todayStr).length,
      1,
      'No duplicate dates in completedDates'
    );

    // Final state
    const finalHabit = await habitService.getHabitById(USER_A, targetHabit.id);
    assert.ok(finalHabit);
    assert.equal(finalHabit.completedDates.filter((d) => d === todayStr).length, 1);
    assert.equal(finalHabit.streak, 1);
  });

  // 7. Tab Remount / Re-render Stability
  it('7. Tab Remount / Re-render Stability: habits and completions persist across simulated component unmount and refetch', async () => {
    // 1. User loads habits on tab mount
    const initialList = await habitService.listHabits(USER_A);
    assert.equal(initialList.length, 5);

    // 2. User creates a new habit
    const newHabit = await habitService.createHabit(USER_A, {
      title: 'Afternoon Sunlight',
      description: 'Step outside for 10 minutes of direct sunlight.',
      category: 'movement',
    });

    // 3. User completes today
    const todayStr = new Date().toISOString().split('T')[0];
    await habitService.completeHabit(USER_A, newHabit.id, { completionDate: todayStr });

    // 4. Simulate user switching to another tab (Journal / Mood), and returning to Habits
    // This triggers a fresh listHabits call as HabitsProvider / HabitsView reconciles
    const remountList = await habitService.listHabits(USER_A);
    assert.equal(remountList.length, 6, 'All 6 habits must be present after tab switch');

    const remountedNewHabit = remountList.find((h) => h.id === newHabit.id);
    assert.ok(remountedNewHabit, 'Newly created habit must not disappear after tab switch');
    assert.equal(remountedNewHabit.title, 'Afternoon Sunlight');
    assert.ok(remountedNewHabit.completedDates.includes(todayStr), 'Completion must persist');
    assert.equal(remountedNewHabit.streak, 1, 'Streak must persist');
  });

  // 8. Multi-Tenant Habit Isolation
  it('8. Multi-Tenant Habit Isolation: User A and User B habits and completions are strictly isolated', async () => {
    // User A lists habits (seeds 5 for User A)
    const habitsA = await habitService.listHabits(USER_A);
    assert.equal(habitsA.length, 5);
    const habitA = habitsA[0];

    // User B lists habits (seeds 5 for User B)
    const habitsB = await habitService.listHabits(USER_B);
    assert.equal(habitsB.length, 5);
    const habitB = habitsB[0];

    // Guarantee distinct IDs
    assert.notEqual(habitA.id, habitB.id);

    // User A completes habit
    const todayStr = new Date().toISOString().split('T')[0];
    await habitService.completeHabit(USER_A, habitA.id, { completionDate: todayStr });

    // User B habit must NOT be completed
    const refreshedB = await habitService.getHabitById(USER_B, habitB.id);
    assert.ok(refreshedB);
    assert.equal(refreshedB.streak, 0, 'User B habit must not inherit User A streak');
    assert.deepEqual(refreshedB.completedDates, [], 'User B habit must not inherit User A completion');

    // User B cannot query or complete User A habit
    const forbiddenQuery = await habitService.getHabitById(USER_B, habitA.id);
    assert.equal(forbiddenQuery, null, 'User B cannot view User A habit');

    await assert.rejects(
      async () => {
        await habitService.completeHabit(USER_B, habitA.id, { completionDate: todayStr });
      },
      (err: any) => err.message.includes('not found') || err.message.includes('Forbidden')
    );
  });
});
