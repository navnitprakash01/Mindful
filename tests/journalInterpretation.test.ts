/**
 * Journal Interpretation & Content Quality Regression Tests
 * Mindful 3.0 — Grounded summaries, human explanations, contextual themes, and cliché avoidance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { geminiClient, analyzeJournalLocally } from '../src/server/services/geminiClient';
import { SignalExtractor } from '../src/server/engine/signalExtractor';

describe('Journal Interpretation & UX Language Quality', () => {
  const testJournal1 =
    "I had a busy day with several assignments. I feel a little mentally tired, but I'm otherwise okay. I want to finish my remaining work tonight and get some proper sleep.";

  const testJournal2 =
    "Went for a morning walk in the park today. The fresh air and sunshine felt incredible, and I'm really grateful for my supportive friends. Feeling energized and excited for the weekend ahead.";

  const testJournal3 =
    "I have an upcoming deadline and feel quite worried and anxious about whether everything will turn out well. My thoughts are racing under pressure.";

  describe('1. Test Journal Interpretation (Workload & Rest)', () => {
    it('generates a human-readable summary of actual user content without technical details', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);

      // Verify human summary
      assert.ok(result.summary, 'Summary must exist');
      assert.ok(
        result.summary.toLowerCase().includes('busy day') ||
        result.summary.toLowerCase().includes('assignments'),
        'Summary must reflect workload context'
      );
      assert.ok(
        result.summary.toLowerCase().includes('tired') ||
        result.summary.toLowerCase().includes('okay'),
        'Summary must reflect emotional resilience/tiredness'
      );
      assert.ok(
        result.summary.toLowerCase().includes('sleep') ||
        result.summary.toLowerCase().includes('work'),
        'Summary must reflect intent to finish work and sleep'
      );

      // Verify absence of technical implementation text inside summary
      assert.ok(
        !result.summary.toLowerCase().includes('analyzed locally'),
        'Summary must NOT contain technical provenance phrase "analyzed locally"'
      );
      assert.ok(
        !result.summary.toLowerCase().includes('heuristics'),
        'Summary must NOT contain technical jargon "heuristics"'
      );
      assert.ok(
        !result.summary.toLowerCase().includes('linguistic'),
        'Summary must NOT contain technical jargon "linguistic"'
      );
    });

    it('replaces abstract single-word labels with a clear human explanation for dominant emotion', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);

      assert.strictEqual(
        result.dominantEmotion,
        'Mostly okay, with some mental tiredness',
        'Dominant emotion must be a clear human explanation'
      );
      assert.notStrictEqual(result.dominantEmotion, 'Reflective', 'Must not use abstract "Reflective" label');
      assert.ok(typeof result.dominantScore === 'number' && result.dominantScore > 0, 'Score must be a valid number');
    });

    it('generates grounded Key Themes and a specific context explanation', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);

      assert.ok(result.themes.includes('Work & Deadlines'), 'Themes must include "Work & Deadlines"');
      assert.ok(result.themes.includes('Mental Tiredness'), 'Themes must include "Mental Tiredness"');
      assert.ok(result.themes.includes('Sleep & Recovery'), 'Themes must include "Sleep & Recovery"');
      assert.ok(!result.themes.includes('Rest & Recovery'), 'Must replace generic "Rest & Recovery"');

      assert.ok(result.themeExplanation, 'Theme explanation must exist');
      assert.ok(
        result.themeExplanation.includes('assignments') &&
        result.themeExplanation.includes('mentally tired') &&
        result.themeExplanation.includes('sleep'),
        'Theme explanation must connect assignments, tiredness, and sleep directly'
      );
    });

    it('generates context-aware recommendation and avoids wellness clichés', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);

      // Grounded guidance
      assert.ok(
        result.suggestedAction.toLowerCase().includes('short break') ||
        result.suggestedAction.toLowerCase().includes('remaining work') ||
        result.suggestedAction.toLowerCase().includes('sleep'),
        'Recommendation must provide context-aware guidance for workload and sleep'
      );

      // Absolute prohibition of wellness clichés
      assert.ok(
        !result.suggestedAction.toLowerCase().includes('breathe and observe your thoughts without judgment'),
        'Must NOT use cliché "breathe and observe your thoughts without judgment"'
      );
      assert.ok(
        !result.suggestedAction.toLowerCase().includes('quiet moment to breathe'),
        'Must NOT use generic breathing cliché unless requested'
      );
    });

    it('separates provenance / local analysis indicator from summary', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);

      assert.strictEqual(result.isLocalSynthesis, true, 'isLocalSynthesis flag must indicate local provenance');
    });
  });

  describe('2. Generalization Verification (Second Distinct Journal)', () => {
    it('produces distinct, grounded themes and summary for a gratitude/outdoor journal', async () => {
      const result = await geminiClient.analyzeJournal(testJournal2);

      // Check distinct dominant emotion
      assert.strictEqual(
        result.dominantEmotion,
        'Grateful, energized, and uplifted',
        'Dominant emotion must reflect gratitude and energy'
      );

      // Check distinct summary
      assert.ok(
        result.summary.toLowerCase().includes('morning walk') ||
        result.summary.toLowerCase().includes('park') ||
        result.summary.toLowerCase().includes('friends'),
        'Summary must describe user morning walk and friends'
      );

      // Check distinct themes
      assert.ok(result.themes.includes('Outdoor Activity'), 'Must include Outdoor Activity theme');
      assert.ok(result.themes.includes('Gratitude'), 'Must include Gratitude theme');
      assert.ok(result.themes.includes('Social Support'), 'Must include Social Support theme');
      assert.ok(!result.themes.includes('Work & Deadlines'), 'Must NOT include Work & Deadlines for gratitude journal');

      // Check distinct contextual recommendation
      assert.ok(
        result.suggestedAction.toLowerCase().includes('positive momentum') ||
        result.suggestedAction.toLowerCase().includes('friend') ||
        result.suggestedAction.toLowerCase().includes('savor'),
        'Recommendation must guide user to savor positive momentum or share appreciation'
      );

      // Check distinct prompt
      assert.ok(
        result.reflectionPrompt.toLowerCase().includes('remember') ||
        result.reflectionPrompt.toLowerCase().includes('feeling'),
        'Reflection prompt must invite gentle appreciation'
      );
    });
  });

  describe('3. Generalization Verification (Third Distinct Journal - Worry/Tension)', () => {
    it('produces distinct, grounded themes for a worry and deadline journal', async () => {
      const result = await geminiClient.analyzeJournal(testJournal3);

      assert.ok(
        result.dominantEmotion.toLowerCase().includes('worry') ||
        result.dominantEmotion.toLowerCase().includes('deadline'),
        'Dominant emotion must capture worry or deadline pressure'
      );

      assert.ok(result.themes.includes('Project Deadline'), 'Must include Project Deadline theme');
      assert.ok(result.themes.includes('Workload Worry'), 'Must include Workload Worry theme');
      assert.ok(result.themes.includes('Finding a Starting Point'), 'Must include Finding a Starting Point theme');
      assert.ok(
        result.suggestedAction.toLowerCase().includes('step away') ||
        result.suggestedAction.toLowerCase().includes('smallest') ||
        result.suggestedAction.toLowerCase().includes('manageable'),
        'Suggested action must offer manageable step without clinical claims'
      );
    });
  });

  describe('4. Architectural & Safety Boundaries Invariant', () => {
    it('preserves valid underlying SignalExtractor numeric bounds without fabricating new scores', () => {
      const localSignal = SignalExtractor.fromJournal({
        userId: 'anonymous',
        content: testJournal1,
      });

      const analysis = analyzeJournalLocally(testJournal1);

      // Dominant score is derived from valid SignalExtractor mood estimate
      assert.strictEqual(analysis.dominantScore, localSignal.estimates.mood?.value ?? 70);

      // Emotions array matches SignalExtractor dimensional estimates
      const focusEmotion = analysis.emotions.find(e => e.name === 'Focus');
      const stressEmotion = analysis.emotions.find(e => e.name === 'Stress');
      const energyEmotion = analysis.emotions.find(e => e.name === 'Energy');
      const fatigueEmotion = analysis.emotions.find(e => e.name === 'Fatigue');

      assert.ok(focusEmotion && focusEmotion.score >= 0 && focusEmotion.score <= 100);
      assert.ok(stressEmotion && stressEmotion.score >= 0 && stressEmotion.score <= 100);
      assert.ok(energyEmotion && energyEmotion.score >= 0 && energyEmotion.score <= 100);
      assert.ok(fatigueEmotion && fatigueEmotion.score >= 0 && fatigueEmotion.score <= 100);
    });

    it('never leaks internal stateEstimates property or clinical diagnoses', async () => {
      const result = await geminiClient.analyzeJournal(testJournal1);
      assert.strictEqual((result as any).stateEstimates, undefined);
      assert.strictEqual((result as any).medicalDiagnosis, undefined);
    });
  });

  describe('5. Categories & Moods Vocabulary Invariants', () => {
    it('enforces meaningful, simple international-friendly categories and moods', async () => {
      const fs = await import('fs');
      const journalViewContent = fs.readFileSync('src/components/features/JournalView.tsx', 'utf-8');

      // Categories
      assert.ok(journalViewContent.includes("'Reflection'"), 'Must include Reflection category');
      assert.ok(journalViewContent.includes("'Gratitude'"), 'Must include Gratitude category');
      assert.ok(journalViewContent.includes("'Worry'"), 'Must include Worry category');
      assert.ok(journalViewContent.includes("'Personal Growth'"), 'Must include Personal Growth category');
      assert.ok(journalViewContent.includes("'Mindfulness'"), 'Must include Mindfulness category');

      // Prohibited generic categories
      assert.ok(!journalViewContent.includes("const tags = ['Thoughts'"), 'Tags must NOT use generic Thoughts');
      assert.ok(!journalViewContent.includes("const tags = ['Daily Life'"), 'Tags must NOT use generic Daily Life');

      // Moods: Peaceful, Happy, Calm, Worried, Thoughtful, Grateful
      assert.ok(journalViewContent.includes("'Peaceful'"), 'Must include Peaceful mood');
      assert.ok(journalViewContent.includes("'Happy'"), 'Must include Happy mood');
      assert.ok(journalViewContent.includes("'Calm'"), 'Must include Calm mood');
      assert.ok(journalViewContent.includes("'Worried'"), 'Must include Worried mood');
      assert.ok(journalViewContent.includes("'Thoughtful'"), 'Must include Thoughtful mood');
      assert.ok(journalViewContent.includes("'Grateful'"), 'Must include Grateful mood');

      // Invariant: Reflective is Thoughtful (not Tired)
      assert.ok(!journalViewContent.includes("moods = ['Tired'"), 'Moods must not replace Reflective with Tired');
    });
  });
});
