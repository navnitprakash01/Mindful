/**
 * Insights Mid-Section Redesign & Simplicity Test Suite
 * Mindful 3.0 — Inner State Observatory Mid-Section
 *
 * Verifies:
 * 1. ObservatoryLivingSummary renders "CURRENT STATE" with calibration pill & accessible info tooltip
 * 2. Non-diagnostic calibration explanation ("estimate, not a diagnosis") is preserved
 * 3. Technical jargon ("mathematical signal fusion") is removed in favor of "Based on your recent check-ins and reflections."
 * 4. MOOD, ENERGY, FOCUS core metrics render values with semantic delta badges
 * 5. "WHAT'S CHANGING" replaces "What's Happening?", includes delta badge & mini SVG trend curve
 * 6. "WHAT YOU'VE NOTICED" replaces "What May Be Influencing You?", uses non-causal contextual language
 * 7. "View evidence →" replaces "See evidence" and is wired to deep dive
 * 8. Prohibited CTAs (Recommended Reset, Vitality Micro-Movement, etc.) remain absent
 * 9. Reduced motion and accessibility attributes are preserved
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Insights Mid-Section Redesign: Simplicity & Emotional Clarity', () => {
  const livingSummaryPath = path.join(process.cwd(), 'src', 'components', 'features', 'observatory', 'ObservatoryLivingSummary.tsx');
  const analyticsPath = path.join(process.cwd(), 'src', 'components', 'features', 'AnalyticsView.tsx');

  it('1. ObservatoryLivingSummary renders clean CURRENT STATE header', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /CURRENT STATE/, 'Must render uppercase CURRENT STATE header');
    assert.match(content, /Based on your recent check-ins and reflections\./, 'Must render clean human subtitle');
    assert.doesNotMatch(content, /Derived from continuous mathematical signal fusion across your active reflections/, 'Must remove mathematical signal fusion jargon');
  });

  it('2. Preserves calibration pill with accessible info tooltip and non-diagnostic explanation', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /CALIBRATED/, 'Must render CALIBRATED text in pill');
    assert.match(content, /ShieldCheck/, 'Must include ShieldCheck icon');
    assert.match(content, /id="calibration-tooltip"/, 'Must include accessible tooltip id');
    assert.match(content, /role="tooltip"/, 'Must include role=tooltip');
    assert.match(content, /aria-describedby="calibration-tooltip"/, 'Must connect trigger with tooltip');
    assert.match(content, /estimate, not a diagnosis/i, 'Must include non-diagnostic disclaimer in tooltip');
    assert.match(content, /How Mindful estimates this/i, 'Must include tooltip title');
  });

  it('3. Renders MOOD, ENERGY, FOCUS metrics with semantic delta badges', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /primaryDimensions\.map/, 'Must map primary dimensions');
    assert.match(content, /dim\.label/, 'Must render dimension label');
    assert.match(content, /dim\.value/, 'Must render dimension value');
    assert.match(content, /\/100/, 'Must render scale denominator');
    assert.match(content, /deltaBadge/, 'Must compute and display semantic delta badge');
    assert.match(content, /baselineDeviation/, 'Must check baselineDeviation for delta');
    assert.match(content, /aria-label=/, 'Must include accessible aria-label for delta');
  });

  it('4. Renders WHAT\'S CHANGING with concise headline, delta badge, and mini SVG trend curve', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /WHAT'S CHANGING/, 'Must render WHAT\'S CHANGING header');
    assert.doesNotMatch(content, /What's Happening\?/, 'Must replace What\'s Happening?');
    assert.match(content, /whatsHappening\.headline/, 'Must render intelligence headline');
    assert.match(content, /whatsHappening\.detail/, 'Must render intelligence detail');
    assert.match(content, /Recent trend/, 'Must render Recent trend label');
    assert.match(content, /<svg[^>]*80[^>]*22/, 'Must render smooth mini SVG trend curve');
    assert.match(content, /linearGradient id="trendStrokeGrad"/, 'Must render gradient stroke for trend curve');
    assert.doesNotMatch(content, /Evidence-calibrated trend/, 'Must replace Evidence-calibrated trend with Recent trend');
  });

  it('5. Renders WHAT YOU\'VE NOTICED with non-causal framing and contextual chips', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /WHAT YOU'VE NOTICED/, 'Must render WHAT YOU\'VE NOTICED header');
    assert.doesNotMatch(content, /What May Be Influencing You\?/, 'Must replace What May Be Influencing You?');
    assert.doesNotMatch(content, /Active Context & Sensations/, 'Must replace Active Context & Sensations heading');
    assert.match(content, /Things you recently mentioned during check-ins\./, 'Must state non-causal context line');
    assert.match(content, /activeSignals\.map/, 'Must render active contextual tags & sensations');
    assert.match(content, /From your recent check-ins/, 'Must render honest source indicator');
    assert.match(content, /View evidence/, 'Must label action as View evidence');
    assert.match(content, /onExploreDetails/, 'Must connect View evidence to onExploreDetails');
  });

  it('6. Prohibited redirect CTAs remain strictly absent', () => {
    const summaryContent = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.doesNotMatch(summaryContent, /Your Next Step/i, 'No Your Next Step');
    assert.doesNotMatch(summaryContent, /Recommended Reset/i, 'No Recommended Reset');
    assert.doesNotMatch(summaryContent, /Personalized Reset/i, 'No Personalized Reset');
    assert.doesNotMatch(summaryContent, /Vitality Micro-Movement/i, 'No Vitality Micro-Movement');
    assert.doesNotMatch(summaryContent, /Start Reset/i, 'No Start Reset');
    assert.doesNotMatch(summaryContent, /Open Body Check/i, 'No Open Body Check');
  });

  it('7. AnalyticsView correctly passes personalState to ObservatoryLivingSummary', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    assert.match(analyticsContent, /<ObservatoryLivingSummary[\s\S]*personalState={personalState}/, 'AnalyticsView must pass personalState');
  });

  it('8. Supports prefers-reduced-motion', () => {
    const content = fs.readFileSync(livingSummaryPath, 'utf8');
    assert.match(content, /useReducedMotion/, 'Must import and use useReducedMotion hook');
    assert.match(content, /prefersReducedMotion/, 'Must check prefersReducedMotion');
  });
});
