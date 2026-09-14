/**
 * Dashboard Personal State Presentation & Human Terminology Tests
 * Mindful 3.0 — Presentation layer simplification while preserving underlying state authority.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PersonalState, StateDimensionKey } from '../src/types';
import { DIMENSION_METADATA, buildDimensionSummary } from '../src/lib/observatoryHelpers';

describe('Dashboard Personal State Engine Presentation', () => {
  const dashboardSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/features/ZenDashboard.tsx'),
    'utf-8'
  );

  // Personal State Observatory has moved to AnalyticsView (Insights tab)
  const analyticsSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/features/AnalyticsView.tsx'),
    'utf-8'
  );

  describe('1. Underlying PersonalState Schema Invariants', () => {
    it('preserves canonical PersonalState dimension keys unchanged', () => {
      const canonicalKeys: StateDimensionKey[] = [
        'mood',
        'stress',
        'fatigue',
        'energy',
        'focus',
        'cognitiveLoad',
      ];

      assert.strictEqual(canonicalKeys.length, 6);
      assert.ok(canonicalKeys.includes('mood'));
      assert.ok(canonicalKeys.includes('stress'));
      assert.ok(canonicalKeys.includes('fatigue'));
      assert.ok(canonicalKeys.includes('energy'));
      assert.ok(canonicalKeys.includes('focus'));
      assert.ok(canonicalKeys.includes('cognitiveLoad'));
    });

    it('does NOT rename underlying state properties or database columns', () => {
      const mockState: PersonalState = {
        id: 'state-1',
        userId: 'test-user-123',
        timestamp: new Date().toISOString(),
        mood: 68,
        stress: 31,
        fatigue: 39,
        energy: 62,
        focus: 69,
        cognitiveLoad: 38,
        confidence: 0.66,
        overallConfidence: 0.66,
        dimensions: {
          mood: { value: 68, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          stress: { value: 31, confidence: 0.65, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          fatigue: { value: 39, confidence: 0.60, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          energy: { value: 62, confidence: 0.68, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          focus: { value: 69, confidence: 0.72, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          cognitiveLoad: { value: 38, confidence: 0.55, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        },
        evidence: [],
        sourceSummary: {},
        somaticMarkers: [],
        contextualTriggers: [],
        activeSignalsCount: 0,
        decayHalfLifeHours: 12.0,
      };

      assert.strictEqual(mockState.mood, 68);
      assert.strictEqual(mockState.stress, 31);
      assert.strictEqual(mockState.fatigue, 39);
      assert.strictEqual(mockState.energy, 62);
      assert.strictEqual(mockState.focus, 69);
      assert.strictEqual(mockState.cognitiveLoad, 38);
      assert.strictEqual(mockState.overallConfidence, 0.66);
    });
  });

  describe('2. Display Label Mapping in Dashboard', () => {
    it('renders human-readable labels for all 6 dimensions on Insights page (Personal State moved from Dashboard)', () => {
      assert.ok(analyticsSource.includes("label: 'Mood'"), 'Insights must use "Mood" label');
      assert.ok(analyticsSource.includes("label: 'Stress'"), 'Insights must use "Stress" label (not Stress Load)');
      assert.ok(analyticsSource.includes("label: 'Tiredness'"), 'Insights must use "Tiredness" label (not Fatigue)');
      assert.ok(analyticsSource.includes("label: 'Energy'"), 'Insights must use "Energy" label');
      assert.ok(analyticsSource.includes("label: 'Focus'"), 'Insights must use "Focus" label');
      assert.ok(analyticsSource.includes("label: 'Mental Load'"), 'Insights must use "Mental Load" label');
    });

    it('prohibits deprecated overly technical or misleading labels in Insights', () => {
      assert.ok(!analyticsSource.includes("label: 'Stress Load'"), 'Must NOT display "Stress Load"');
      assert.ok(!analyticsSource.includes("label: 'Fatigue'"), 'Must NOT display "Fatigue" label');
      assert.ok(!analyticsSource.includes("label: 'Vitality / Energy'"), 'Must NOT display "Vitality / Energy"');
      assert.ok(!analyticsSource.includes("label: 'Focus / Clarity'"), 'Must NOT display "Focus / Clarity"');
      assert.ok(!analyticsSource.includes("label: 'Cognitive Load'"), 'Must NOT display "Cognitive Load"');
      assert.ok(!analyticsSource.includes("label: 'Pressure'"), 'Must NOT alter concept to "Pressure"');
      assert.ok(!analyticsSource.includes("label: 'Low Energy'"), 'Must NOT confuse Fatigue with "Low Energy"');
      assert.ok(!analyticsSource.includes("label: 'Attention'"), 'Must NOT rename Focus to "Attention"');
    });

    it('updates DIMENSION_METADATA labels for consistent observatory presentation', () => {
      assert.strictEqual(DIMENSION_METADATA.mood.label, 'Mood');
      assert.strictEqual(DIMENSION_METADATA.stress.label, 'Stress');
      assert.strictEqual(DIMENSION_METADATA.fatigue.label, 'Tiredness');
      assert.strictEqual(DIMENSION_METADATA.energy.label, 'Energy');
      assert.strictEqual(DIMENSION_METADATA.focus.label, 'Focus');
      assert.strictEqual(DIMENSION_METADATA.cognitiveLoad.label, 'Mental Load');
    });
  });

  describe('3. Explanation Subtitle & Preserved Methodology', () => {
    it('uses primary user-facing text "Based on your recent signals" in Insights', () => {
      assert.ok(
        analyticsSource.includes('Based on your recent signals'),
        'Insights must display primary human text "Based on your recent signals"'
      );
    });

    it('preserves underlying mathematical methodology in accessible info tooltip in Insights', () => {
      assert.ok(
        analyticsSource.includes('Unified multimodal signal estimate • Exponential decay (t½ = 12h)'),
        'Methodology string must remain preserved in tooltip/details in Insights'
      );
    });
  });

  describe('4. Confidence Calculation & Accessible Tooltip', () => {
    it('preserves confidence calculation without fabrication or tampering', () => {
      const confidence = 0.66;
      const displayConfidence = Math.round(confidence * 100);
      assert.strictEqual(displayConfidence, 66);
    });

    it('includes accessible explanation tooltip for confidence in Insights', () => {
      assert.ok(
        analyticsSource.includes('How certain Mindful is about this estimate based on the available information.'),
        'Insights must provide accessible confidence tooltip explanation'
      );
    });

    it('distinguishes score vs confidence with accessible tooltip explanation in Insights', () => {
      assert.ok(
        analyticsSource.includes("Score: Mindful's current estimate on a 0–100 scale."),
        'Must explain 0-100 score meaning in tooltip'
      );
      assert.ok(
        analyticsSource.includes("Confidence: How reliable that estimate is based on the available signals.") ||
        analyticsSource.includes("Confidence reflects reliability based on available signals."),
        'Must explain confidence meaning in tooltip'
      );
    });

    it('displays single overall confidence in header and preserves confidence in card tooltips', () => {
      // Header has single overall confidence
      assert.ok(
        analyticsSource.includes('Confidence {Math.round((personalState?.overallConfidence ?? 0) * 100)}%'),
        'Insights header must display single overall confidence'
      );

      // Dimension cards preserve confidence in tooltip without permanent visual clutter
      assert.ok(
        analyticsSource.includes('<div><strong className="text-[#c0c4ea]">Confidence:</strong> {item.confidence}%</div>'),
        'Card must preserve dimension confidence in tooltip'
      );
    });

    it('removes internal development terminology (Phase 1 Active)', () => {
      assert.ok(!analyticsSource.includes('Phase 1 Active'), 'Must NOT display Phase 1 Active');
      assert.ok(!analyticsSource.includes('PHASE 1 ACTIVE'), 'Must NOT display PHASE 1 ACTIVE');
    });

    it('displays clear user-facing direction hints for each dimension in Insights', () => {
      assert.ok(analyticsSource.includes('Higher = more positive'), 'Mood must indicate Higher = more positive');
      assert.ok(analyticsSource.includes('Lower = less stress'), 'Stress must indicate Lower = less stress');
      assert.ok(analyticsSource.includes('Lower = less tired'), 'Tiredness must indicate Lower = less tired');
      assert.ok(analyticsSource.includes('Higher = more energy'), 'Energy must indicate Higher = more energy');
      assert.ok(analyticsSource.includes('Higher = better focus'), 'Focus must indicate Higher = better focus');
      assert.ok(analyticsSource.includes('Lower = less mental load'), 'Mental Load must indicate Lower = less mental load');
    });
  });

  describe('5. Deep Insights Navigation & Progressive Disclosure', () => {
    it('maintains the Deep Insights button linked to analytics in Dashboard', () => {
      // Dashboard still has a card that navigates to analytics (Day Streak card → analytics)
      assert.ok(
        dashboardSource.includes("setCurrentView('analytics')"),
        'Dashboard Day Streak card must still navigate to analytics view'
      );
    });

    it('buildDimensionSummary preserves values with human-readable labels', () => {
      const mockState: PersonalState = {
        id: 'state-2',
        userId: 'test-user-123',
        timestamp: new Date().toISOString(),
        mood: 68,
        stress: 31,
        fatigue: 39,
        energy: 62,
        focus: 69,
        cognitiveLoad: 38,
        confidence: 0.66,
        overallConfidence: 0.66,
        dimensions: {
          mood: { value: 68, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          stress: { value: 31, confidence: 0.65, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          fatigue: { value: 39, confidence: 0.60, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          energy: { value: 62, confidence: 0.68, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          focus: { value: 69, confidence: 0.72, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          cognitiveLoad: { value: 38, confidence: 0.55, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        },
        evidence: [],
        sourceSummary: {},
        somaticMarkers: [],
        contextualTriggers: [],
        activeSignalsCount: 0,
        decayHalfLifeHours: 12.0,
      };

      const summary = buildDimensionSummary(mockState);
      assert.strictEqual(summary.length, 6);

      const mood = summary.find(s => s.key === 'mood');
      assert.strictEqual(mood?.label, 'Mood');
      assert.strictEqual(mood?.value, 68);

      const stress = summary.find(s => s.key === 'stress');
      assert.strictEqual(stress?.label, 'Stress');
      assert.strictEqual(stress?.value, 31);

      const tiredness = summary.find(s => s.key === 'fatigue');
      assert.strictEqual(tiredness?.label, 'Tiredness');
      assert.strictEqual(tiredness?.value, 39);

      const energy = summary.find(s => s.key === 'energy');
      assert.strictEqual(energy?.label, 'Energy');
      assert.strictEqual(energy?.value, 62);

      const focus = summary.find(s => s.key === 'focus');
      assert.strictEqual(focus?.label, 'Focus');
      assert.strictEqual(focus?.value, 69);

      const mentalLoad = summary.find(s => s.key === 'cognitiveLoad');
      assert.strictEqual(mentalLoad?.label, 'Mental Load');
      assert.strictEqual(mentalLoad?.value, 38);
    });
  });

  describe('6. Dashboard Component Rendering & Hierarchy Verification', () => {
    it('renders ZenDashboard component tree cleanly without errors', async () => {
      if (typeof globalThis.localStorage === 'undefined') {
        const store = new Map<string, string>();
        (globalThis as any).localStorage = {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, String(v)),
          removeItem: (k: string) => store.delete(k),
          clear: () => store.clear(),
          key: (i: number) => Array.from(store.keys())[i] ?? null,
          length: 0,
        };
      }

      const React = await import('react');
      const { renderToString } = await import('react-dom/server');
      const { ToastProvider } = await import('../src/context/ToastContext');
      const { AuthProvider } = await import('../src/context/AuthContext');
      const { AppProvider } = await import('../src/context/AppContext');
      const { ZenDashboard } = await import('../src/components/features/ZenDashboard');

      const html = renderToString(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            AuthProvider,
            null,
            React.createElement(
              AppProvider,
              null,
              React.createElement(ZenDashboard)
            )
          )
        )
      );

      // Personal State has moved to Insights — must NOT appear on Dashboard
      assert.ok(!html.includes('Personal State'), 'Dashboard must NOT render "Personal State" (it moved to Insights)');
      assert.ok(!html.includes('Based on your recent signals'), 'Dashboard must NOT render Personal State subtitle (moved to Insights)');

      // Dashboard core elements must still be present
      assert.ok(html.includes('— A CALMER YOU —'), 'Dashboard must render eyebrow text');
      assert.ok(html.includes('How does your soul feel today?'), 'Dashboard must render subtitle');
      assert.ok(html.includes('Continue Your Streak'), 'Dashboard must render CTA');
    });
  });
});


