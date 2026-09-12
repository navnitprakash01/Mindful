/**
 * Modular Signal Providers
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 * 
 * Extensible provider architecture translating raw multimodal streams into standardized WellnessSignals.
 * Follows the non-negotiable rule: direct self-reports > inferred AI signals.
 */

import { randomUUID } from 'node:crypto';
import {
  SignalProvider,
  WellnessSignal,
  SignalModality,
  DimensionEstimate,
  StateDimensionKey,
} from './types';

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Heuristic filter ensuring companion sessions only emit signals for substantive reflections,
 * ignoring trivial greetings and conversational acknowledgments.
 */
export function shouldEmitCompanionSignal(message: string, historyLength: number = 0): boolean {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const trivialPhrases = new Set([
    'hi', 'hello', 'hey', 'hey there', 'hello there',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'thanks', 'thank you', 'thank you so much', 'thx',
    'bye', 'goodbye', 'see you', 'see ya',
    'ok', 'okay', 'k', 'cool', 'sure', 'yes', 'no', 'yep', 'nope',
    'how are you', 'whats up', 'sup',
  ]);

  if (trivialPhrases.has(normalized)) {
    return false;
  }

  // Very short turns with no history do not indicate sustained emotional state
  if (message.trim().length < 15 && historyLength < 3) {
    return false;
  }

  return true;
}

export interface MoodLogInput {
  id?: string;
  userId: string;
  timestamp?: string;
  energyLevel: number; // 1 - 10
  moodType: string;    // 'Joy' | 'Anxiety' | 'Calm' | 'Focus' | 'Melancholy' | 'Gratitude' | 'Restless'
  notes?: string;
  triggers?: string[];
  physicalSensations?: string[];
}

export interface JournalInput {
  id?: string;
  userId: string;
  timestamp?: string;
  content: string;
  mood?: string;
  moodScore?: number;
  emotion?: string;
  tags?: string[];
  aiAnalysis?: {
    dominantEmotion?: string;
    dominantScore?: number;
    emotions?: Array<{ name: string; score: number }>;
    themes?: string[];
    summary?: string;
    suggestedAction?: string;
    reflectionPrompt?: string;
  };
}

export interface CompanionSessionInput {
  userId: string;
  mode: string;
  recentMessagesCount: number;
  detectedSentiment?: 'positive' | 'neutral' | 'stressed' | 'fatigued';
  topics?: string[];
}

export interface VoiceTranscriptInput {
  id?: string;
  userId: string;
  timestamp?: string;
  transcript: string;
  durationSeconds?: number;
  wordCount?: number;
  explicitMood?: string;
  explicitMoodScore?: number;
}

const MOOD_TAXONOMY: Record<
  string,
  {
    valence: number;
    arousal: number;
    mood: number;
    stress: number;
    focus: number;
    cognitiveLoad: number;
  }
> = {
  Joy: { valence: 0.85, arousal: 0.70, mood: 90, stress: 15, focus: 80, cognitiveLoad: 25 },
  Calm: { valence: 0.80, arousal: 0.25, mood: 85, stress: 10, focus: 85, cognitiveLoad: 20 },
  Focus: { valence: 0.65, arousal: 0.60, mood: 80, stress: 25, focus: 95, cognitiveLoad: 45 },
  Gratitude: { valence: 0.90, arousal: 0.35, mood: 92, stress: 10, focus: 85, cognitiveLoad: 20 },
  Melancholy: { valence: -0.50, arousal: 0.20, mood: 35, stress: 45, focus: 45, cognitiveLoad: 50 },
  Anxiety: { valence: -0.65, arousal: 0.85, mood: 30, stress: 82, focus: 35, cognitiveLoad: 75 },
  Restless: { valence: -0.35, arousal: 0.75, mood: 45, stress: 65, focus: 40, cognitiveLoad: 65 },
};

/**
 * Deterministic Sentiment & Keyword Lexicon for zero-budget fallback
 * Operates purely locally without requiring external LLM calls.
 */
