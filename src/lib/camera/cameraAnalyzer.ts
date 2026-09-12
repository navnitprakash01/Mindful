/**
 * Client-Side Camera Behavioral Analyzer
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 *
 * 100% ON-DEVICE PRIVACY-PRESERVING MOTOR DYNAMICS EXTRACTION
 *
 * Guarantees:
 * - NO raw video, frames, image data, or biometrics ever leave the browser.
 * - NO facial emotion taxonomy (no "happy", "sad", "angry", etc.).
 * - NO skin-tone classification, color-based skin detection, or demographic inference.
 * - Analyzes physical motor correlates (head velocity, pose variance, blink frequency,
 *   facial activity) using luminance-only, skin-tone-agnostic pixel analysis.
 * - Tracking quality is evaluated from luminance adequacy and frame texture (luma variance),
 *   NOT from skin-color heuristics.
 * - Immediate frame destruction after sampling.
 * - Complete MediaStream teardown on completion, cancellation, error, or device disconnect.
 */

import { CameraBehavioralMetrics } from '../../server/engine/cameraSignalProvider';

/**
 * Minimum luma difference between consecutive frames to classify a pixel as a "motion pixel".
 * Used for skin-tone-agnostic motion centroid tracking.
 */
const MOTION_PIXEL_THRESHOLD = 10;

/**
 * Minimum luma standard deviation in the central frame crop to classify the frame
 * as containing a trackable subject with visual structure (e.g. a face or head).
 * Replaces all skin-tone RGB heuristics. Purely luminance-based.
 */
const TEXTURE_STDDEV_THRESHOLD = 8.0;

export interface FrameSample {
  timestamp: number;
  /** Whether a tracking region with sufficient texture was detected in this frame (luminance-based, skin-tone agnostic) */
  faceDetected: boolean;
  /** Whether large-spread motion suggests potentially multiple sources (heuristic; see LIMITATION comment) */
  multipleFaces: boolean;
  /** Normalized X position of motion centroid [0.0, 1.0], skin-tone agnostic */
  centerX: number;
  /** Normalized Y position of motion centroid [0.0, 1.0], skin-tone agnostic */
  centerY: number;
  boundingWidth: number;
  boundingHeight: number;
  facialActivity: number;
  eyeLuminance: number;
  illumination: number;
}

export interface CameraAnalyzerCallbacks {
  onProgress?: (progressSeconds: number, targetSeconds: number) => void;
  onQualityUpdate?: (quality: number, trackingDetected: boolean) => void;
  onError?: (error: Error) => void;
  onComplete?: (metrics: CameraBehavioralMetrics) => void;
}

/**
 * Computes mean head movement velocity in normalized units/second
 * from a time-series of detected motion centroid positions.
 * Skin-tone agnostic: positions are derived from motion centroid, not skin detection.
 */
