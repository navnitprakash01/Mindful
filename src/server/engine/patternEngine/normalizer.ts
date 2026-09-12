/**
 * Observation Normalizer
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Harmonizes multi-source historical wellness records into a unified, chronological observation sequence.
 */

import { NormalizedObservation } from './types';
import { StateDimensionKey, WellnessSignal, PersonalState } from '../types';
import { MoodLogRow } from '../../services/moodService';

export const ObservationNormalizer = {
  /**
   * Normalize an array of MoodLog rows
   */
  fromMoodLogs(logs: MoodLogRow[]): NormalizedObservation[] {
    return logs.map((log) => {
      const d = new Date(log.createdAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      // Convert 1-10 energy level to 10-100 scale for dimension estimate
      const energyScaled = Math.max(0, Math.min(100, log.energyLevel * 10));

      const dimensions: Partial<Record<StateDimensionKey, number>> = {
        energy: energyScaled,
      };

      return {
        id: log.id,
        timestamp: log.createdAt,
        dateKey,
        hourOfDay: d.getHours(),
        dayOfWeek: d.getDay(),
        moodType: log.moodType,
        energyLevel: log.energyLevel,
        dimensions,
        triggers: log.triggers || [],
        physicalSensations: log.physicalSensations || [],
        modality: 'mood_checkin',
        sourceId: log.id,
      };
    });
  },

  /**
   * Normalize an array of WellnessSignals
   */
  fromSignals(signals: WellnessSignal[]): NormalizedObservation[] {
    return signals.map((sig) => {
      const d = new Date(sig.timestamp);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      const dimensions: Partial<Record<StateDimensionKey, number>> = {};
      for (const [k, v] of Object.entries(sig.estimates)) {
        if (v && typeof v.value === 'number') {
          dimensions[k as StateDimensionKey] = v.value;
        }
      }

      const triggers: string[] = [];
      const physicalSensations: string[] = [];
      if (Array.isArray(sig.features?.triggers)) {
        triggers.push(...sig.features.triggers);
      }
      if (Array.isArray(sig.features?.somaticSensations)) {
        physicalSensations.push(...sig.features.somaticSensations);
      }

      const featuresObj = sig.features as Record<string, unknown> | undefined;
      const moodType = typeof featuresObj?.moodType === 'string' ? featuresObj.moodType : undefined;
      const energyLevel =
        typeof sig.estimates?.energy?.value === 'number'
          ? Math.max(1, Math.min(10, Math.round(sig.estimates.energy.value / 10)))
          : undefined;

      return {
        id: sig.id,
        timestamp: sig.timestamp,
        dateKey,
        hourOfDay: d.getHours(),
        dayOfWeek: d.getDay(),
        moodType,
        energyLevel,
        dimensions,
        triggers,
        physicalSensations,
        modality: sig.modality,
        sourceId: sig.sourceId,
      };
    });
  },

  /**
   * Normalize an array of PersonalState snapshots
   */
  fromStates(states: PersonalState[]): NormalizedObservation[] {
    return states.map((st) => {
      const d = new Date(st.timestamp || st.createdAt || new Date().toISOString());
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      const dimensions: Partial<Record<StateDimensionKey, number>> = {
        mood: st.dimensions?.mood?.value ?? st.mood,
        stress: st.dimensions?.stress?.value ?? st.stress,
        fatigue: st.dimensions?.fatigue?.value ?? st.fatigue,
        energy: st.dimensions?.energy?.value ?? st.energy,
        focus: st.dimensions?.focus?.value ?? st.focus,
        cognitiveLoad: st.dimensions?.cognitiveLoad?.value ?? st.cognitiveLoad,
      };

      const energyLevel =
        typeof dimensions.energy === 'number'
          ? Math.max(1, Math.min(10, Math.round(dimensions.energy / 10)))
          : undefined;

      return {
        id: st.id,
        timestamp: st.timestamp || st.createdAt || new Date().toISOString(),
        dateKey,
        hourOfDay: d.getHours(),
        dayOfWeek: d.getDay(),
        energyLevel,
        dimensions,
        triggers: st.contextualTriggers || [],
        physicalSensations: st.somaticMarkers || [],
        modality: 'state_snapshot',
      };
    });
  },

  /**
   * Merge and chronologically sort multiple observation streams into a coherent sequence.
   * Deduplicates by id or matching timestamp/sourceId.
   */
  mergeAndSort(
    ...streams: NormalizedObservation[][]
  ): NormalizedObservation[] {
    const map = new Map<string, NormalizedObservation>();

    for (const stream of streams) {
      for (const obs of stream) {
        // Use unique key: if sourceId exists prefer it, else id
        const key = obs.sourceId ? `source-${obs.sourceId}` : `obs-${obs.id}`;
        if (!map.has(key)) {
          map.set(key, obs);
        } else {
          // Merge missing properties from richer record
          const existing = map.get(key)!;
          if (!existing.moodType && obs.moodType) existing.moodType = obs.moodType;
          if (existing.energyLevel === undefined && obs.energyLevel !== undefined) {
            existing.energyLevel = obs.energyLevel;
          }
          if (obs.triggers.length > 0 && existing.triggers.length === 0) {
            existing.triggers = obs.triggers;
          }
          if (obs.physicalSensations.length > 0 && existing.physicalSensations.length === 0) {
            existing.physicalSensations = obs.physicalSensations;
          }
          existing.dimensions = { ...existing.dimensions, ...obs.dimensions };
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  },
};