function analyzeTextDeterministically(text: string): {
  sentimentValence: number;
  stressScore: number;
  fatigueScore: number;
  focusScore: number;
  cognitiveLoadScore: number;
  detectedThemes: string[];
} {
  const lower = text.toLowerCase();
  
  const positiveWords = ['peace', 'calm', 'grateful', 'happy', 'joy', 'clarity', 'energized', 'good', 'relaxed', 'accomplished'];
  const stressWords = ['deadline', 'overwhelm', 'anxious', 'stress', 'pressure', 'panic', 'urgent', 'tension', 'conflict', 'frustrated'];
  const fatigueWords = ['exhausted', 'tired', 'drained', 'burned out', 'fatigue', 'sleepy', 'heavy', 'depleted', 'low energy'];
  const focusWords = ['focused', 'flow', 'productive', 'deep work', 'clear', 'organized', 'concentrated'];
  const loadWords = ['multitasking', 'too many', 'swamped', 'hectic', 'scattered', 'chaos', 'busy'];

  const countMatches = (list: string[]) => list.reduce((c, w) => c + (lower.includes(w) ? 1 : 0), 0);

  const posCount = countMatches(positiveWords);
  const stressCount = countMatches(stressWords);
  const fatigueCount = countMatches(fatigueWords);
  const focusCount = countMatches(focusWords);
  const loadCount = countMatches(loadWords);

  let mood = 70 + (posCount * 8) - (stressCount * 10) - (fatigueCount * 6);
  mood = Math.max(15, Math.min(95, mood));

  let stress = 30 + (stressCount * 15) - (posCount * 5);
  stress = Math.max(10, Math.min(95, stress));

  let fatigue = 35 + (fatigueCount * 16) - (posCount * 4);
  fatigue = Math.max(10, Math.min(95, fatigue));

  let focus = 70 + (focusCount * 10) - (loadCount * 8) - (stressCount * 5);
  focus = Math.max(20, Math.min(95, focus));

  let cognitiveLoad = 35 + (loadCount * 15) + (stressCount * 8);
  cognitiveLoad = Math.max(15, Math.min(95, cognitiveLoad));

  const themes: string[] = [];
  if (stressCount > 0) themes.push('Stress & Pressure');
  if (fatigueCount > 0) themes.push('Rest & Recovery');
  if (posCount > 0) themes.push('Gratitude & Well-being');
  if (focusCount > 0) themes.push('Deep Work & Focus');

  return {
    sentimentValence: Number(((mood - 50) / 50).toFixed(2)),
    stressScore: stress,
    fatigueScore: fatigue,
    focusScore: focus,
    cognitiveLoadScore: cognitiveLoad,
    detectedThemes: themes,
  };
}

/**
 * 1. Mood Check-in Signal Provider (Direct Self-Report Ground Truth)
 */
export class MoodSignalProvider implements SignalProvider<MoodLogInput> {
  public readonly modality: SignalModality = 'mood_checkin';