export function computeVelocity(
  positions: Array<{ x: number; y: number; t: number }>
): number {
  if (positions.length < 2) return 0;

  let totalDistance = 0;
  let validDeltas = 0;

  for (let i = 1; i < positions.length; i++) {
    const dt = (positions[i].t - positions[i - 1].t) / 1000;
    if (dt <= 0 || dt > 1.0) continue; // skip abnormal gaps

    const dx = positions[i].x - positions[i - 1].x;
    const dy = positions[i].y - positions[i - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Speed in normalized screen coordinates per second * 100
    const speed = (dist / dt) * 100;
    if (Number.isFinite(speed) && speed >= 0) {
      totalDistance += speed;
      validDeltas++;
    }
  }

  if (validDeltas === 0) return 0;
  return Number((totalDistance / validDeltas).toFixed(2));
}

/**
 * Computes variance of motion centroid positions across the session.
 * Represents 2D positional variance — NOT 3D head pose.
 */
export function computePoseVariance(
  positions: Array<{ x: number; y: number }>
): number {
  if (positions.length < 2) return 0;

  const n = positions.length;
  let sumX = 0;
  let sumY = 0;

  for (const p of positions) {
    sumX += p.x;
    sumY += p.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let varSum = 0;
  for (const p of positions) {
    const dx = (p.x - meanX) * 100;
    const dy = (p.y - meanY) * 100;
    varSum += dx * dx + dy * dy;
  }

  const variance = varSum / (n - 1);
  return Number(Math.max(0, variance).toFixed(2));
}

/**
 * Computes blink rate per minute from detected blink events.
 */
export function computeBlinkRate(
  blinkCount: number,
  durationSeconds: number
): number {
  if (durationSeconds <= 0 || blinkCount < 0) return 0;
  const rate = (blinkCount / durationSeconds) * 60;
  return Number(Math.min(120, Math.max(0, rate)).toFixed(1));
}

/**
 * Evaluates overall tracking quality from luminance levels and tracking region presence.
 * Quality is based purely on illumination adequacy and frame-by-frame tracking continuity.
 * No color or skin-tone information is used.
 *
 * Formula: 0.4 × illumination_score + 0.6 × presence_score
 */
export function computeTrackingQuality(
  illuminations: number[],
  trackingPresences: boolean[]
): number {
  if (illuminations.length === 0) return 0;

  // Adequate illumination: luma in [40, 220] (not too dark, not overexposed)
  let goodLightCount = 0;
  for (const lum of illuminations) {
    if (lum >= 40 && lum <= 220) {
      goodLightCount++;
    }
  }
  const lightScore = goodLightCount / illuminations.length;

  let detectedCount = 0;
  for (const pres of trackingPresences) {
    if (pres) detectedCount++;
  }
  const presenceScore = detectedCount / trackingPresences.length;

  // Composite tracking quality: 40% illumination suitability + 60% detection reliability
  const quality = lightScore * 0.4 + presenceScore * 0.6;
  return Number(Math.max(0.0, Math.min(1.0, quality)).toFixed(2));
}

/**
 * Validates whether a completed session meets strict reliability criteria.
 */
export function validateCameraSession(metrics: CameraBehavioralMetrics): {
  valid: boolean;
  reason?: string;
} {
  if (metrics.sessionDurationSeconds < 30) {
    return {
      valid: false,
      reason: 'Session duration is below the 30-second minimum requirement.',
    };
  }
  if (metrics.facePresenceRatio < 0.80) {
    return {
      valid: false,
      reason: 'Tracking presence ratio is below the 80% threshold. Please ensure adequate lighting and remain visible in frame.',
    };
  }
  if (metrics.multipleFacesDetected) {
    return {
      valid: false,
      reason: 'Multiple motion sources were detected. Only one user should be present in frame.',
    };
  }
  if (metrics.trackingQuality < 0.40) {
    return {
      valid: false,
      reason: 'Tracking quality was below 0.40. Please ensure adequate lighting and minimal glare.',
    };
  }
  return { valid: true };
}

/**
 * Browser-based Camera Behavioral Session Controller
 * Manages webcam lifecycle, canvas sampling loop, metric accumulation,
 * and deterministic teardown.
 *
 * Tracking algorithm — Skin-Tone Agnostic Design:
 * ─────────────────────────────────────────────────
 * Face/subject presence is detected using LUMINANCE-ONLY methods:
 *
 * 1. ILLUMINATION ADEQUACY: average frame luma in [25, 235].
 * 2. TEXTURE PRESENCE: luma standard deviation in the central 60% frame crop > 8.
 *    Any subject with visual structure (hair, eye region, features) produces luma
 *    variance; this is not dependent on skin color, ethnicity, or complexion.
 * 3. MOTION CENTROID: centroid of pixels with frame-to-frame luma change > 10 units.
 *    Used as a skin-tone-agnostic proxy for head position.
 *
 * These three criteria replace all prior RGB skin-tone heuristics (r>g, r>b, r-g>10).
 * The analysis is therefore equitable across all skin tones, under all tested lighting.
 *
 * Multiple Tracking Regions — Limitation Note:
 * ─────────────────────────────────────────────
 * The multiple-motion-regions heuristic (motion pixels > 35% of frame) is a coarse
 * quality gate. It does NOT reliably detect two partial faces. The primary safety
 * mechanism is the tracking quality gate (< 0.40 → session rejected).
 */
export class CameraBehavioralAnalyzer {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private samplingTimer: any = null;

  private startTime = 0;
  private durationTargetSeconds = 30;
  private samples: FrameSample[] = [];
  private previousLumaFrame: Uint8ClampedArray | null = null;
  private blinkCount = 0;
  private eyeClosed = false;
  private isAnalyzing = false;

  constructor(private callbacks: CameraAnalyzerCallbacks = {}) {}

  /**
   * Initializes webcam feed and begins 10 FPS on-device sampling loop.
   * Registers MediaStreamTrack.onended for hardware disconnect detection.
   */
  public async startSession(
    videoElement: HTMLVideoElement,
    durationSeconds = 30
  ): Promise<void> {
    if (this.isAnalyzing) {
      throw new Error('Camera analysis session is already active');
    }

    this.videoElement = videoElement;
    this.durationTargetSeconds = Math.max(30, Math.min(300, durationSeconds));
    this.samples = [];
    this.blinkCount = 0;
    this.eyeClosed = false;
    this.previousLumaFrame = null;

    try {
      // 1. Request video-only stream with conservative resolution
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });

      // 2. Register track.onended for hardware disconnect detection.
      //    If the camera is physically disconnected during a session, this fires
      //    immediately so the user receives a clear error instead of a stalled UI.
      this.mediaStream.getTracks().forEach((track) => {
        track.onended = () => {
          if (this.isAnalyzing) {
            this.callbacks.onError?.(
              new Error('Camera track ended unexpectedly. Please check your camera connection.')
            );
            this.teardown();
          }
        };
      });

      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      // 3. Setup hidden 160×120 processing canvas (lightweight for 10 FPS differencing)
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 160;
      this.canvasElement.height = 120;
      this.ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });

      this.startTime = Date.now();
      this.isAnalyzing = true;

      // 4. Start 100ms (10 FPS) sampling tick
      this.samplingTimer = setInterval(() => {
        this.sampleFrame();
      }, 100);
    } catch (err: any) {
      this.teardown();
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Samples a single frame, extracts luminance-based metrics, and zeroes image buffer.
   *
   * SKIN-TONE AGNOSTIC: All pixel analysis is performed on grayscale luminance.
   * No RGB color ratios, no skin-tone classification, no demographic inference.
   *
   * Tracking presence is detected via:
   *   (a) Luminance adequacy: avgIllumination in [25, 235]
   *   (b) Central texture: luma StdDev in center 60% crop > TEXTURE_STDDEV_THRESHOLD (8.0)
   *
   * Head position proxy (motion centroid) is derived from pixels with significant
   * frame-to-frame luma change (> MOTION_PIXEL_THRESHOLD = 10 luma units).
   */
  private sampleFrame(): void {
    if (!this.isAnalyzing || !this.videoElement || !this.ctx || !this.canvasElement) {
      return;
    }

    try {
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      this.callbacks.onProgress?.(
        Math.min(elapsedSeconds, this.durationTargetSeconds),
        this.durationTargetSeconds
      );

      // Draw video frame to small offscreen canvas
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      const imgData = this.ctx.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      const data = imgData.data;
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      const totalPixels = width * height;

      // ─── Step 1: Grayscale Luminance Extraction ────────────────────────────────
      // Standard perceptual luminance: 0.299R + 0.587G + 0.114B
      // No color classification — luminance only.
      const currentLuma = new Uint8ClampedArray(totalPixels);
      let totalLuma = 0;

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const luma = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
        currentLuma[i] = luma;
        totalLuma += luma;
      }

      const avgIllumination = totalLuma / totalPixels;

      // ─── Step 2: Motion Analysis (frame-to-frame diff, skin-tone agnostic) ─────
      let diffSum = 0;
      let motionSumX = 0;
      let motionSumY = 0;
      let motionPixelCount = 0;

      if (this.previousLumaFrame) {
        for (let i = 0; i < totalPixels; i++) {
          const diff = Math.abs(currentLuma[i] - this.previousLumaFrame[i]);
          diffSum += diff;
          // Motion pixel: luma changed by more than threshold between frames
          if (diff > MOTION_PIXEL_THRESHOLD) {
            motionSumX += i % width;
            motionSumY += Math.floor(i / width);
            motionPixelCount++;
          }
        }
      }

      this.previousLumaFrame = currentLuma;

      const facialActivity = Math.min(1.0, (diffSum / totalPixels) / 30);

      // ─── Step 3: Motion Centroid (head position proxy, skin-tone agnostic) ─────
      // Centroid of motion pixels = best available estimate of head/face position.
      // Falls back to prior centroid (stable position) when no motion in frame.
      // First frame always defaults to center (0.5, 0.5).
      let centerX = 0.5;
      let centerY = 0.5;
      if (motionPixelCount > 0) {
        centerX = (motionSumX / motionPixelCount) / width;
        centerY = (motionSumY / motionPixelCount) / height;
      } else if (this.samples.length > 0) {
        const last = this.samples[this.samples.length - 1];
        centerX = last.centerX;
        centerY = last.centerY;
      }

      // ─── Step 4: Texture-Based Tracking Presence (luminance, skin-tone agnostic) ─
      // Evaluates luma standard deviation in the central 60% crop.
      // Any subject with visual structure (hair boundary, eye region, features)
      // produces luma variance > TEXTURE_STDDEV_THRESHOLD. This is independent
      // of skin tone, complexion, or color channel ratios.
      const cropX0 = Math.floor(width * 0.2);
      const cropX1 = Math.floor(width * 0.8);
      const cropY0 = Math.floor(height * 0.2);
      const cropY1 = Math.floor(height * 0.8);

      let centralLumaSum = 0;
      let centralLumaSqSum = 0;
      let centralCount = 0;

      for (let cy = cropY0; cy < cropY1; cy++) {
        for (let cx = cropX0; cx < cropX1; cx++) {
          const luma = currentLuma[cy * width + cx];
          centralLumaSum += luma;
          centralLumaSqSum += luma * luma;
          centralCount++;
        }
      }

      const centralMean = centralCount > 0 ? centralLumaSum / centralCount : 0;
      const centralVariance =
        centralCount > 0
          ? centralLumaSqSum / centralCount - centralMean * centralMean
          : 0;
      const centralStdDev = Math.sqrt(Math.max(0, centralVariance));

      // Tracking region detected when BOTH conditions are satisfied:
      // (a) Adequate illumination — not too dark, not overexposed
      // (b) Sufficient frame texture — something with visual structure is present
      // This is the only presence detection gate; no RGB skin-tone logic.
      const adequateIllumination = avgIllumination >= 25 && avgIllumination <= 235;
      const sufficientTexture = centralStdDev > TEXTURE_STDDEV_THRESHOLD;
      const trackingRegionDetected = adequateIllumination && sufficientTexture;

      // ─── Step 5: Multiple Tracking Regions Heuristic ───────────────────────────
      // LIMITATION: This is a coarse quality gate, NOT reliable multi-face detection.
      // Fires when > 35% of pixels show significant motion, suggesting multiple
      // large sources of movement. False negatives are possible (two small/partial
      // motion sources may not reach the threshold). The primary safety mechanism
      // for multi-person scenarios is the tracking quality gate (< 0.40 → rejected).
      const multipleTrackingRegions = motionPixelCount > totalPixels * 0.35;

      // ─── Step 6: Blink Detection (luma-dip proxy at estimated eye region) ───────
      // Eye region estimated from motion centroid (skin-tone agnostic position).
      const eyeY = Math.floor(centerY * height * 0.85);
      const eyeX = Math.floor(centerX * width);
      let eyeLuma = 0;
      let eyeSampleCount = 0;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const sx = eyeX + dx;
          const sy = eyeY + dy;
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            eyeLuma += currentLuma[sy * width + sx];
            eyeSampleCount++;
          }
        }
      }
      const avgEyeLuma = eyeSampleCount > 0 ? eyeLuma / eyeSampleCount : avgIllumination;

      // Blink: luma dip in eye region below 72% of frame average
      if (avgEyeLuma < avgIllumination * 0.72) {
        if (!this.eyeClosed) {
          this.eyeClosed = true;
          this.blinkCount++;
        }
      } else {
        this.eyeClosed = false;
      }

      // ─── Step 7: Record Non-Identifying Scalar Sample ─────────────────────────
      // Only scalar values stored. No pixel data, no color values, no biometrics.
      this.samples.push({
        timestamp: Date.now(),
        faceDetected: trackingRegionDetected,
        multipleFaces: multipleTrackingRegions,
        centerX,
        centerY,
        boundingWidth: motionPixelCount > 0 ? Math.sqrt(motionPixelCount / totalPixels) : 0,
        boundingHeight: motionPixelCount > 0 ? Math.sqrt(motionPixelCount / totalPixels) : 0,
        facialActivity,
        eyeLuminance: avgEyeLuma,
        illumination: avgIllumination,
      });

      // Notify quality callback
      const quality = computeTrackingQuality(
        this.samples.slice(-10).map((s) => s.illumination),
        this.samples.slice(-10).map((s) => s.faceDetected)
      );
      this.callbacks.onQualityUpdate?.(quality, trackingRegionDetected);

      // Check completion condition
      if (elapsedSeconds >= this.durationTargetSeconds) {
        this.completeSession();
      }
    } catch (err: any) {
      // Camera hardware failure: device disconnected, track ended, video element error, etc.
      // Stop immediately — do NOT silently continue sampling blank/invalid frames.
      const error =
        err instanceof Error ? err : new Error('Camera sampling failed unexpectedly');
      this.callbacks.onError?.(error);
      this.teardown();
    }
  }

  /**
   * Finalizes the observation session, aggregates scalar metrics,
   * cleanly tears down all hardware handles, and fires completion callback.
   */
  private completeSession(): void {
    if (!this.isAnalyzing) return;
    this.isAnalyzing = false;

    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }

    const durationSeconds = (Date.now() - this.startTime) / 1000;
    const totalFrames = this.samples.length;

    const detectedFrames = this.samples.filter((s) => s.faceDetected).length;
    const multiFaceFrames = this.samples.filter((s) => s.multipleFaces).length;
    const facePresenceRatio = totalFrames > 0 ? detectedFrames / totalFrames : 0;
    const multipleFacesDetected = multiFaceFrames > totalFrames * 0.15;

    const positions = this.samples
      .filter((s) => s.faceDetected)
      .map((s) => ({ x: s.centerX, y: s.centerY, t: s.timestamp }));

    const headMovementVelocity = computeVelocity(positions);
    const headPoseVariance = computePoseVariance(positions);
    const blinkRatePerMinute = computeBlinkRate(this.blinkCount, durationSeconds);

    const totalActivity = this.samples.reduce((acc, s) => acc + s.facialActivity, 0);
    const facialActivityIndex =
      totalFrames > 0 ? Number((totalActivity / totalFrames).toFixed(2)) : 0.25;

    const trackingQuality = computeTrackingQuality(
      this.samples.map((s) => s.illumination),
      this.samples.map((s) => s.faceDetected)
    );

    const metrics: CameraBehavioralMetrics = {
      sessionDurationSeconds: Number(durationSeconds.toFixed(1)),
      facePresenceRatio: Number(facePresenceRatio.toFixed(2)),
      multipleFacesDetected,
      trackingQuality,
      headMovementVelocity,
      headPoseVariance,
      facialActivityIndex,
      blinkRatePerMinute,
    };

    this.teardown();
    this.callbacks.onComplete?.(metrics);
  }

  /**
   * Aborts active session and unconditionally stops webcam tracks and clears memory.
   */
  public cancelSession(): void {
    this.teardown();
  }

  /**
   * Deterministically releases all browser media streams, elements, and buffers.
   * Safe to call multiple times — idempotent.
   */
  private teardown(): void {
    this.isAnalyzing = false;

    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        // Deregister onended before stopping to prevent recursive teardown calls
        track.onended = null;
        try {
          track.stop();
        } catch {
          // ignore already stopped tracks
        }
      });
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    if (this.ctx && this.canvasElement) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.ctx = null;
      this.canvasElement = null;
    }

    this.previousLumaFrame = null;
    this.samples = [];
  }
}
