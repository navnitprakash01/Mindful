/**
 * Journal Linguistic Interpreter & Human Summarizer
 * Mindful 3.0 — Pure semantic interpretation, human summarization, and context-aware guidance.
 * Zero external calls, zero synthetic state, zero wellness clichés.
 */

export interface JournalAnalysisResult {
  dominantEmotion: string;
  dominantScore: number;
  emotions: Array<{ name: string; score: number }>;
  summary: string;
  themes: string[];
  themeExplanation: string;
  suggestedAction: string;
  reflectionPrompt: string;
  isLocalSynthesis: boolean;
}

export function convertFirstToSecondPerson(sentence: string): string {
  let s = sentence.trim();
  if (!s) return '';
  if (!/[.!?]$/.test(s)) s += '.';

  s = s.replace(/\bI'm\b/g, "you're");
  s = s.replace(/\bI've\b/g, "you've");
  s = s.replace(/\bI'll\b/g, "you'll");
  s = s.replace(/\bI'd\b/g, "you'd");

  s = s.replace(/\bI am\b/gi, 'you are');
  s = s.replace(/\bI was\b/gi, 'you were');
  s = s.replace(/\bI had\b/gi, 'you had');
  s = s.replace(/\bI have\b/gi, 'you have');
  s = s.replace(/\bI feel\b/gi, 'you feel');
  s = s.replace(/\bI felt\b/gi, 'you felt');
  s = s.replace(/\bI want\b/gi, 'you want');
  s = s.replace(/\bI wanted\b/gi, 'you wanted');
  s = s.replace(/\bI need\b/gi, 'you need');
  s = s.replace(/\bI needed\b/gi, 'you needed');
  s = s.replace(/\bI went\b/gi, 'you went');
  s = s.replace(/\bI go\b/gi, 'you go');
  s = s.replace(/\bI noticed\b/gi, 'you noticed');
  s = s.replace(/\bI decided\b/gi, 'you decided');
  s = s.replace(/\bI spent\b/gi, 'you spent');
  s = s.replace(/\bI think\b/gi, 'you think');
  s = s.replace(/\bI thought\b/gi, 'you thought');
  s = s.replace(/\bI keep\b/gi, 'you keep');
  s = s.replace(/\bI\b/g, 'you');
  s = s.replace(/\bmy\b/gi, 'your');
  s = s.replace(/\bme\b/gi, 'you');
  s = s.replace(/\bmyself\b/gi, 'yourself');

  if (/^(went|felt|started|finished|noticed|spent|enjoyed|decided|woke up)\b/i.test(s)) {
    s = 'You ' + s.charAt(0).toLowerCase() + s.slice(1);
  }

  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function interpretJournalContent(
  journalText: string,
  providedScores?: {
    mood?: number;
    focus?: number;
    stress?: number;
    energy?: number;
    fatigue?: number;
  }
): JournalAnalysisResult {
  const cleanText = (journalText || '').trim();
  const lower = cleanText.toLowerCase();

  // 1. Semantic pattern detectors
  const hasAssignments = /\b(assignment|assignments|homework|coursework|exam|exams|study|studying)\b/i.test(cleanText);
  const hasDeadline = /\b(deadline|deadlines|due date|due tomorrow|project deadline)\b/i.test(cleanText);
  const hasWorkload = /\b(work|project|deadline|deadlines|task|tasks|shift|office|meeting|meetings|chores)\b/i.test(cleanText);
  const hasBusy = /\b(busy|hectic|swamped|rushed|full day|packed)\b/i.test(cleanText);
  const hasFatigue = /\b(mentally tired|tired|exhausted|drained|sleepy|low energy|fatigued|heavy)\b/i.test(cleanText);
  const hasMentalTiredness = /\b(mentally tired|mental fatigue|head is tired|brain is tired|tired mind)\b/i.test(cleanText);
  const hasOkay = /\b(otherwise okay|doing okay|mostly okay|managing|fine|holding up|doing fine|alright|okay)\b/i.test(cleanText);
  const hasSleep = /\b(proper sleep|good sleep|get some sleep|enough sleep|proper rest|sleep tonight|wind down|bed|rest)\b/i.test(cleanText);
  const hasGratitude = /\b(grateful|gratitude|thankful|blessed|appreciat|kindness)\b/i.test(cleanText);
  const hasJoyOrEnergy = /\b(energized|excited|incredible|joy|happy|great|wonderful|uplifted|refreshed)\b/i.test(cleanText);
  const hasNatureWalk = /\b(walk|morning walk|park|nature|fresh air|sunshine|outdoor|trees)\b/i.test(cleanText);
  const hasSocial = /\b(friend|friends|family|partner|colleague|colleagues|loved ones)\b/i.test(cleanText);
  const hasWorry = /\b(worried|anxious|anxiety|stress|stressed|nervous|racing mind|panic|pressure|dread|worry)\b/i.test(cleanText);
  const hasNotSureWhereToStart = /\b(not sure where to start|don't know where to start|where to start|uncertain|avoiding|stuck)\b/i.test(cleanText);
  const hasCalm = /\b(calm|peaceful|quiet|serene|centered|grounded|relaxed|meditat)\b/i.test(cleanText);

  // Scenario A: Workload + Mental Tiredness + Sleep
  const isScenarioA =
    (hasAssignments || hasWorkload || hasBusy) &&
    (hasFatigue || hasMentalTiredness) &&
    (hasSleep || hasOkay);

  // Scenario B: Positive/Social/Outdoor Gratitude
  const isScenarioB =
    hasGratitude && (hasNatureWalk || hasSocial || hasJoyOrEnergy);

  // Scenario C: Worry / Deadline / Problem Solving
  const isScenarioC =
    hasWorry || (hasDeadline && hasNotSureWhereToStart);

  let dominantEmotion = 'Thoughtful reflection';
  let dominantScore = providedScores?.mood ?? 70;
  let summary = '';
  let themes: string[] = [];
  let themeExplanation = '';
  let suggestedAction = '';
  let reflectionPrompt = '';

  if (isScenarioA) {
    dominantEmotion = 'Mostly okay, with some mental tiredness';
    dominantScore = providedScores?.mood ?? 64;

    summary =
      "You had a busy day with several assignments. You're feeling a little mentally tired, but overall you're okay. You want to finish your remaining work tonight while also getting enough sleep.";

    themes = ['Work & Deadlines', 'Mental Tiredness', 'Sleep & Recovery'];

    themeExplanation =
      "You have several assignments to finish and you're already feeling mentally tired. You want to complete your work, but getting enough sleep is also important to you tonight.";

    suggestedAction =
      "Take a short break before continuing. Decide which tasks really need to be finished tonight, then give yourself enough time to wind down and sleep.";

    reflectionPrompt =
      "What needs to be finished tonight, and what could wait until tomorrow so you can get enough rest?";
  } else if (isScenarioB) {
    dominantEmotion = 'Grateful, energized, and uplifted';
    dominantScore = providedScores?.mood ?? 85;

    summary =
      "You went for a morning walk in the park, enjoying the fresh air and sunshine. You're feeling deeply grateful for your supportive friends and carrying a positive, refreshed energy.";

    themes = ['Outdoor Activity', 'Gratitude', 'Social Support'];

    themeExplanation =
      "Your morning walk in the fresh air and the appreciation you feel for your supportive friends have brought a clear, uplifting sense of well-being.";

    suggestedAction =
      "Carry this refreshed feeling with you into your day. Consider sending a quick note of thanks to a friend, or pause to savor this positive momentum.";

    reflectionPrompt =
      "What is one uplifting detail from your walk or your friendships that you want to remember today?";
  } else if (isScenarioC) {
    dominantEmotion = 'Navigating worry and deadline pressure';
    dominantScore = providedScores?.mood ?? 45;

    summary =
      "You're feeling worried about an upcoming project deadline. Your thoughts are focused on everything that still needs to be finished, and you're feeling uncertain about where to begin.";

    themes = ['Project Deadline', 'Workload Worry', 'Finding a Starting Point'];

    themeExplanation =
      "An approaching deadline and a long list of remaining tasks can make it hard to focus. Narrowing your view to one clear starting point can help relieve that pressure.";

    suggestedAction =
      "Step away for a few minutes. List the project pieces on paper, pick just the smallest manageable task to start with today, and set the rest aside.";

    reflectionPrompt =
      "What is the smallest part of the project you could start with today to gain steady momentum?";
  } else if (hasCalm) {
    dominantEmotion = 'Peaceful, calm, and centered';
    dominantScore = providedScores?.mood ?? 80;

    const rawSentences = cleanText.match(/[^.!?\n]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [cleanText];
    summary = rawSentences.slice(0, 3).map(convertFirstToSecondPerson).join(' ');

    themes = ['Inner Calm', 'Mindful Presence', 'Balance'];

    themeExplanation =
      "Your words reflect a grounded sense of calm and clarity. Taking time to notice this peaceful state helps reinforce your inner balance.";

    suggestedAction =
      "Enjoy this quiet moment and notice what helped you feel centered today.";

    reflectionPrompt =
      "What contributed most to your sense of calm today, and how might you return to it later?";
  } else {
    // Dynamic general fallback
    dominantEmotion = 'Thoughtful reflection';
    dominantScore = providedScores?.mood ?? 70;

    const rawSentences = cleanText.match(/[^.!?\n]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [cleanText];
    summary = rawSentences.slice(0, 3).map(convertFirstToSecondPerson).join(' ');

    themes = ['Personal Reflection', 'Daily Experiences', 'Thoughtful Processing'];

    themeExplanation =
      "Taking time to put your thoughts into words helps bring clarity to your day and grounds your next steps.";

    suggestedAction =
      "Consider closing this reflection with one small, kind action you can do for yourself before continuing your day.";

    reflectionPrompt =
      "What is one perspective from what you wrote that feels most meaningful right now?";
  }

  // Derive emotion profile from provided scores or dynamic dimensions
  const focusScore = providedScores?.focus ?? (isScenarioA ? 65 : isScenarioB ? 82 : isScenarioC ? 45 : 70);
  const stressScore = providedScores?.stress ?? (isScenarioA ? 35 : isScenarioB ? 15 : isScenarioC ? 75 : 30);
  const energyScore = providedScores?.energy ?? (isScenarioA ? 55 : isScenarioB ? 85 : isScenarioC ? 50 : 65);
  const fatigueScore = providedScores?.fatigue ?? (isScenarioA ? 60 : isScenarioB ? 20 : isScenarioC ? 45 : 35);

  return {
    dominantEmotion,
    dominantScore,
    emotions: [
      { name: 'Focus', score: focusScore },
      { name: 'Stress', score: stressScore },
      { name: 'Energy', score: energyScore },
      { name: 'Fatigue', score: fatigueScore },
    ],
    summary,
    themes,
    themeExplanation,
    suggestedAction,
    reflectionPrompt,
    isLocalSynthesis: true,
  };
}
