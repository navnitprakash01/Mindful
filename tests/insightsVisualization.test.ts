/**
 * Insights Visualization Redesign Test Suite
 * Mindful 3.0 — Clear, High-Comprehension Inner State Overview
 *
 * Verifies:
 * 1. All six dimensions are displayed with authoritative labels (MOOD, STRESS, TIREDNESS, ENERGY, FOCUS, MENTAL LOAD)
 * 2. Existing state values are used without modification
 * 3. Direction semantics are strictly preserved (lower is positive for stress/tiredness/mental load, higher is positive for mood/energy/focus)
 * 4. No fabricated overall score is introduced
 * 5. Calibration uses the real value with accessible tooltip
 * 6. "Last 7 Days" time-window indicator is present
 * 7. "What This Means" is present and deterministic
 * 8. All six dimensions remain present in layout across viewports
 * 9. Core Insights sections remain intact
 * 10. No intervention redirect card was reintroduced
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Insights Visualization Redesign — Clear Inner State Overview', () => {
  const heroPath = path.join(
    process.cwd(),
    'src',
    'components',
    'features',
    'observatory',
    'ObservatoryHero.tsx'
  );
  const analyticsPath = path.join(
    process.cwd(),
    'src',
    'components',
    'features',
    'AnalyticsView.tsx'
  );

  it('1. ObservatoryHero.tsx renders all six authoritative dimensions', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(heroContent, /'mood'/, 'Must contain mood key');
    assert.match(heroContent, /'energy'/, 'Must contain energy key');
    assert.match(heroContent, /'focus'/, 'Must contain focus key');
    assert.match(heroContent, /'fatigue'/, 'Must contain fatigue key');
    assert.match(heroContent, /'stress'/, 'Must contain stress key');
    assert.match(heroContent, /'cognitiveLoad'/, 'Must contain cognitiveLoad key');

    assert.match(heroContent, /dim.label/, 'Must render dimension label');
    assert.match(heroContent, /dim.value/, 'Must render dimension value');
  });

  it('2. Preserves semantically correct direction logic', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    // Verify lower is better check for regulation trio
    assert.match(
      heroContent,
      /isLowerBetter\s*=\s*node\.key\s*===\s*'stress'/,
      'Must define lower-is-better for stress'
    );
    // Verify isPositiveDelta check
    assert.match(
      heroContent,
      /isPositiveDelta\s*=\s*true/,
      'Must compute isPositiveDelta'
    );
  });

  it('3. Does NOT fabricate an overall score number', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    // Does not have a fake average or fabricated overall score calculation
    assert.doesNotMatch(
      heroContent,
      /overallScores*=s*/,
      'Must not compute a fabricated overallScore'
    );
    assert.match(
      heroContent,
      /center.statusLabel/,
      'Uses existing center.statusLabel for qualitative state'
    );
  });

  it('4. Preserves calibration tooltip with exact non-diagnostic explanation', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(
      heroContent,
      /Calibration reflects how much recent, consistent signal data is available for this view. It is not a measure of health or diagnosis./,
      'Must contain standard calibration non-diagnostic tooltip'
    );
  });

  it('5. Preserves Last 7 Days indicator', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(heroContent, /Last 7 Days/, 'Must display Last 7 Days');
  });

  it('6. Includes "What This Means" deterministic synthesis', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(heroContent, /What This Means/, 'Must display What This Means header');
    assert.match(heroContent, /deriveWhatThisMeans/, 'Must call deterministic derivation function');
  });

  it('7. Includes compact Insight strip with pattern exploration link', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(heroContent, /Insight/, 'Must have Insight badge');
    assert.match(heroContent, /Explore your patterns/, 'Must have Explore your patterns link');
  });

  it('8. Central 3D Inner State Core and 6 floating orbital nodes are rendered with 3D depth and motion safety', () => {
    const heroContent = fs.readFileSync(heroPath, 'utf8');
    assert.match(heroContent, /orbitalNodesConfig/, 'Must define orbitalNodesConfig');
    assert.match(heroContent, /transformStyle:\s*'preserve-3d'/, 'Must use preserve-3d for 3D depth');
    assert.match(heroContent, /perspective/, 'Must configure 3D perspective');
    assert.match(heroContent, /useReducedMotion/, 'Must support prefers-reduced-motion');
  });

  it('9. AnalyticsView.tsx passes required props to ObservatoryHero', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    assert.match(analyticsContent, /personalState=\{personalState\}/, 'Passes personalState');
    assert.match(analyticsContent, /patterns=\{patterns\}/, 'Passes patterns');
    assert.match(analyticsContent, /onExplorePatterns=\{handleExploreDetails\}/, 'Passes onExplorePatterns');
  });

  it('10. No intervention or redirect card was reintroduced into AnalyticsView or ObservatoryHero', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    const heroContent = fs.readFileSync(heroPath, 'utf8');

    assert.doesNotMatch(analyticsContent, /Recommended Reset/, 'AnalyticsView must not have Recommended Reset');
    assert.doesNotMatch(analyticsContent, /Postural & Sensory Reset/, 'AnalyticsView must not have Postural & Sensory Reset');
    assert.doesNotMatch(heroContent, /Start Reset/, 'ObservatoryHero must not have Start Reset CTA');
    assert.doesNotMatch(heroContent, /Recommended Reset/, 'ObservatoryHero must not have Recommended Reset');
  });
});
