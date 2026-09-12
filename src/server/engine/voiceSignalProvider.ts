/**
 * Voice Signal Provider & Acoustic Baseline Engine
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 *
 * Translates structured client voice observations and optional transcripts
 * into standardized WellnessSignal records for ingestion by the Personal State Engine.
 *
 * STRICT NON-DIAGNOSTIC & NON-CAUSAL RULES:
 * - Employs observational, probabilistic language:
 *   "Speaking rate is lower than your recent baseline"
 *   "Voice signals contribute moderate evidence toward elevated tension"
 * - STRICTLY PROHIBITS clinical psychiatric or diagnostic claims:
 *   "You sound depressed", "You have anxiety", "Voice proves you are stressed".
 */

import { randomUUID } from 'node:crypto';
import {
  SignalProvider,
  WellnessSignal,
  SignalModality,
  DimensionEstimate,
  StateDimensionKey,
} from './types';
import { isValidUuid } from './providers';

export interface VoiceAcousticMetrics {
  audioDurationSeconds: number;
  speechDurationSeconds?: number;
  pauseCount: number;
  pauseDurationSeconds?: number;
  pauseRatio: number; // 0.0 - 1.0
  speechRateWpm?: number;
  vocalEnergy?: number; // 0.0 - 1.0 (mean RMS)
  vocalEnergyVariance?: number;
  pitchVariance?: number;
  quality?: number; // 0.0 - 1.0
  confidence?: number; // 0.0 - 1.0
}

export interface AcousticBaseline {
  userId: string;
  avgSpeechRateWpm: number;
  avgPauseRatio: number;
  avgVocalEnergy: number;
  observationCount: number;
  isPreliminary: boolean;
  lastUpdated: string;
}

export interface VoiceObservationInput {
  id?: string;
  userId: string;
  timestamp?: string;
  metrics: VoiceAcousticMetrics;
  transcript?: string;
  sourceId?: string;
  acousticBaseline?: AcousticBaseline | null;
}

/**
 * Computes the user's historical acoustic baseline from past voice signals.
 * Requires at least 3 valid historical observations to be considered non-preliminary.
 *
 * CONSERVATIVE FILTERING RULES:
 * 1. Exclude if feat.quality < 0.40 or if quality is missing / non-finite (prevents low quality contamination).
 * 2. Exclude if silence-only: pauseRatio >= 0.95 AND no meaningful words / transcript content.
 * 3. Exclude if any contributing feature contains NaN or Infinity.
 * 4. Exclude empty feature objects.
 *
 * FILTER FIRST, THEN COUNT:
 * Only signals meeting all validity criteria count toward the minimum 3 observations
 * required for a mature acoustic baseline.
 */
