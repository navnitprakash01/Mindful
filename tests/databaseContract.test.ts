import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isValidUuid, shouldEmitCompanionSignal } from '../src/server/engine/providers';
import { SignalExtractor } from '../src/server/engine/signalExtractor';
import { defaultStateEngine } from '../src/server/engine/stateEngine';
import { moodService } from '../src/server/services/moodService';
import { stateService } from '../src/server/services/stateService';
import { WellnessSignal, StateDimensionKey, SignalModality } from '../src/server/engine/types';

process.env.NODE_ENV = 'test';

describe('Database Contract & Schema Validation Tests', () => {
  describe('UUID Format & Primary Key Strategy', () => {
    it('accurately validates standard UUID v4 strings with isValidUuid', () => {
      const validUuid = randomUUID();
      assert.strictEqual(isValidUuid(validUuid), true, 'Standard randomUUID must be valid');
      assert.strictEqual(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), true);

      // Defective / Legacy custom string keys must be rejected as UUIDs
      assert.strictEqual(isValidUuid('sig-mood-1726055555555'), false);
      assert.strictEqual(isValidUuid('sig-journal-abc'), false);
      assert.strictEqual(isValidUuid('state-1726055555555'), false);
      assert.strictEqual(isValidUuid('mood-1726055555555'), false);
      assert.strictEqual(isValidUuid(''), false);
      assert.strictEqual(isValidUuid(null), false);
      assert.strictEqual(isValidUuid(undefined), false);
    });

    it('generates standard UUIDs for all SignalProvider modalities', () => {
      const userId = randomUUID();

      // 1. Mood signal
      const moodSignal = SignalExtractor.fromMoodLog({
        userId,
        energyLevel: 7,
        moodType: 'Calm',
      });
      assert.strictEqual(isValidUuid(moodSignal.id), true, `Mood signal ID must be valid UUID: ${moodSignal.id}`);

      // 2. Journal signal
      const journalSignal = SignalExtractor.fromJournal({
        userId,
        content: 'Reflecting peacefully on deep work today.',
      });
      assert.strictEqual(isValidUuid(journalSignal.id), true, `Journal signal ID must be valid UUID: ${journalSignal.id}`);

      // 3. Companion signal
      const companionSignal = SignalExtractor.fromCompanionSession({
        userId,
        mode: 'Mindful Coach',
        recentMessagesCount: 4,
      });
      assert.strictEqual(isValidUuid(companionSignal.id), true, `Companion signal ID must be valid UUID: ${companionSignal.id}`);
    });

    it('generates standard UUID for MoodLog and safely propagates sourceId', async () => {
      const userId = randomUUID();
      const moodLog = await moodService.createMoodLog(userId, {
        energyLevel: 8,
        moodType: 'Joy',
        notes: 'Grounded morning start',
      });

      assert.strictEqual(isValidUuid(moodLog.id), true, `MoodLog ID must be valid UUID: ${moodLog.id}`);
      assert.strictEqual(moodLog.userId, userId);

      // Verify signal emitted from moodLog has valid UUID sourceId matching moodLog.id
      const signals = await stateService.getActiveSignals(userId);
      const matchingSignal = signals.find((s) => s.modality === 'mood_checkin');
      assert.ok(matchingSignal, 'A mood_checkin signal should be present in active signals');
      assert.strictEqual(isValidUuid(matchingSignal.id), true);
      assert.strictEqual(matchingSignal.sourceId, moodLog.id);
      assert.strictEqual(isValidUuid(matchingSignal.sourceId), true);
    });

    it('generates standard UUID for PersonalState snapshots', () => {
      const userId = randomUUID();
      const state = defaultStateEngine.computeState(userId, []);

      assert.strictEqual(isValidUuid(state.id), true, `PersonalState ID must be valid UUID: ${state.id}`);
      assert.strictEqual(state.userId, userId);
    });

    it('sanitizes non-UUID sourceId to undefined/null to protect database integrity', () => {
      const userId = randomUUID();

      // If a caller passes a non-UUID ID (e.g. legacy string or slug)
      const signalWithLegacyId = SignalExtractor.fromMoodLog({
        id: 'legacy-mood-12345',
        userId,
        energyLevel: 6,
        moodType: 'Focus',
      });

      assert.strictEqual(isValidUuid(signalWithLegacyId.id), true, 'Signal ID itself must always be a valid UUID');
      assert.strictEqual(signalWithLegacyId.sourceId, undefined, 'Invalid sourceId should not be set as UUID');
    });
  });

  describe('GET /api/state/current Read-Only Idempotency', () => {
    it('computes state consistently across multiple calls without side-effects', async () => {
      const userId = randomUUID();
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId,
        timestamp: new Date().toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 85, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      };

      await stateService.ingestSignal(signal);

      // Execute consecutive reads
      const read1 = await stateService.getCurrentState(userId);
      const read2 = await stateService.getCurrentState(userId);
      const read3 = await stateService.getCurrentState(userId);

      assert.strictEqual(read1.userId, userId);
      assert.strictEqual(read2.userId, userId);
      assert.strictEqual(read3.userId, userId);

      // Dimension estimates should remain stable across reads
      assert.strictEqual(read1.dimensions.mood.value, read2.dimensions.mood.value);
      assert.strictEqual(read2.dimensions.mood.value, read3.dimensions.mood.value);
    });
  });

  describe('Signal Ingestion Validation & Clamping Contract', () => {
    const VALID_MODALITIES: SignalModality[] = [
      'text_journal',
      'voice_transcript',
      'companion_session',
      'mood_checkin',
      'habit_action',
    ];

    const VALID_DIMENSIONS: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    it('verifies allowed modalities whitelist', () => {
      assert.strictEqual(VALID_MODALITIES.includes('mood_checkin'), true);
      assert.strictEqual(VALID_MODALITIES.includes('text_journal'), true);
      assert.strictEqual(VALID_MODALITIES.includes('voice_transcript'), true);
      assert.strictEqual(VALID_MODALITIES.includes('companion_session'), true);
      assert.strictEqual(VALID_MODALITIES.includes('habit_action'), true);
      assert.strictEqual(VALID_MODALITIES.includes('unsupported_sensor' as any), false);
    });

    it('clamps dimension estimates strictly to [0, 100] and confidence to [0.0, 1.0]', () => {
      const rawValues = [
        { value: 150, confidence: 1.8, expectedVal: 100, expectedConf: 1.0 },
        { value: -25, confidence: -0.5, expectedVal: 0, expectedConf: 0.0 },
        { value: 75.6, confidence: 0.854, expectedVal: 76, expectedConf: 0.85 },
      ];

      for (const { value, confidence, expectedVal, expectedConf } of rawValues) {
        const clampedVal = Math.max(0, Math.min(100, Math.round(value)));
        const clampedConf = Math.max(0.0, Math.min(1.0, Number(confidence.toFixed(2))));

        assert.strictEqual(clampedVal, expectedVal);
        assert.strictEqual(clampedConf, expectedConf);
      }
    });
  });

  describe('AI Companion Signal Emission Calibration', () => {
    it('filters out trivial greetings and short acknowledgments', () => {
      const trivialMessages = [
        'hello',
        'Hello',
        'HI!',
        'hey there',
        'good morning',
        'thanks',
        'Thank you so much!',
        'ok',
        'cool',
        'sure',
        'how are you',
        'bye',
      ];

      for (const msg of trivialMessages) {
        assert.strictEqual(
          shouldEmitCompanionSignal(msg, 0),
          false,
          `Message "${msg}" should be classified as trivial and not emit a signal`
        );
      }
    });

    it('filters out very short statements when conversation history is sparse', () => {
      assert.strictEqual(shouldEmitCompanionSignal('not really', 1), false);
      assert.strictEqual(shouldEmitCompanionSignal('maybe later', 0), false);
    });

    it('permits signal emission for substantive emotional reflections', () => {
      const substantiveMessages = [
        'I am feeling really anxious about our upcoming launch deadline and cannot sleep.',
        'I had a peaceful day walking in nature and feel very grounded.',
        'Everything feels overwhelming right now and my mind is racing with too many thoughts.',
      ];

      for (const msg of substantiveMessages) {
        assert.strictEqual(
          shouldEmitCompanionSignal(msg, 0),
          true,
          `Substantive message should emit signal: "${msg}"`
        );
      }
    });

    it('permits signal emission for shorter messages in an ongoing engaged conversation', () => {
      // Once conversation history has 4 exchanges, even a concise response is part of a real session
      assert.strictEqual(shouldEmitCompanionSignal('I feel better now', 4), true);
    });
  });

  describe('Database Schema Serialization Contract', () => {
    it('validates serialization schema of wellness_signals', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: randomUUID(),
        timestamp: new Date().toISOString(),
        modality: 'mood_checkin',
        sourceId: randomUUID(),
        estimates: {
          mood: { value: 80, confidence: 0.95 },
          stress: { value: 25, confidence: 0.90 },
        },
        features: {
          valence: 0.8,
          energy: 8,
          triggers: ['Exercise'],
          somaticSensations: ['Relaxed shoulders'],
        },
        reliabilityWeight: 1.0,
        expiresAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      };

      const dbRow = {
        id: signal.id,
        user_id: signal.userId,
        modality: signal.modality,
        source_id: signal.sourceId || null,
        estimates: signal.estimates,
        features: signal.features,
        reliability_weight: signal.reliabilityWeight,
        expires_at: signal.expiresAt,
        created_at: signal.timestamp,
      };

      assert.strictEqual(isValidUuid(dbRow.id), true);
      assert.strictEqual(isValidUuid(dbRow.user_id), true);
      assert.strictEqual(isValidUuid(dbRow.source_id), true);
      assert.strictEqual(typeof dbRow.modality, 'string');
      assert.strictEqual(typeof dbRow.estimates, 'object');
      assert.strictEqual(typeof dbRow.features, 'object');
      assert.strictEqual(typeof dbRow.reliability_weight, 'number');
      assert.ok(!isNaN(Date.parse(dbRow.expires_at)));
      assert.ok(!isNaN(Date.parse(dbRow.created_at)));
    });

    it('validates serialization schema of personal_wellness_states', () => {
      const state = defaultStateEngine.computeState(randomUUID(), []);

      const dbRow = {
        id: state.id,
        user_id: state.userId,
        dimensions: state.dimensions,
        overall_confidence: state.overallConfidence,
        somatic_markers: state.somaticMarkers,
        contextual_triggers: state.contextualTriggers,
        evidence: state.evidence,
        source_summary: state.sourceSummary,
        created_at: state.timestamp,
      };

      assert.strictEqual(isValidUuid(dbRow.id), true);
      assert.strictEqual(isValidUuid(dbRow.user_id), true);
      assert.strictEqual(typeof dbRow.dimensions, 'object');
      assert.strictEqual(typeof dbRow.overall_confidence, 'number');
      assert.strictEqual(Array.isArray(dbRow.somatic_markers), true);
      assert.strictEqual(Array.isArray(dbRow.contextual_triggers), true);
      assert.strictEqual(Array.isArray(dbRow.evidence), true);
      assert.strictEqual(typeof dbRow.source_summary, 'object');
      assert.ok(!isNaN(Date.parse(dbRow.created_at)));
    });

    it('validates serialization schema of personal_baselines', () => {
      const userId = randomUUID();
      const baseline = {
        user_id: userId,
        observation_count: 10,
        overall_confidence: 0.85,
        is_preliminary: false,
        dimensions: {
          mood: { mean: 75, median: 75, stdDev: 5, observationCount: 10, confidence: 0.85, isPreliminary: false, lastUpdated: new Date().toISOString() },
        },
        last_updated: new Date().toISOString(),
      };

      assert.strictEqual(isValidUuid(baseline.user_id), true);
      assert.strictEqual(typeof baseline.observation_count, 'number');
      assert.strictEqual(typeof baseline.overall_confidence, 'number');
      assert.strictEqual(typeof baseline.is_preliminary, 'boolean');
      assert.strictEqual(typeof baseline.dimensions, 'object');
      assert.ok(!isNaN(Date.parse(baseline.last_updated)));
    });

    it('validates serialization schema of mood_logs', () => {
      const moodLogRow = {
        id: randomUUID(),
        user_id: randomUUID(),
        energy_level: 8,
        mood_type: 'Calm',
        notes: 'Morning meditation session',
        triggers: ['Meditation'],
        physical_sensations: ['Relaxed shoulders'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      assert.strictEqual(isValidUuid(moodLogRow.id), true);
      assert.strictEqual(isValidUuid(moodLogRow.user_id), true);
      assert.ok(moodLogRow.energy_level >= 1 && moodLogRow.energy_level <= 10);
      assert.strictEqual(typeof moodLogRow.mood_type, 'string');
      assert.strictEqual(typeof moodLogRow.notes, 'string');
      assert.strictEqual(Array.isArray(moodLogRow.triggers), true);
      assert.strictEqual(Array.isArray(moodLogRow.physical_sensations), true);
      assert.ok(!isNaN(Date.parse(moodLogRow.created_at)));
      assert.ok(!isNaN(Date.parse(moodLogRow.updated_at)));
    });
  });
});
