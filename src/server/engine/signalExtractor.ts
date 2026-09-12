/**
 * Signal Extractor Module
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 * 
 * Transforms raw multimodal domain inputs (mood check-ins, journal entries, companion sessions)
 * into standardized, structured WellnessSignal objects via modular SignalProviders.
 */

import { WellnessSignal } from './types';
import {
  MoodSignalProvider,
  JournalSignalProvider,
  CompanionSignalProvider,
  MoodLogInput,
  JournalInput,
  CompanionSessionInput,
  VoiceTranscriptInput,
} from './providers';
import {
  VoiceSignalProvider,
  VoiceObservationInput,
} from './voiceSignalProvider';

export type {
  MoodLogInput,
  JournalInput,
  CompanionSessionInput,
  VoiceTranscriptInput,
  VoiceObservationInput,
};

const moodProvider = new MoodSignalProvider();
const journalProvider = new JournalSignalProvider();
const companionProvider = new CompanionSignalProvider();
const voiceProvider = new VoiceSignalProvider();

export class SignalExtractor {
  /**
   * Extract a WellnessSignal from an explicit Mood Log check-in
   */
  public static fromMoodLog(input: MoodLogInput): WellnessSignal {
    const signals = moodProvider.extractSignals(input);
    return signals[0];
  }

  /**
   * Extract a WellnessSignal from a Journal Entry and its AI / Lexicon analysis
   */
  public static fromJournal(input: JournalInput): WellnessSignal {
    const signals = journalProvider.extractSignals(input);
    return signals[0];
  }

  /**
   * Extract a WellnessSignal from an AI Companion interaction session
   */
  public static fromCompanionSession(input: CompanionSessionInput): WellnessSignal {
    const signals = companionProvider.extractSignals(input);
    return signals[0];
  }

  /**
   * Extract a WellnessSignal from a structured Voice Observation and acoustic metrics
   */
  public static fromVoiceObservation(input: VoiceObservationInput): WellnessSignal {
    const signals = voiceProvider.extractSignals(input);
    return signals[0];
  }
}
