/**
 * Insights View Final Cleanup & Intelligence Integrity Test Suite
 * Mindful 3.0 — Pure Intelligence Observatory
 *
 * Verifies:
 * 1. AnalyticsView.tsx removes the Next Step / Recommended Reset redirect card
 * 2. AnalyticsView.tsx does not redirect to body_check
 * 3. AnalyticsView.tsx removes unused Card and icon imports
 * 4. AnalyticsView.tsx preserves all intelligence modules (Hero, Living Summary, Forecast, Digest, Observatory, Deep Dive)
 * 5. AnalyticsView.tsx preserves honest, non-clinical disclaimer and real data bindings
 * 6. Top navigation and Wellness Check feature remain 100% intact
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Insights Final Cleanup & Observatory Intelligence Integrity', () => {
  const analyticsPath = path.join(process.cwd(), 'src', 'components', 'features', 'AnalyticsView.tsx');
  const headerPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Header.tsx');
  const bottomNavPath = path.join(process.cwd(), 'src', 'components', 'layout', 'BottomNav.tsx');
  const appPath = path.join(process.cwd(), 'src', 'App.tsx');
  const bodyCheckPath = path.join(process.cwd(), 'src', 'components', 'features', 'BodyCheckView.tsx');

  it('1. AnalyticsView.tsx removes the redirect card to Body Check', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    assert.doesNotMatch(analyticsContent, /Recommended Reset/, 'Must not have Recommended Reset badge');
    assert.doesNotMatch(analyticsContent, /Postural & Sensory Reset/, 'Must not have Postural & Sensory Reset redirect');
    assert.doesNotMatch(analyticsContent, /Open Body Check/, 'Must not have Open Body Check button');
    assert.doesNotMatch(analyticsContent, /Release screen tension, align posture/, 'Must not have body check pitch copy');
    assert.doesNotMatch(analyticsContent, /setCurrentView\('body_check'\)/, 'Must not call setCurrentView for body_check');
  });

  it('2. AnalyticsView.tsx removes genuinely dead imports', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    assert.doesNotMatch(analyticsContent, /import\s*\{\s*Card\s*\}\s*from/, 'Card import must be removed');
    assert.doesNotMatch(analyticsContent, /ArrowRight/, 'ArrowRight must not be imported or used');
    assert.doesNotMatch(analyticsContent, /setCurrentView,/, 'setCurrentView must not be destructured from useApp');
  });

  it('3. AnalyticsView.tsx preserves all core intelligence sections', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    // Header & Observatory Hero
    assert.match(analyticsContent, /Your Inner Observatory/, 'Must include Inner Observatory header');
    assert.match(analyticsContent, /<ObservatoryHero/, 'Must render ObservatoryHero');
    // Living Summary
    assert.match(analyticsContent, /<ObservatoryLivingSummary/, 'Must render ObservatoryLivingSummary');
    // Longitudinal Intelligence
    assert.match(analyticsContent, /<ForecastTrajectoryCard/, 'Must render ForecastTrajectoryCard');
    assert.match(analyticsContent, /<WeeklyDigestCard/, 'Must render WeeklyDigestCard');
    // Personal State Dimension Breakdown
    assert.match(analyticsContent, /Personal State/, 'Must include Personal State section');
    assert.match(analyticsContent, /Mood/, 'Must include Mood dimension');
    assert.match(analyticsContent, /Stress/, 'Must include Stress dimension');
    assert.match(analyticsContent, /Tiredness/, 'Must include Tiredness dimension');
    assert.match(analyticsContent, /Energy/, 'Must include Energy dimension');
    assert.match(analyticsContent, /Focus/, 'Must include Focus dimension');
    assert.match(analyticsContent, /Mental Load/, 'Must include Mental Load dimension');
    // Deep Dive
    assert.match(analyticsContent, /<ObservatoryDeepDive/, 'Must render ObservatoryDeepDive');
    // Non-clinical disclaimer
    assert.match(analyticsContent, /not clinical psychiatric diagnoses/i, 'Must preserve non-clinical disclaimer');
  });

  it('4. Header, BottomNav, and App.tsx keep Wellness Check 100% intact', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    assert.match(headerContent, /\{\s*label:\s*'Wellness Check',\s*view:\s*'body_check'\s*\}/, 'Header retains Wellness Check');

    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
    assert.match(bottomNavContent, /view:\s*'body_check'/, 'BottomNav retains body_check view');

    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.match(appContent, /case 'body_check':\s*return <BodyCheckView \/>;/, 'App routes body_check view');

    const bodyCheckContent = fs.readFileSync(bodyCheckPath, 'utf8');
    assert.match(bodyCheckContent, /Postural & Sensory Reset/, 'BodyCheckView retains Postural & Sensory Reset');
  });

  it('5. ObservatoryLivingSummary does not render Next Step / Vitality Micro-Movement recommendation card', () => {
    const livingSummaryPath = path.join(process.cwd(), 'src', 'components', 'features', 'observatory', 'ObservatoryLivingSummary.tsx');
    const summaryContent = fs.readFileSync(livingSummaryPath, 'utf8');

    assert.doesNotMatch(summaryContent, /Your Next Step/i, 'Must not render Your Next Step');
    assert.doesNotMatch(summaryContent, /Personalized Reset/i, 'Must not render Personalized Reset');
    assert.doesNotMatch(summaryContent, /Start Reset/i, 'Must not render Start Reset');
    assert.doesNotMatch(summaryContent, /useIntervention/, 'Must not use InterventionContext');
    assert.doesNotMatch(summaryContent, /openPlayer/, 'Must not have openPlayer handler');
  });

  it('6. Underlying intervention library preserves Vitality Micro-Movement for Wellness Check / engines', () => {
    const libraryPath = path.join(process.cwd(), 'src', 'server', 'engine', 'interventionEngine', 'library.ts');
    const libraryContent = fs.readFileSync(libraryPath, 'utf8');

    assert.match(libraryContent, /title:\s*['"]Vitality Micro-Movement['"]/, 'Vitality Micro-Movement must remain in intervention library');
    assert.match(libraryContent, /Break lethargic inertia through 3 minutes of voluntary dynamic circulation/, 'Description must remain in library');
  });
});
