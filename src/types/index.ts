export type ViewTab =
  | 'landing'
  | 'dashboard'
  | 'journal'
  | 'mood'
  | 'companion'
  | 'habits'
  | 'analytics'
  | 'settings'
  | 'profile';

export type CompanionMode =
  | 'Empathetic Listener'
  | 'Mindful Coach'
  | 'Stoic Philosopher'
  | 'CBT Reframer';

export interface JournalEntry {
  id: string;
  createdAt: string; // ISO date string
  title: string;
  content: string;
  tags: string[];
  mood: string;
  moodScore: number; // 0 - 100
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite: boolean;
  wordCount: number;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  energyLevel: number; // 1 - 10
  moodType: 'Joy' | 'Anxiety' | 'Calm' | 'Focus' | 'Melancholy' | 'Gratitude' | 'Restless';
  notes: string;
  triggers: string[];
  physicalSensations: string[];
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  category: 'mindfulness' | 'movement' | 'reflection' | 'rest' | 'gratitude';
  streak: number;
  targetFrequency: number; // e.g. 7 days a week
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
  iconName: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  plan: 'Free Sanctuary' | 'Mindful Pro';
  joinedDate: string;
  dailyGoalMinutes: number;
  streakCount: number;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  selectedSoundscape?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'streak' | 'reminder' | 'insight' | 'system';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: string;
  mode?: CompanionMode;
  suggestedPathways?: string[];
}

export interface SoundscapeTrack {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
}
