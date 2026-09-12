/**
 * Pattern Detection Engine
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Orchestrates pure statistical detectors over normalized observations.
 * Strictly deterministic, traceable, and free of external side-effects.
 */

import { NormalizedObservation, PersonalPattern, ThresholdConfig, DEFAULT_THRESHOLDS } from './types';
import { detectTemporalPatterns } from './detectors/temporalDetector';
import { detectTriggerAssociations } from './detectors/triggerDetector';
import { detectMoodFrequency } from './detectors/moodFrequencyDetector';
import { detectEnergyTrajectory } from './detectors/energyTrajectoryDetector';
import { detectCooccurrencePatterns } from './detectors/cooccurrenceDetector';

export class PatternEngine {
  private thresholds: ThresholdConfig;

  constructor(thresholds: ThresholdConfig = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Analyze an array of chronological normalized observations and discover validated patterns.
   * Returns empty array if observations are fewer than the minimum threshold.
   */
  public analyze(userId: string, observations: NormalizedObservation[]): PersonalPattern[] {
    // Enforce strict minimum observation threshold
    if (!observations || observations.length < this.thresholds.minObservationsForAnyPattern) {
      return [];
    }

    const allCandidates: PersonalPattern[] = [
      ...detectMoodFrequency(userId, observations, this.thresholds),
      ...detectEnergyTrajectory(userId, observations, this.thresholds),
      ...detectTriggerAssociations(userId, observations, this.thresholds),
      ...detectTemporalPatterns(userId, observations, this.thresholds),
      ...detectCooccurrencePatterns(userId, observations, this.thresholds),
    ];

    // Deduplicate by patternKey, keeping the candidate with highest confidence
    const patternMap = new Map<string, PersonalPattern>();
    for (const p of allCandidates) {
      const existing = patternMap.get(p.patternKey);
      if (!existing || p.confidence > existing.confidence) {
        patternMap.set(p.patternKey, p);
      }
    }

    // Sort by confidence DESC, then by observationCount DESC
    const sorted = Array.from(patternMap.values()).sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.observationCount - a.observationCount;
    });

    return sorted;
  }
}

export const defaultPatternEngine = new PatternEngine();
