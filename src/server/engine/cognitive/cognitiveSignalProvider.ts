/**
 * Cognitive Signal Provider
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Implements deterministic mathematical signal extraction from focus session telemetry.
 *
 * Strict Architectural Guarantees:
 * - Deterministic, non-LLM calculation of cognitiveLoad, focus, fatigue, and energy.
 * - Under NO circumstances does session_cognitive modify mood valence.
 * - Non-diagnostic, non-clinical explanations (no medical or psychiatric claims).
 * - Confidence strictly bounded to [0.20, 0.85], reliability weight = 0.70.
 */

import {
  CognitiveMetrics,
  CognitiveEstimate,
  FocusSession,
} from './types';
import {
  WellnessSignal,
  SignalModality,
} from '../types';

export class CognitiveSignalProvider {
  public readonly modality: SignalModality = 'session_cognitive';
  public readonly reliabilityWeight: number = 0.70;

  /**
   * Deterministically calculates cognitive estimates from aggregated session metrics.
   */
  public calculateEstimate(metrics: CognitiveMetrics): CognitiveEstimate {
    const duration = Math.max(0, Math.min(180, metrics.sessionDurationMinutes));
    const shiftRate = Math.max(0, Math.min(60, metrics.attentionalShiftRate));
    const entropy = Math.max(0, Math.min(2.0, metrics.typingCadenceEntropy));
    const typingRatio = Math.max(0, Math.min(1.0, metrics.activeTypingRatio));
    const difficulty = metrics.subjectiveDifficulty ?? 3; // default neutral

    // ─────────────────────────────────────────────────────────────
    // 1. COGNITIVE LOAD CALCULATION
    // Base neutral: 35
    // ─────────────────────────────────────────────────────────────
    let load = 35;

    // A. Duration Saturation Curve (Ultradian rhythm decay)
    if (duration <= 45) {
      load += (duration / 45) * 15; // 0 -> +15
    } else {
      const overtime = Math.min(90, duration - 45);
      load += 15 + (overtime / 45) * 18; // +15 -> +51
    }

    // B. Attentional Fragmentation Impact
    // Normal: < 1.5 shifts/min. Strained: > 3.0 shifts/min.
    const shiftLoadDelta = Math.min(26, shiftRate * 4.2);
    load += shiftLoadDelta;

    // C. Typing Cadence Entropy Impact (Weighted by typing activity)
    if (entropy > 0.80) {
      // Erratic rhythm indicates cognitive friction
      const entropyPenalty = Math.min(14, (entropy - 0.80) * 12) * Math.max(0.4, typingRatio);
      load += entropyPenalty;
    } else if (entropy >= 0.25 && entropy <= 0.60 && typingRatio > 0.3) {
      // Steady rhythmic typing indicates comfortable flow
      load -= 6;
    }

    // D. Subjective Difficulty Delta
    if (difficulty >= 4) {
      load += (difficulty - 3) * 7; // +7 to +14
    } else if (difficulty <= 2) {
      load -= (3 - difficulty) * 5; // -5 to -10
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FOCUS CLARITY CALCULATION
    // Base neutral: 65
    // ─────────────────────────────────────────────────────────────
    let focus = 65;

    // A. Attentional Shift Degradation
    const shiftFocusPenalty = Math.min(38, shiftRate * 6.5);
    focus -= shiftFocusPenalty;

    // B. Rhythm & Cadence Contribution
    if (entropy >= 0.25 && entropy <= 0.65 && typingRatio > 0.25) {
      // High cadence consistency promotes flow state
      focus += 16 * Math.min(1.0, typingRatio * 1.5);
    } else if (entropy > 0.90) {
      focus -= Math.min(18, (entropy - 0.90) * 16);
    }

    // C. Time-on-task attentional fatigue (after 50 min)
    if (duration > 50) {
      const fatigueDecay = Math.min(24, ((duration - 50) / 40) * 16);
      focus -= fatigueDecay;
    } else if (duration >= 20 && shiftRate < 2.0) {
      // Sustained early work bonus
      focus += 8;
    }

    // D. Subjective Difficulty Impact on focus
    if (difficulty >= 4) {
      focus -= (difficulty - 3) * 6;
    } else if (difficulty <= 2) {
      focus += (3 - difficulty) * 5;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SOMATIC / MENTAL FATIGUE & ENERGY
    // ─────────────────────────────────────────────────────────────
    let fatigue = 30;
    let energy = 70;

    // Duration exhaustion
    const durationExhaustion = Math.min(38, (duration / 75) * 28);
    fatigue += durationExhaustion;
    energy -= durationExhaustion;

    // Fragmentation strain on fatigue
    if (shiftRate > 2.5) {
      const fragFatigue = Math.min(14, (shiftRate - 2.5) * 3.5);
      fatigue += fragFatigue;
      energy -= fragFatigue;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. BOUNDING & CLAMPING
    // Strictly bounded, finite numbers.
    // ─────────────────────────────────────────────────────────────
    const boundedLoad = Math.max(10, Math.min(95, Math.round(load)));
    const boundedFocus = Math.max(10, Math.min(95, Math.round(focus)));
    const boundedFatigue = Math.max(0, Math.min(100, Math.round(fatigue)));
    const boundedEnergy = Math.max(0, Math.min(100, Math.round(energy)));

    // ─────────────────────────────────────────────────────────────
    // 5. CONFIDENCE CALCULATION
    // Scales with session duration and telemetry stability.
    // Clamped strictly to [0.20, 0.85].
    // ─────────────────────────────────────────────────────────────
    let confidence = 0.45;
    if (duration >= 20) confidence += 0.15;
    if (duration >= 45) confidence += 0.10;
    if (typingRatio > 0.20) confidence += 0.08;
    if (metrics.subjectiveDifficulty !== undefined) confidence += 0.05;
    const boundedConfidence = Math.max(0.20, Math.min(0.85, Number(confidence.toFixed(2))));

    // ─────────────────────────────────────────────────────────────
    // 6. TRANSPARENT NON-DIAGNOSTIC SUMMARY
    // ─────────────────────────────────────────────────────────────
    let summary = '';
    if (boundedLoad >= 65 && shiftRate >= 3.0) {
      summary = `Elevated task saturation and frequent attentional shifts observed during a ${Math.round(duration)}-minute session.`;
    } else if (boundedFocus >= 75) {
      summary = `High focus flow and stable cadence observed across ${Math.round(duration)} minutes of uninterrupted work.`;
    } else if (duration >= 60) {
      summary = `Extended focus session of ${Math.round(duration)} minutes with gradual cognitive depletion and sustained engagement.`;
    } else {
      summary = `Completed focus session of ${Math.round(duration)} minutes with moderate cognitive engagement.`;
    }

    return {
      cognitiveLoad: boundedLoad,
      focus: boundedFocus,
      fatigue: boundedFatigue,
      energy: boundedEnergy,
      confidence: boundedConfidence,
      reliabilityWeight: this.reliabilityWeight,
      sentimentSummary: summary,
    };
  }

  /**
   * Transforms a completed focus session into a canonical WellnessSignal.
   * STRICT GUARANTEE: NEVER includes or mutates 'mood'.
   */
  public extractSignal(userId: string, session: FocusSession): WellnessSignal {
    const metrics: CognitiveMetrics = {
      sessionDurationMinutes:
        session.summaryMetrics?.sessionDurationMinutes ??
        Math.max(1, Math.round(session.aggregatedTelemetry.totalIntervalSeconds / 60)),
      attentionalShiftRate:
        session.summaryMetrics?.attentionalShiftRate ??
        (session.aggregatedTelemetry.totalIntervalSeconds > 0
          ? Number(
              (
                (session.aggregatedTelemetry.totalAttentionalShifts /
                  session.aggregatedTelemetry.totalIntervalSeconds) *
                60
              ).toFixed(2)
            )
          : 0),
      typingCadenceEntropy:
        session.summaryMetrics?.typingCadenceEntropy ??
        (session.aggregatedTelemetry.cadenceEntropySamples.length > 0
          ? Number(
              (
                session.aggregatedTelemetry.cadenceEntropySamples.reduce((a, b) => a + b, 0) /
                session.aggregatedTelemetry.cadenceEntropySamples.length
              ).toFixed(2)
            )
          : 0.45),
      activeTypingRatio:
        session.summaryMetrics?.activeTypingRatio ??
        (session.aggregatedTelemetry.totalIntervalSeconds > 0
          ? Number(
              (
                session.aggregatedTelemetry.totalActiveTypingSeconds /
                session.aggregatedTelemetry.totalIntervalSeconds
              ).toFixed(2)
            )
          : 0.5),
      subjectiveDifficulty:
        session.summaryMetrics?.subjectiveDifficulty ??
        session.aggregatedTelemetry.latestSubjectiveDifficulty,
    };

    const estimate = this.calculateEstimate(metrics);

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    return {
      id: `sig-cog-${session.id}`,
      userId,
      modality: 'session_cognitive',
      timestamp: session.completedAt || nowIso,
      reliabilityWeight: estimate.reliabilityWeight,
      estimates: {
        // STRICT DIMENSIONAL BOUNDARY: cognitiveLoad, focus, fatigue, energy ONLY.
        cognitiveLoad: {
          value: estimate.cognitiveLoad,
          confidence: estimate.confidence,
        },
        focus: {
          value: estimate.focus,
          confidence: estimate.confidence,
        },
        fatigue: {
          value: estimate.fatigue,
          confidence: Number((estimate.confidence * 0.9).toFixed(2)),
        },
        energy: {
          value: estimate.energy,
          confidence: Number((estimate.confidence * 0.9).toFixed(2)),
        },
      },
      features: {
        sessionId: session.id,
        sessionType: session.sessionType,
        plannedDurationMinutes: session.plannedDurationMinutes,
        durationMinutes: metrics.sessionDurationMinutes,
        attentionalShiftRate: metrics.attentionalShiftRate,
        typingCadenceEntropy: metrics.typingCadenceEntropy,
        activeTypingRatio: metrics.activeTypingRatio,
        subjectiveDifficulty: metrics.subjectiveDifficulty,
        sentimentSummary: estimate.sentimentSummary,
      } as any,
      expiresAt,
    };
  }
}
