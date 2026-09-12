/**
 * Controlled Internal Intervention Library
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Deterministic, non-clinical, zero-cost protocols designed for emotional
 * down-regulation, cognitive clarity, and somatic restoration.
 *
 * All protocol steps are deterministic and safe.
 * Zero external AI API dependency.
 */

import { InterventionDefinition } from './types';

export const INTERVENTION_LIBRARY: Record<string, InterventionDefinition> = {
  'breathing-reset': {
    id: 'breathing-reset',
    title: 'Box Breathing Reset',
    shortDescription: 'Regulate sympathetic nervous arousal with equal-ratio breathing.',
    longDescription:
      'A structured 4-4-4-4 diaphragmatic breathing pattern that activates the parasympathetic vagal brake to lower heart rate and reduce acute stress.',
    category: 'breathing',
    targetDimensions: ['stress', 'mood'],
    suitableRanges: [
      { dimension: 'stress', min: 60, direction: 'downregulate' },
      { dimension: 'mood', max: 55, direction: 'elevate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 3,
    steps: [
      {
        stepNumber: 1,
        title: 'Find comfortable posture',
        instruction: 'Sit upright with shoulders relaxed and feet flat on the floor. Rest your hands gently on your lap.',
        durationSeconds: 20,
      },
      {
        stepNumber: 2,
        title: 'Inhale through nose',
        instruction: 'Inhale slowly and smoothly through your nose for 4 seconds, letting your lower belly expand.',
        durationSeconds: 40,
      },
      {
        stepNumber: 3,
        title: 'Gentle pause',
        instruction: 'Hold the breath gently for 4 seconds without clenching your throat or jaw.',
        durationSeconds: 40,
      },
      {
        stepNumber: 4,
        title: 'Smooth exhale',
        instruction: 'Release the breath smoothly through your mouth for 4 seconds, softening your neck and chest.',
        durationSeconds: 40,
      },
      {
        stepNumber: 5,
        title: 'Empty pause & settle',
        instruction: 'Hold empty for 4 seconds. Repeat the cycle at your natural, calm tempo.',
        durationSeconds: 40,
      },
    ],
    contraindications: ['Do not hold breath if you feel dizziness, lightheadedness, or respiratory discomfort.'],
    safetyNotes: 'Breathe smoothly without straining. Resume normal breathing at any time.',
    difficulty: 'gentle',
    cooldownHours: 1.5,
    version: '1.0.0',
  },

  'grounding-anchor': {
    id: 'grounding-anchor',
    title: '5-4-3-2-1 Sensory Grounding',
    shortDescription: 'Re-anchor scattered attention into immediate sensory reality.',
    longDescription:
      'Engages multiple sensory modalities to pull cognitive processing away from rumination or somatic panic and back to tangible present stimuli.',
    category: 'grounding',
    targetDimensions: ['stress', 'cognitiveLoad'],
    suitableRanges: [
      { dimension: 'stress', min: 65, direction: 'downregulate' },
      { dimension: 'cognitiveLoad', min: 60, direction: 'downregulate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 5,
    steps: [
      {
        stepNumber: 1,
        title: 'Acknowledge 5 things you can see',
        instruction: 'Look around and silently name 5 distinct physical details in your room (a shadow, texture, color).',
        durationSeconds: 60,
      },
      {
        stepNumber: 2,
        title: 'Acknowledge 4 things you can feel',
        instruction: 'Notice 4 physical touch points (soles on floor, cloth on skin, cool air on hands).',
        durationSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Acknowledge 3 things you can hear',
        instruction: 'Listen carefully for 3 sounds in the background (traffic hum, ventilation, breath).',
        durationSeconds: 60,
      },
      {
        stepNumber: 4,
        title: 'Acknowledge 2 things you can smell',
        instruction: 'Notice 2 ambient scents around you or inhale the aroma of tea or fresh air.',
        durationSeconds: 45,
      },
      {
        stepNumber: 5,
        title: 'Acknowledge 1 thing you can taste or appreciate',
        instruction: 'Notice the lingering taste in your mouth or identify one tangible comfort right now.',
        durationSeconds: 45,
      },
    ],
    contraindications: ['If visual surroundings are triggering, keep eyes softly closed and focus on touch and sound.'],
    safetyNotes: 'Gentle sensory anchoring for acute tension or anxiety.',
    difficulty: 'gentle',
    cooldownHours: 2.0,
    version: '1.0.0',
  },

  'focus-reset': {
    id: 'focus-reset',
    title: 'Single-Task Focus Sprint',
    shortDescription: 'Clear distractions and establish a bounded 7-minute flow channel.',
    longDescription:
      'Creates a clean cognitive barrier against multitasking by declaring one atomic task and removing external digital stimuli.',
    category: 'focus',
    targetDimensions: ['focus', 'cognitiveLoad'],
    suitableRanges: [
      { dimension: 'focus', max: 45, direction: 'elevate' },
      { dimension: 'energy', min: 35, direction: 'reinforce' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 7,
    steps: [
      {
        stepNumber: 1,
        title: 'Clear physical workspace',
        instruction: 'Place your phone screen-down out of arm’s reach. Close all unrelated browser tabs.',
        durationSeconds: 60,
      },
      {
        stepNumber: 2,
        title: 'Declare one atomic task',
        instruction: 'Write down the single task you will work on. Keep it small enough to start immediately.',
        durationSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Three centering breaths',
        instruction: 'Take 3 deep, steady breaths to release tension from your forehead and hands.',
        durationSeconds: 30,
      },
      {
        stepNumber: 4,
        title: 'Deep sprint immersion',
        instruction: 'Begin working exclusively on your declared task. Do not switch tabs until the sprint ends.',
        durationSeconds: 270,
      },
    ],
    safetyNotes: 'Intended to reduce cognitive friction and restart momentum.',
    difficulty: 'moderate',
    cooldownHours: 1.5,
    version: '1.0.0',
  },

  'cognitive-unload': {
    id: 'cognitive-unload',
    title: 'Working Memory Dump',
    shortDescription: 'Transfer swirling thoughts and unfinished loops onto external paper.',
    longDescription:
      'Reduces cognitive load by externalizing working memory contents, interrupting anxious rumination and decision paralysis.',
    category: 'cognitive',
    targetDimensions: ['cognitiveLoad', 'stress'],
    suitableRanges: [
      { dimension: 'cognitiveLoad', min: 60, direction: 'downregulate' },
      { dimension: 'stress', min: 55, direction: 'downregulate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 5,
    steps: [
      {
        stepNumber: 1,
        title: 'Prepare blank surface',
        instruction: 'Open a blank note or grab a piece of paper. Set aside structure, grammar, and organization.',
        durationSeconds: 30,
      },
      {
        stepNumber: 2,
        title: 'Unfiltered brain dump',
        instruction: 'Rapidly write every task, worry, deadline, or half-finished thought occupying your mind.',
        durationSeconds: 150,
      },
      {
        stepNumber: 3,
        title: 'Triage: Now vs. Later vs. Let Go',
        instruction: 'Circle only 1 item you can address today. Mark the rest for tomorrow or let them be.',
        durationSeconds: 90,
      },
      {
        stepNumber: 4,
        title: 'Release closure breath',
        instruction: 'Close the note or turn the paper over. Exhale fully: your mind no longer needs to carry this right now.',
        durationSeconds: 30,
      },
    ],
    safetyNotes: 'Externalizing thoughts prevents cognitive overload.',
    difficulty: 'gentle',
    cooldownHours: 2.0,
    version: '1.0.0',
  },

  'somatic-recovery': {
    id: 'somatic-recovery',
    title: 'Postural & Sensory Reset',
    shortDescription: 'Release somatic desk tension and rest strained visual pathways.',
    longDescription:
      'Addresses screen fatigue and postural compression with gentle somatic neck releases, eye horizon gaze, and physiological sighs.',
    category: 'recovery',
    targetDimensions: ['fatigue', 'energy'],
    suitableRanges: [
      { dimension: 'fatigue', min: 60, direction: 'downregulate' },
      { dimension: 'energy', max: 50, direction: 'elevate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 4,
    steps: [
      {
        stepNumber: 1,
        title: 'Step away from screens',
        instruction: 'Look away from all displays. Fix your gaze onto the farthest horizon or outdoor window for 20 seconds.',
        durationSeconds: 40,
      },
      {
        stepNumber: 2,
        title: 'Gentle neck & shoulder roll',
        instruction: 'Roll your shoulders backward 5 times in slow, wide circles. Allow your jaw to hang relaxed.',
        durationSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Physiological sigh',
        instruction: 'Take two quick inhales through the nose, followed by one long, vocalized exhale through the mouth.',
        durationSeconds: 60,
      },
      {
        stepNumber: 4,
        title: 'Somatic stillness',
        instruction: 'Rest with eyes closed, sensing blood flow and warmth returning to your fingertips.',
        durationSeconds: 80,
      },
    ],
    contraindications: ['Move within a comfortable pain-free range. Do not force neck rotation.'],
    safetyNotes: 'Gentle physical reset for desk fatigue.',
    difficulty: 'gentle',
    cooldownHours: 1.5,
    version: '1.0.0',
  },

  'gentle-reflection': {
    id: 'gentle-reflection',
    title: 'Perspective Inquiry',
    shortDescription: 'Gentle self-compassion inquiry to re-balance low emotional valence.',
    longDescription:
      'Guides conscious cognitive reframing away from self-criticism toward grounded perspective and self-compassion.',
    category: 'reflection',
    targetDimensions: ['mood', 'cognitiveLoad'],
    suitableRanges: [
      { dimension: 'mood', max: 45, direction: 'elevate' },
      { dimension: 'stress', min: 40, direction: 'downregulate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 5,
    steps: [
      {
        stepNumber: 1,
        title: 'Acknowledge present feelings',
        instruction: 'Name what you are feeling without judgment: "Right now, I am feeling heavy / tired / low."',
        durationSeconds: 60,
      },
      {
        stepNumber: 2,
        title: 'Universal humanity check',
        instruction: 'Remind yourself: It is completely human and natural to experience low valence. You do not need to fix everything right this second.',
        durationSeconds: 60,
      },
      {
        stepNumber: 3,
        title: 'Identify one anchor of gratitude',
        instruction: 'Recall one small kindness, warm cup, or moment of peace from your past 48 hours.',
        durationSeconds: 90,
      },
      {
        stepNumber: 4,
        title: 'Gentle forward intention',
        instruction: 'Choose one small, kind action you can give yourself in the next hour (water, rest, stepping outside).',
        durationSeconds: 90,
      },
    ],
    safetyNotes: 'Self-compassion reflection. Not psychiatric therapy.',
    difficulty: 'gentle',
    cooldownHours: 2.0,
    version: '1.0.0',
  },

  'sleep-winddown': {
    id: 'sleep-winddown',
    title: 'Evening Parasympathetic Shift',
    shortDescription: 'Down-regulate evening nervous excitation to prepare for restorative sleep.',
    longDescription:
      'Promotes melatonin onset through dim ambient cues, prolonged exhalations, and mental compartmentalization of unresolved duties.',
    category: 'wind_down',
    targetDimensions: ['stress', 'fatigue'],
    suitableRanges: [
      { dimension: 'stress', min: 50, direction: 'downregulate' },
      { dimension: 'fatigue', min: 55, direction: 'downregulate' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 8,
    steps: [
      {
        stepNumber: 1,
        title: 'Dim lighting & silence notifications',
        instruction: 'Turn down bright overhead lights and place electronic devices on night mode or away from bed.',
        durationSeconds: 60,
      },
      {
        stepNumber: 2,
        title: 'Close the day mentally',
        instruction: 'Acknowledge: The workday is complete. What remains undone will wait safely until tomorrow.',
        durationSeconds: 90,
      },
      {
        stepNumber: 3,
        title: 'Progressive body scan',
        instruction: 'Slowly direct attention from your forehead down through your shoulders, stomach, and feet, consciously unclenching.',
        durationSeconds: 180,
      },
      {
        stepNumber: 4,
        title: 'Elongated evening breathing',
        instruction: 'Breathe in for 4 seconds, breathe out slowly for 7 seconds. Let the weight of your body sink into the mattress.',
        durationSeconds: 150,
      },
    ],
    safetyNotes: 'Promotes voluntary relaxation for evening transition.',
    difficulty: 'gentle',
    cooldownHours: 4.0,
    version: '1.0.0',
  },

  'behavioral-activation': {
    id: 'behavioral-activation',
    title: 'Vitality Micro-Movement',
    shortDescription: 'Break lethargic inertia through 3 minutes of voluntary dynamic circulation.',
    longDescription:
      'Uses mild kinesthetic stimulation to trigger dopamine release and increase cerebral oxygenation when feeling lethargic or stuck.',
    category: 'activation',
    targetDimensions: ['energy', 'mood'],
    suitableRanges: [
      { dimension: 'energy', max: 40, direction: 'elevate' },
      { dimension: 'stress', max: 55, direction: 'reinforce' },
    ],
    minimumConfidence: 0.25,
    durationMinutes: 3,
    steps: [
      {
        stepNumber: 1,
        title: 'Stand and shake out limbs',
        instruction: 'Stand up and gently shake out both wrists, then your arms, then loosen your knees.',
        durationSeconds: 40,
      },
      {
        stepNumber: 2,
        title: 'Reaching stretch',
        instruction: 'Inhale and reach both arms overhead toward the ceiling, lifting your ribcage. Exhale with a sigh.',
        durationSeconds: 40,
      },
      {
        stepNumber: 3,
        title: 'Rhythmic steps or pacing',
        instruction: 'Pace your room or march in place with light, bouncy steps to encourage circulation.',
        durationSeconds: 60,
      },
      {
        stepNumber: 4,
        title: 'Hydration anchor',
        instruction: 'Drink a glass of cool water. Feel the physical temperature shift refresh your alertness.',
        durationSeconds: 40,
      },
    ],
    contraindications: ['Move comfortably. Avoid rapid jumping or stretching if experiencing joint pain or injury.'],
    safetyNotes: 'Gentle physical circulation. Not strenuous exercise.',
    difficulty: 'gentle',
    cooldownHours: 1.5,
    version: '1.0.0',
  },
};

export const ALL_INTERVENTIONS: InterventionDefinition[] = Object.values(INTERVENTION_LIBRARY);