  public extractSignals(input: MoodLogInput): WellnessSignal[] {
    const timestamp = input.timestamp || new Date().toISOString();
    const config = MOOD_TAXONOMY[input.moodType] || {
      valence: 0.20,
      arousal: 0.50,
      mood: 70,
      stress: 35,
      focus: 70,
      cognitiveLoad: 35,
    };

    // Calculate energy and fatigue:
    // Energy level is 1-10 -> energy is 10-100
    const normalizedEnergy = Math.max(1, Math.min(10, input.energyLevel));
    const energyScore = normalizedEnergy * 10;
    const fatigueScore = Math.round((11 - normalizedEnergy) * 10);

    // Stress adjustments based on somatic sensations and contextual triggers
    let stressValue = config.stress;
    let cognitiveLoadValue = config.cognitiveLoad;
    const triggers = input.triggers || [];
    const sensations = input.physicalSensations || [];

    const highStressTriggers = ['Deadlines', 'Conflict', 'Public Speaking', 'Overwork', 'Financial'];
    if (triggers.some((t) => highStressTriggers.includes(t))) {
      stressValue = Math.min(100, stressValue + 12);
      cognitiveLoadValue = Math.min(100, cognitiveLoadValue + 10);
    }

    const highStressSensations = ['Tightness in neck', 'Shallow breathing', 'Tightness in chest', 'Headache'];
    if (sensations.some((s) => highStressSensations.includes(s))) {
      stressValue = Math.min(100, stressValue + 10);
    }

    const calmingSensations = ['Relaxed shoulders', 'Deep breathing'];
    if (sensations.some((s) => calmingSensations.includes(s))) {
      stressValue = Math.max(0, stressValue - 10);
      cognitiveLoadValue = Math.max(10, cognitiveLoadValue - 10);
    }

    const expiresAt = new Date(new Date(timestamp).getTime() + 36 * 60 * 60 * 1000).toISOString();

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId: input.userId,
      timestamp,
      modality: this.modality,
      sourceId: isValidUuid(input.id) ? input.id : undefined,
      estimates: {
        mood: { value: config.mood, confidence: 0.95 },
        stress: { value: stressValue, confidence: 0.90 },
        fatigue: { value: fatigueScore, confidence: 0.92 },
        energy: { value: energyScore, confidence: 0.95 },
        focus: { value: config.focus, confidence: 0.82 },
        cognitiveLoad: { value: cognitiveLoadValue, confidence: 0.85 },
      },
      features: {
        valence: config.valence,
        arousal: config.arousal,
        energy: input.energyLevel,
        somaticSensations: sensations,
        triggers,
        sentimentSummary: input.notes ? input.notes.slice(0, 120) : undefined,
        ...(input.notes ? { notes: input.notes } : {}),
      },
      reliabilityWeight: 1.0, // Primary self-report anchor
      expiresAt,
    };

    return [signal];
  }
}

/**
 * 2. Text Journal & Voice Transcript Signal Provider
 */
export class JournalSignalProvider implements SignalProvider<JournalInput> {
  public readonly modality: SignalModality = 'text_journal';

  public extractSignals(input: JournalInput): WellnessSignal[] {
    const timestamp = input.timestamp || new Date().toISOString();
    const isVoice = input.tags?.includes('Voice');
    const actualModality: SignalModality = isVoice ? 'voice_transcript' : 'text_journal';
    const ai = input.aiAnalysis;

    // Start with deterministic lexicon analysis as solid baseline
    const deterministic = analyzeTextDeterministically(input.content);

    let moodScore = input.moodScore ?? deterministic.sentimentValence * 50 + 50;
    let stressScore = deterministic.stressScore;
    let fatigueScore = deterministic.fatigueScore;
    let energyScore = Math.max(10, 100 - fatigueScore);
    let focusScore = deterministic.focusScore;
    let cognitiveLoadScore = deterministic.cognitiveLoadScore;

    // AI Enrichment if present
    if (ai?.emotions && Array.isArray(ai.emotions)) {
      const stressMatch = ai.emotions.find((e) => e.name.toLowerCase() === 'stress');
      const anxietyMatch = ai.emotions.find((e) => e.name.toLowerCase() === 'anxiety');
      const calmMatch = ai.emotions.find((e) => e.name.toLowerCase() === 'calm' || e.name.toLowerCase() === 'peaceful');
      const hopeMatch = ai.emotions.find((e) => e.name.toLowerCase() === 'hope' || e.name.toLowerCase() === 'confidence');

      if (stressMatch || anxietyMatch) {
        stressScore = Math.max(stressMatch?.score || 0, anxietyMatch?.score || 0);
      }

      if (calmMatch) {
        stressScore = Math.min(stressScore, Math.max(10, 100 - calmMatch.score));
      }

      if (typeof ai.dominantScore === 'number') {
        const normalizedScore = ai.dominantScore <= 1.0 ? Math.round(ai.dominantScore * 100) : ai.dominantScore;
        const dom = (ai.dominantEmotion || '').toLowerCase();

        let derivedMood = normalizedScore;
        if (['anxious', 'overwhelmed', 'sad', 'stressed', 'melancholy'].some((e) => dom.includes(e))) {
          derivedMood = Math.max(15, 100 - normalizedScore);
        } else if (['joyful', 'grateful', 'peaceful', 'hopeful', 'calm'].some((e) => dom.includes(e))) {
          derivedMood = Math.min(100, Math.max(70, normalizedScore));
        }

        // If user did not provide explicit moodScore slider, use derived score
        if (input.moodScore === undefined) {
          moodScore = derivedMood;
        }
      }
    }

    // Word count & cognitive engagement heuristics
    const words = input.content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount > 150) {
      focusScore = Math.min(95, focusScore + 10);
      cognitiveLoadScore = Math.min(90, cognitiveLoadScore + 8);
    } else if (wordCount < 20) {
      focusScore = Math.max(40, focusScore - 10);
    }

