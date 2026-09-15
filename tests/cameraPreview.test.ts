/**
 * Camera Preview & MediaStream Lifecycle Verification Tests
 * Mindful 3.0 — Wellness Check / Somatic Reset Runner Live Preview
 *
 * Verifies:
 * 1. Camera disabled -> no preview rendered.
 * 2. Camera enabled -> live preview is rendered with 16:9, rounded corners, mirrored self-view.
 * 3. Preview uses the existing camera stream from useBiofeedbackSession (no second stream).
 * 4. Zero second getUserMedia calls are introduced.
 * 5. Turning camera off stops/removes the preview and cleans up hardware tracks.
 * 6. Camera permission failure falls back gracefully to standard mode.
 * 7. Existing adaptive biofeedback behavior remains unchanged.
 * 8. Existing privacy guarantees remain unchanged (audio: false, 100% on-device).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Wellness Check Camera Preview & Stream Verification', () => {
  const modalPath = path.join(
    process.cwd(),
    'src',
    'components',
    'features',
    'intervention',
    'InterventionPlayerModal.tsx'
  );
  const hookPath = path.join(
    process.cwd(),
    'src',
    'hooks',
    'useBiofeedbackSession.ts'
  );

  const modalSource = fs.readFileSync(modalPath, 'utf8');
  const hookSource = fs.readFileSync(hookPath, 'utf8');

  it('1. Camera disabled -> preview container is conditioned on biofeedbackOptIn', () => {
    // When biofeedbackOptIn is false, the preview container is not rendered
    assert.match(
      modalSource,
      /\{biofeedbackOptIn\s*&&\s*\(\s*<div[^>]*data-testid="camera-preview-container"/,
      'Camera preview container must only render when biofeedbackOptIn is true'
    );
    // Hidden video fallback keeps ref mounted
    assert.match(
      modalSource,
      /\{!biofeedbackOptIn\s*&&\s*\(\s*<video[^>]*className="hidden"/,
      'Must maintain hidden video element when camera is disabled to keep ref mounted'
    );
  });

  it('2. Camera enabled -> preview is rendered with aspect-video, rounded corners, and mirror transform', () => {
    // Aspect ratio ~ 16:9
    assert.match(
      modalSource,
      /aspect-video/,
      'Camera preview must use 16:9 aspect ratio (aspect-video)'
    );
    // Rounded corners & subtle border
    assert.match(
      modalSource,
      /rounded-2xl\s+overflow-hidden\s+border/,
      'Camera preview must have rounded corners and border'
    );
    // Compact, non-fullscreen dimensions
    assert.match(
      modalSource,
      /w-48\s+sm:w-56/,
      'Camera preview must be a compact responsive card (w-48 sm:w-56)'
    );
    // Horizontal mirror for natural self-view
    assert.match(
      modalSource,
      /scale-x-\[-1\]/,
      'Camera preview video must be horizontally mirrored (scale-x-[-1])'
    );
    // "Camera active" indicator badge
    assert.match(
      modalSource,
      /Camera active/,
      'Must display a small "Camera active" badge on the preview'
    );
  });

  it('3. Preview uses the single existing MediaStream from useBiofeedbackSession', () => {
    // Hook exposes stream in its return interface
    assert.match(
      hookSource,
      /stream:\s*MediaStream\s*\|\s*null;/,
      'UseBiofeedbackSessionReturn must expose stream'
    );
    // Stream state is set in startBiofeedback
    assert.match(
      hookSource,
      /setStream\(stream\);/,
      'startBiofeedback must set stream state'
    );
    // Stream state is cleared in cleanupHardware
    assert.match(
      hookSource,
      /setStream\(null\);/,
      'cleanupHardware must clear stream state'
    );
    // Modal synchronizes biofeedback.stream to videoRef
    assert.match(
      modalSource,
      /biofeedback\.videoRef\.current\.srcObject\s*=\s*biofeedback\.stream/,
      'Modal must attach the existing biofeedback.stream to the video element'
    );
  });

  it('4. Zero second getUserMedia calls are introduced in the codebase', () => {
    // Ensure InterventionPlayerModal NEVER calls getUserMedia directly
    assert.doesNotMatch(
      modalSource,
      /navigator\.mediaDevices\.getUserMedia/,
      'InterventionPlayerModal must NOT call getUserMedia directly'
    );
    // Verify useBiofeedbackSession is the sole owner of getUserMedia in biofeedback
    const hookGUMCount = (
      hookSource.match(/navigator\.mediaDevices\.getUserMedia/g) || []
    ).length;
    assert.strictEqual(
      hookGUMCount,
      1,
      'useBiofeedbackSession must contain exactly one getUserMedia call'
    );
  });

  it('5. Turning camera off stops/removes the preview and cleans up tracks', () => {
    // Stopping biofeedback cleans up hardware tracks
    assert.match(
      hookSource,
      /track\.stop\(\)/,
      'cleanupHardware must invoke track.stop() on all tracks'
    );
    // Video element srcObject is reset
    assert.match(
      hookSource,
      /videoRef\.current\.srcObject\s*=\s*null/,
      'cleanupHardware must nullify video element srcObject'
    );
    // Modal toggle handler stops biofeedback and updates state
    assert.match(
      modalSource,
      /biofeedback\.stopBiofeedback\(\)/,
      'handleToggleCameraMidSession must call stopBiofeedback()'
    );
    assert.match(
      modalSource,
      /setBiofeedbackOptIn\(false\)/,
      'handleToggleCameraMidSession must set biofeedbackOptIn to false'
    );
  });

  it('6. Camera permission failure falls back gracefully to standard mode', () => {
    // Permission catch block sets biofeedbackOptIn to false and sets fallback notice
    assert.match(
      modalSource,
      /setCameraNotice\('Camera access was not granted\./,
      'Must display notice when camera access is not granted'
    );
    // Standard visual runner remains available
    assert.match(
      modalSource,
      /Using standard visual pacer|standard guided steps/,
      'Must offer clear standard mode messaging on camera fallback'
    );
  });

  it('7. Existing adaptive biofeedback behavior remains intact', () => {
    // 10 FPS canvas sampling loop untouched
    assert.match(
      hookSource,
      /setInterval\(\(\)\s*=>\s*\{/,
      'Must preserve sampling interval'
    );
    // Luma conversion and stillness calculation untouched
    assert.match(
      hookSource,
      /calculateSomaticStillness/,
      'Must preserve calculateSomaticStillness call'
    );
    // Dynamic cycle pacing evaluation untouched
    assert.match(
      hookSource,
      /evaluateAdaptivePacing/,
      'Must preserve evaluateAdaptivePacing call'
    );
  });

  it('8. Existing privacy guarantees remain strictly enforced', () => {
    // Zero audio capture
    assert.match(
      hookSource,
      /audio:\s*false/,
      'getUserMedia must strictly enforce audio: false'
    );
    // Zero raw frame network upload
    assert.doesNotMatch(
      modalSource,
      /api\/camera\/upload|api\/video|streamVideo/i,
      'Must never upload video stream to server'
    );
    // Telemetry display strictly claims simple movement
    assert.doesNotMatch(
      modalSource,
      /posture stability/i,
      'Must not claim posture stability in accordance with project constraints'
    );
  });
});
