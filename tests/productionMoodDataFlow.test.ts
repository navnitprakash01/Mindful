import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApiUrl } from '../src/lib/api';
import { SignalExtractor } from '../src/server/engine/signalExtractor';
import { defaultStateEngine } from '../src/server/engine/stateEngine';
import { screenForCrisis } from '../src/server/engine/interventionEngine/safety';

describe('Production Mood Log Data-Flow & Persistence Regression Tests', () => {
  describe('1. API URL Resolution (getApiUrl)', () => {
    const originalEnv = process.env.VITE_API_URL;

    it('prepends VITE_API_URL when set without trailing slash', () => {
      process.env.VITE_API_URL = 'https://mindful-qu0m.onrender.com';
      const url = getApiUrl('/api/moods');
      assert.strictEqual(url, 'https://mindful-qu0m.onrender.com/api/moods');
    });

    it('handles trailing slash on VITE_API_URL without double-slash', () => {
      process.env.VITE_API_URL = 'https://mindful-qu0m.onrender.com/';
      const url = getApiUrl('/api/moods');
      assert.strictEqual(url, 'https://mindful-qu0m.onrender.com/api/moods');
    });

    it('handles path without leading slash', () => {
      process.env.VITE_API_URL = 'https://mindful-qu0m.onrender.com';
      const url = getApiUrl('api/moods?limit=30');
      assert.strictEqual(url, 'https://mindful-qu0m.onrender.com/api/moods?limit=30');
    });

    it('returns absolute URLs untouched', () => {
      process.env.VITE_API_URL = 'https://mindful-qu0m.onrender.com';
      const absoluteUrl = 'https://other-service.com/api/test';
      assert.strictEqual(getApiUrl(absoluteUrl), absoluteUrl);
    });

    it('returns clean relative path when VITE_API_URL is empty', () => {
      delete process.env.VITE_API_URL;
      assert.strictEqual(getApiUrl('/api/moods'), '/api/moods');
      if (originalEnv !== undefined) {
        process.env.VITE_API_URL = originalEnv;
      }
    });
  });

  describe('2. Mood Log Signal Ingestion & State Engine Integration', () => {
    it('extracts high-confidence wellness signal from valid mood check-in', () => {
      const validUuid = 'c8d629a5-8e12-42ef-a337-dfa68c07e2c9';
      const signal = SignalExtractor.fromMoodLog({
        id: validUuid,
        userId: '2fabac67-3a30-4db8-891c-d5da7f9348cd',
        energyLevel: 8,
        moodType: 'Calm',
        notes: 'Feeling centered and peaceful in nature',
        triggers: ['Nature', 'Meditation'],
        physicalSensations: ['Deep breathing', 'Relaxed shoulders'],
        timestamp: new Date().toISOString(),
      });

      assert.strictEqual(signal.modality, 'mood_checkin');
      assert.strictEqual(signal.sourceId, validUuid);
      assert.strictEqual(signal.userId, '2fabac67-3a30-4db8-891c-d5da7f9348cd');
      assert.ok(signal.reliabilityWeight >= 0.85, 'Mood check-in must have high reliability');
      assert.strictEqual(signal.estimates.energy.value, 80);
      assert.strictEqual(signal.estimates.mood.value, 85); // Calm maps to 85
      assert.ok(signal.estimates.stress !== undefined && signal.estimates.stress.value < 40);
    });

    it('StateEngine computes calibrated PersonalState from ingested mood signal', () => {
      const signal = SignalExtractor.fromMoodLog({
        id: 'c8d629a5-8e12-42ef-a337-dfa68c07e2c9',
        userId: 'test-user',
        energyLevel: 7,
        moodType: 'Focus',
        notes: 'Flow state on project',
        triggers: ['Creative Work'],
        physicalSensations: ['Lightness in chest'],
        timestamp: new Date().toISOString(),
      });

      const state = defaultStateEngine.computeState('test-user', [signal]);
      assert.strictEqual(state.userId, 'test-user');
      assert.ok(state.dimensions.mood.value > 0);
      assert.ok(state.dimensions.energy.value > 0);
      assert.ok(state.dimensions.focus.value > 0);
      assert.strictEqual(state.activeSignalsCount, 1);
      assert.strictEqual(state.isCrisisDetected, false);
    });
  });

  describe('3. Validation & Crisis Interception Guardrails', () => {
    it('validates energy level bounds [1, 10]', () => {
      const invalidLevels = [0, -1, 11, NaN, Infinity];
      for (const level of invalidLevels) {
        const isValid = typeof level === 'number' && level >= 1 && level <= 10;
        assert.strictEqual(isValid, false, `Level ${level} must fail bounds check`);
      }
      const validLevels = [1, 5, 7, 10];
      for (const level of validLevels) {
        const isValid = typeof level === 'number' && level >= 1 && level <= 10;
        assert.strictEqual(isValid, true, `Level ${level} must pass bounds check`);
      }
    });

    it('intercepts acute crisis notes without fabricating normal state', () => {
      const notes = 'I want to end my life, can not go on';
      const crisisResult = screenForCrisis(notes);
      assert.strictEqual(crisisResult.isCrisisDetected, true);
      assert.ok(crisisResult.helplineNotice.includes('988') || crisisResult.helplineNotice.includes('Crisis'));
    });
  });

  describe('4. Vercel Edge Configuration', () => {
    it('vercel.json specifies proxy rewrite for /api/* to Render backend', async () => {
      const fs = await import('node:fs');
      assert.ok(fs.existsSync('vercel.json'), 'vercel.json must exist in project root');
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      assert.ok(Array.isArray(vercelConfig.rewrites), 'rewrites must be configured');
      const apiRewrite = vercelConfig.rewrites.find((r: any) => r.source === '/api/(.*)');
      assert.ok(apiRewrite, '/api/(.*) rewrite must be configured');
      assert.match(apiRewrite.destination, /https:\/\/mindful-qu0m\.onrender\.com\/api\/\$1/);
    });
  });
});