    // Confidence scales with word count and whether AI parsed it
    const baseConfidence = ai
      ? Math.min(0.88, 0.65 + Math.min(0.23, wordCount / 350))
      : Math.min(0.65, 0.45 + Math.min(0.20, wordCount / 350));

    const reliabilityWeight = isVoice ? 0.80 : 0.85;
    const expiresAt = new Date(new Date(timestamp).getTime() + 48 * 60 * 60 * 1000).toISOString();

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId: input.userId,
      timestamp,
      modality: actualModality,
      sourceId: isValidUuid(input.id) ? input.id : undefined,
      estimates: {
        mood: { value: Math.round(moodScore), confidence: baseConfidence },
        stress: { value: Math.round(stressScore), confidence: Number((baseConfidence * 0.90).toFixed(2)) },
        fatigue: { value: Math.round(fatigueScore), confidence: Number((baseConfidence * 0.75).toFixed(2)) },
        energy: { value: Math.round(energyScore), confidence: Number((baseConfidence * 0.75).toFixed(2)) },
        focus: { value: Math.round(focusScore), confidence: Number((baseConfidence * 0.85).toFixed(2)) },
        cognitiveLoad: { value: Math.round(cognitiveLoadScore), confidence: Number((baseConfidence * 0.80).toFixed(2)) },
      },
      features: {
        themes: ai?.themes || deterministic.detectedThemes,
        sentimentSummary: ai?.summary || input.content.slice(0, 120),
        rawTokensCount: wordCount,
        content: input.content,
      },
      reliabilityWeight,
      expiresAt,
    };

    return [signal];
  }
}

/**
 * 3. AI Companion Session Signal Provider
 */
export class CompanionSignalProvider implements SignalProvider<CompanionSessionInput> {
  public readonly modality: SignalModality = 'companion_session';

  public extractSignals(input: CompanionSessionInput): WellnessSignal[] {
    const timestamp = new Date().toISOString();
    let moodScore = 75;
    let stressScore = 30;
    let focusScore = 70;
    let cognitiveLoadScore = 35;

    switch (input.mode) {
      case 'CBT Reframer':
        stressScore = 65;
        cognitiveLoadScore = 65;
        focusScore = 75;
        break;
      case 'Empathetic Listener':
        moodScore = 65;
        stressScore = 45;
        break;
      case 'Stoic Philosopher':
        focusScore = 85;
        stressScore = 35;
        cognitiveLoadScore = 40;
        break;
      case 'Mindful Coach':
        focusScore = 80;
        moodScore = 80;
        break;
    }

    if (input.detectedSentiment === 'stressed') {
      stressScore = Math.min(90, stressScore + 20);
      moodScore = Math.max(30, moodScore - 20);
      cognitiveLoadScore = Math.min(90, cognitiveLoadScore + 15);
    } else if (input.detectedSentiment === 'positive') {
      moodScore = Math.min(95, moodScore + 15);
      stressScore = Math.max(15, stressScore - 15);
    } else if (input.detectedSentiment === 'fatigued') {
      moodScore = Math.max(35, moodScore - 10);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId: input.userId,
      timestamp,
      modality: this.modality,
      estimates: {
        mood: { value: moodScore, confidence: 0.65 },
        stress: { value: stressScore, confidence: 0.70 },
        fatigue: { value: 40, confidence: 0.50 },
        energy: { value: 60, confidence: 0.50 },
        focus: { value: focusScore, confidence: 0.65 },
        cognitiveLoad: { value: cognitiveLoadScore, confidence: 0.65 },
      },
      features: {
        themes: input.topics || [],
        sentimentSummary: `Companion session in ${input.mode} mode`,
      },
      reliabilityWeight: 0.70,
      expiresAt,
    };

    return [signal];
  }
}
