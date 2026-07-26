import {
  ViewTab,
  JournalEntry,
  MoodLog,
  Habit,
  UserProfile,
  AppNotification,
  ChatMessage,
  CompanionMode,
} from '../types';

export interface AppContextType {
  currentView: ViewTab;
  setCurrentView: (view: ViewTab) => void;
  journalEntries: JournalEntry[];
  isJournalLoading: boolean;
  isJournalSaving: boolean;
  journalError: string | null;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'wordCount'>) => Promise<JournalEntry>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  deleteJournalEntry: (id: string) => Promise<void>;
  toggleFavoriteEntry: (id: string) => Promise<void>;
  refreshJournalEntries: () => Promise<void>;
  moodLogs: MoodLog[];
  addMoodLog: (log: Omit<MoodLog, 'id' | 'timestamp'>) => void;
  habits: Habit[];
  toggleHabitCompletion: (id: string, dateStr: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearChat: () => void;
  isPricingModalOpen: boolean;
  setIsPricingModalOpen: (open: boolean) => void;
  isCommandKOpen: boolean;
  setIsCommandKOpen: (open: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  activeSoundscape: string | null;
  setActiveSoundscape: (type: string | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}