export function computeAcousticBaseline(
  userId: string,
  historySignals: WellnessSignal[]
): AcousticBaseline | null {
  const voiceSignals = historySignals.filter(
    (s) => s.userId === userId && s.modality === 'voice_transcript' && s.features
  );

  if (voiceSignals.length === 0) {
    return null;
  }

  const validSignals: WellnessSignal[] = [];

  for (const s of voiceSignals) {
    const feat = s.features as Record<string, any>;
    if (!feat || typeof feat !== 'object' || Object.keys(feat).length === 0) {
      continue;
    }

    // 1. Conservative quality filtering:
    // feat.quality < 0.40 is excluded.
    // Missing quality (undefined/null/NaN) must not accidentally receive high quality -> excluded.
    if (typeof feat.quality !== 'number' || !Number.isFinite(feat.quality) || feat.quality < 0.40) {
      continue;
    }

    // 2. Silence-only filtering:
    // pauseRatio >= 0.95 AND no meaningful words / transcript content
    const pauseRatio = feat.pauseRatio;
    if (typeof pauseRatio === 'number' && Number.isFinite(pauseRatio) && pauseRatio >= 0.95) {
      const rawTokens = typeof feat.rawTokensCount === 'number' && Number.isFinite(feat.rawTokensCount) ? feat.rawTokensCount : 0;
      const hasWpm = typeof feat.speechRateWpm === 'number' && Number.isFinite(feat.speechRateWpm) && feat.speechRateWpm > 0;
      if (rawTokens === 0 && !hasWpm) {
        continue; // Silence-only observation excluded
      }
    }

    // 3. Finiteness & boundary checks on contributing features:
    if (feat.speechRateWpm !== undefined && (typeof feat.speechRateWpm !== 'number' || !Number.isFinite(feat.speechRateWpm) || feat.speechRateWpm < 10 || feat.speechRateWpm > 600)) {
      continue;
    }
    if (feat.pauseRatio !== undefined && (typeof feat.pauseRatio !== 'number' || !Number.isFinite(feat.pauseRatio) || feat.pauseRatio < 0.0 || feat.pauseRatio > 1.0)) {
      continue;
    }
    if (feat.vocalEnergy !== undefined && (typeof feat.vocalEnergy !== 'number' || !Number.isFinite(feat.vocalEnergy) || feat.vocalEnergy < 0.0 || feat.vocalEnergy > 1.0)) {
      continue;
    }

    validSignals.push(s);
  }

  const observationCount = validSignals.length;
  if (observationCount === 0) {
    return null;
  }

  let totalWpm = 0;
  let wpmCount = 0;
  let totalPauseRatio = 0;
  let pauseCount = 0;
  let totalEnergy = 0;
  let energyCount = 0;

  for (const s of validSignals) {
    const feat = s.features as Record<string, any>;
    if (typeof feat.speechRateWpm === 'number' && Number.isFinite(feat.speechRateWpm) && feat.speechRateWpm > 0) {
      totalWpm += feat.speechRateWpm;
      wpmCount++;
    }
    if (typeof feat.pauseRatio === 'number' && Number.isFinite(feat.pauseRatio)) {
      totalPauseRatio += feat.pauseRatio;
      pauseCount++;
    }
    if (typeof feat.vocalEnergy === 'number' && Number.isFinite(feat.vocalEnergy)) {
      totalEnergy += feat.vocalEnergy;
      energyCount++;
    }
  }

  const isPreliminary = observationCount < 3;

  return {
    userId,
    avgSpeechRateWpm: wpmCount > 0 ? Math.round(totalWpm / wpmCount) : 130, // Default 130 WPM neutral speech
    avgPauseRatio: pauseCount > 0 ? Number((totalPauseRatio / pauseCount).toFixed(2)) : 0.25,
    avgVocalEnergy: energyCount > 0 ? Number((totalEnergy / energyCount).toFixed(2)) : 0.50,
    observationCount,
    isPreliminary,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Voice Signal Provider implementing the standardized SignalProvider contract.
 */
export class VoiceSignalProvider implements SignalProvider<VoiceObservationInput> {
  public readonly modality: SignalModality = 'voice_transcript';

  public extractSignals(input: VoiceObservationInput): WellnessSignal[] {
    const timestamp = input.timestamp || new Date().toISOString();
    const { metrics, transcript, acousticBaseline } = input;

    // Base scores start at calibrated neutral equilibrium
    let moodScore = 70;
    let stressScore = 30;
    let fatigueScore = 35;
    let energyScore = 65;
    let focusScore = 70;
    let cognitiveLoadScore = 35;

    const reasons: string[] = [];

    // 1. Acoustic Baseline Comparison
    // Check speech rate deviation if user baseline exists and >= 3 observations
    let wpmDelta: number | undefined;
    let pauseDelta: number | undefined;

    if (acousticBaseline && !acousticBaseline.isPreliminary && metrics.speechRateWpm) {
      wpmDelta = metrics.speechRateWpm - acousticBaseline.avgSpeechRateWpm;
      pauseDelta = Number((metrics.pauseRatio - acousticBaseline.avgPauseRatio).toFixed(2));

      // Case A: Marked reduction in speech tempo + increased pause ratio -> somatic fatigue
      if (wpmDelta <= -20 || (wpmDelta <= -10 && pauseDelta >= 0.15)) {
        fatigueScore = Math.min(85, fatigueScore + 20);
        energyScore = Math.max(25, energyScore - 20);
        cognitiveLoadScore = Math.min(80, cognitiveLoadScore + 10);
        reasons.push('Speaking rate is lower than your recent baseline');
      }
      // Case B: Marked increase in speech tempo + reduced pauses + high energy -> arousal / stress load
      else if (wpmDelta >= 25 && (metrics.vocalEnergy ?? 0.5) >= 0.60) {
        stressScore = Math.min(85, stressScore + 20);
        cognitiveLoadScore = Math.min(85, cognitiveLoadScore + 15);
        reasons.push('Speech tempo and vocal energy are elevated above your baseline');
      }
      // Case C: Within normal baseline bounds
      else {
        reasons.push('Vocal cadence aligns closely with your personal baseline');
      }
    } else {
      // Preliminary or no baseline: evaluate conservatively against mild physiological bounds
      if (metrics.speechRateWpm && metrics.speechRateWpm < 95 && metrics.pauseRatio > 0.40) {
        fatigueScore = Math.min(75, fatigueScore + 15);
        energyScore = Math.max(35, energyScore - 15);
        reasons.push('Extended pauses and measured pace observed');
      } else if (metrics.speechRateWpm && metrics.speechRateWpm > 175 && (metrics.vocalEnergy ?? 0.5) > 0.65) {
        stressScore = Math.min(75, stressScore + 15);
        reasons.push('Elevated vocal intensity and rapid cadence observed');
      } else {
        reasons.push('Vocal rhythm calibrating with initial baseline');
      }
    }

    // 2. Transcript Sentiment Adjustment (if words transcribed)
    if (transcript && transcript.trim().length > 0) {
      const lower = transcript.toLowerCase();
      // Look for explicit emotional descriptors in speech
      if (/stress|overwhelm|anxious|deadline|pressure|panic|tight/i.test(lower)) {
        stressScore = Math.min(90, stressScore + 15);
        cognitiveLoadScore = Math.min(90, cognitiveLoadScore + 10);
        moodScore = Math.max(35, moodScore - 15);
      }
      if (/tired|exhausted|burnout|sleepy|drained|depleted/i.test(lower)) {
        fatigueScore = Math.min(90, fatigueScore + 15);
        energyScore = Math.max(20, energyScore - 15);
      }
      if (/calm|peace|relaxed|good|happy|grateful|centered|grounded/i.test(lower)) {
        moodScore = Math.min(92, moodScore + 15);
        stressScore = Math.max(15, stressScore - 15);
        energyScore = Math.min(85, energyScore + 10);
      }
    }

    // 3. Compute Engineering Confidence
    // Factors: audio duration, quality indicator, baseline presence, and transcript presence
    const rawQuality = metrics.quality ?? 0.75;
    const baseConfidence = metrics.confidence ?? 0.70;
    const baselineBonus = acousticBaseline && !acousticBaseline.isPreliminary ? 0.10 : 0.0;
    const transcriptBonus = transcript && transcript.length > 20 ? 0.05 : 0.0;

    const finalConfidence = Number(
      Math.max(0.20, Math.min(0.85, baseConfidence * 0.85 + baselineBonus + transcriptBonus)).toFixed(2)
    );

    // 4. Construct Structured Observation Summary
    const observationSummary = reasons[0] || 'Voice signals contribute moderate evidence toward current state balance.';

    const estimates: Partial<Record<StateDimensionKey, DimensionEstimate>> = {
      mood: { value: Math.round(moodScore), confidence: Number((finalConfidence * 0.85).toFixed(2)) },
      stress: { value: Math.round(stressScore), confidence: finalConfidence },
      fatigue: { value: Math.round(fatigueScore), confidence: finalConfidence },
      energy: { value: Math.round(energyScore), confidence: finalConfidence },
      focus: { value: Math.round(focusScore), confidence: Number((finalConfidence * 0.80).toFixed(2)) },
      cognitiveLoad: { value: Math.round(cognitiveLoadScore), confidence: Number((finalConfidence * 0.85).toFixed(2)) },
    };

    const expiresAt = new Date(new Date(timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId: input.userId,
      timestamp,
      modality: this.modality,
      sourceId: isValidUuid(input.sourceId) ? input.sourceId : undefined,
      estimates,
      features: {
        speechRateWpm: metrics.speechRateWpm,
        pauseCount: metrics.pauseCount,
        pauseRatio: metrics.pauseRatio,
        durationSeconds: metrics.audioDurationSeconds,
        speechDurationSeconds: metrics.speechDurationSeconds,
        vocalEnergy: metrics.vocalEnergy,
        quality: metrics.quality,
        sentimentSummary: observationSummary,
        rawTokensCount: transcript ? transcript.trim().split(/\s+/).length : 0,
      } as any,
      reliabilityWeight: 0.80, // Calibrated sensor inference weight
      expiresAt,
    };

    return [signal];
  }
}
