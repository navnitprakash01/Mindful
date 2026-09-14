/**
 * Body Check View & Somatic Runner Test Suite
 * Mindful 3.0 — Dedicated Somatic Surface, Responsive Runner, & Camera Consent Flow
 *
 * Verifies:
 * 1. ViewTab union includes 'body_check'
 * 2. Header.tsx desktop navigation includes 'Body Check' -> 'body_check'
 * 3. BottomNav.tsx mobile navigation includes 'Body Check' -> 'body_check'
 * 4. App.tsx routes 'body_check' to lazy BodyCheckView
 * 5. AnalyticsView.tsx removes embedded player and links to 'body_check'
 * 6. BodyCheckView component structure, hero card, protocols, and history
 * 7. InterventionPlayerModal 100dvh viewport constraint and flex layout (no vertical clipping)
 * 8. Pre-session camera consent flow (Option to start without camera vs enable feedback)
 * 9. In-session camera toggle and graceful degradation
 * 10. Strictly coarse behavioral indicators (movement stability, stillness score, no emotion detection)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Body Check Architecture & Surface Verification', () => {
  const typesPath = path.join(process.cwd(), 'src', 'types', 'index.ts');
  const headerPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Header.tsx');
  const bottomNavPath = path.join(process.cwd(), 'src', 'components', 'layout', 'BottomNav.tsx');
  const appPath = path.join(process.cwd(), 'src', 'App.tsx');
  const analyticsPath = path.join(process.cwd(), 'src', 'components', 'features', 'AnalyticsView.tsx');
  const bodyCheckPath = path.join(process.cwd(), 'src', 'components', 'features', 'BodyCheckView.tsx');
  const modalPath = path.join(process.cwd(), 'src', 'components', 'features', 'intervention', 'InterventionPlayerModal.tsx');

  it('1. ViewTab union in src/types/index.ts includes body_check', () => {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    assert.match(typesContent, /\|\s*'body_check'/, 'ViewTab must contain body_check');
  });

  it('2. Header.tsx desktop navigation includes Wellness Check tab (renamed from Body Check)', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    assert.match(
      headerContent,
      /\{\s*label:\s*'Wellness Check',\s*view:\s*'body_check'\s*\}/,
      "Header navLinks must include Wellness Check tab pointing to view: 'body_check'"
    );
  });

  it('3. BottomNav.tsx mobile navigation includes Wellness tab (renamed from Body Check)', () => {
    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
    assert.match(
      bottomNavContent,
      /label:\s*'Wellness',\s*view:\s*'body_check'/,
      "BottomNav items must include Wellness tab pointing to view: 'body_check'"
    );
    assert.match(bottomNavContent, /Activity/, 'BottomNav should use Activity or appropriate icon for Wellness Check');
  });

  it('4. App.tsx imports BodyCheckView and routes body_check view', () => {
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.match(appContent, /const BodyCheckView = lazy\(/, 'App.tsx must lazy-import BodyCheckView');
    assert.match(appContent, /case 'body_check':\s*return <BodyCheckView \/>;/, 'App.tsx renderView must handle body_check');
  });

  it('5. AnalyticsView.tsx removes embedded runner and provides clean Next Step card linking to body_check', () => {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    // Ensure embedded modal is removed
    assert.doesNotMatch(analyticsContent, /<InterventionPlayerModal/, 'AnalyticsView must not embed InterventionPlayerModal');
    // Ensure Next Step card navigates to body_check
    assert.match(analyticsContent, /setCurrentView\('body_check'\)/, 'AnalyticsView must have button opening body_check');
    assert.match(analyticsContent, /Your Next Step/i, 'AnalyticsView must have Your Next Step label');
    assert.match(analyticsContent, /Postural & Sensory Reset/i, 'AnalyticsView must mention Postural & Sensory Reset');
  });

  it('6. BodyCheckView.tsx renders dedicated surface elements, hero reset, and catalog', () => {
    const bodyCheckContent = fs.readFileSync(bodyCheckPath, 'utf8');
    assert.match(bodyCheckContent, /Body Check/, 'BodyCheckView must display Body Check title');
    assert.match(bodyCheckContent, /Reset your body and attention/, 'BodyCheckView must display subtitle');
    assert.match(bodyCheckContent, /Postural & Sensory Reset/, 'Hero card must present Postural & Sensory Reset');
    assert.match(bodyCheckContent, /Begin Body Check/, 'Hero card must have Begin Body Check button');
    assert.match(bodyCheckContent, /More Physical & Somatic Resets/, 'Must feature catalog of additional resets');
    assert.match(bodyCheckContent, /Recent Reset History/, 'Must feature recent session history');
    assert.match(bodyCheckContent, /non-clinical,\s*non-diagnostic/i, 'Must feature non-clinical disclaimer');
  });

  it('7. InterventionPlayerModal uses 100dvh viewport constraint and non-clipping flex structure', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    // Viewport bound and positioning safe from navbar
    assert.match(modalContent, /max-h-\[calc\(100dvh-/, 'Modal must constrain to dynamic viewport 100dvh');
    assert.match(modalContent, /pt-24/, 'Modal overlay must have top padding below fixed navbar');
    assert.match(modalContent, /createPortal/, 'Modal must be portaled to document.body');
    // Sticky header
    assert.match(modalContent, /shrink-0.*border-b/, 'Modal header must be non-shrinking sticky element');
    // Scrollable content area
    assert.match(modalContent, /flex-1 overflow-y-auto.*min-h-0/, 'Modal content body must be scrollable with min-h-0');
    // Sticky footer
    assert.match(modalContent, /shrink-0.*border-t/, 'Modal footer controls must be non-shrinking sticky element');
  });

  it('8. Pre-session camera consent flow is transparent and provides simple user-facing choice', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    // Consent stage exists
    assert.match(modalContent, /stage === 'consent'/, 'Modal must have dedicated consent stage');
    // Conceptual structure
    assert.match(modalContent, /How do you want to do this\?/, 'Must have heading How do you want to do this?');
    // Option 1
    assert.match(modalContent, /Standard/, 'Option 1 title Standard');
    assert.match(modalContent, /Follow the guided steps and timer\. No camera needed\./, 'Option 1 description');
    assert.match(modalContent, /Start Standard/, 'Primary action Start Standard');
    // Option 2
    assert.match(modalContent, /With camera feedback/, 'Option 2 title With camera feedback');
    assert.match(modalContent, /Let Mindful use your camera on this device to adjust the pace based on simple movement\. Nothing is recorded or uploaded\./, 'Option 2 description');
    assert.match(modalContent, /Enable Camera/, 'Primary action Enable Camera');
    // Small privacy explanation
    assert.match(modalContent, /Camera use is optional\. Processing stays on your device\. No video is recorded or uploaded\./, 'Small privacy explanation');
  });

  it('9. Mid-session camera toggle allows turning off camera seamlessly without interrupting session', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    assert.match(modalContent, /Turn Off Camera/, 'Must allow turning off camera in-session');
    assert.match(modalContent, /handleToggleCameraMidSession/, 'Must have in-session toggle handler');
    assert.match(modalContent, /Camera access was not granted/, 'Must gracefully fall back if camera fails');
  });

  it('10. Camera telemetry strictly displays coarse behavioral metrics with zero emotion recognition', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    // Does NOT claim posture stability or emotion recognition
    assert.doesNotMatch(modalContent, /posture stability/i, 'Must not claim posture stability, prefers simple movement');
    assert.doesNotMatch(modalContent, /emotion detection/i, 'Must not claim emotion detection');
    assert.doesNotMatch(modalContent, /facial emotion/i, 'Must not claim facial emotion recognition');
    assert.doesNotMatch(modalContent, /mood recognition/i, 'Must not claim camera mood recognition');
    assert.match(modalContent, /simple movement/i, 'Must describe simple movement');
  });
});
