import {
  ViewTab,
  JournalEntry,
  MoodLog,
  Habit,
  UserProfile,
  AppNotification,
  ChatMessage,
  ChatConversationSummary,
  CompanionMode,
  PersonalState,
} from '../types';

export interface AppContextType {
  currentView: ViewTab;
  setCurrentView: (view: ViewTab) => void;
  journalEntries: JournalEntry[];
  isJournalLoading: boolean;
  isJournalSaving: boolean;
  journalError: string | null;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'wordCount'>) => Promise<JournalEntry | null>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  deleteJournalEntry: (id: string) => Promise<boolean>;
  toggleFavoriteEntry: (id: string) => Promise<JournalEntry | null>;
  refreshJournalEntries: () => Promise<void>;
  moodLogs: MoodLog[];
  addMoodLog: (
    log: Omit<MoodLog, 'id' | 'timestamp'>,
    onSuccess?: () => void | Promise<void>
  ) => Promise<import('../context/MoodContext').AddMoodLogResult>;
  isMoodLoading: boolean;
  reloadMoodLogs: () => Promise<void>;
  personalState: PersonalState | null;
  stateHistory: PersonalState[];
  personalBaseline: import('../types').PersonalBaseline | null;
  patterns: import('../types').PersonalPattern[];
  isPatternsLoading: boolean;
  isStateLoading: boolean;
  stateError: string | null;
  refreshState: () => Promise<void>;
  recalculateState: () => Promise<void>;
  refreshPatterns: () => Promise<void>;
  habits: Habit[];
  toggleHabitCompletion: (id: string, dateStr?: string) => Promise<void> | void;
  createHabit?: (input: {
    title: string;
    description?: string;
    category?: Habit['category'];
    targetFrequency?: number;
    restDaysAllowed?: number;
  }) => Promise<Habit | null>;
  archiveHabit?: (id: string) => Promise<boolean>;
  deleteHabit?: (id: string) => Promise<boolean>;
  refreshHabits?: () => Promise<void>;
  isHabitsLoading?: boolean;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  chatMessages: ChatMessage[];
  conversations: ChatConversationSummary[];
  activeConversationId: string | null;
  isHistoryLoading: boolean;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage | null>;
  clearChat: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
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
  // Phase 3: Personalized Interventions
  recommendation: import('../types').InterventionRecommendation | null;
  activeSession: import('../types').InterventionSession | null;
  sessionHistory: import('../types').InterventionSession[];
  effectiveness: Record<string, import('../types').InterventionEffectiveness>;
  isPlayerOpen: boolean;
  playerIntervention: import('../types').InterventionDefinition | null;
  openPlayer: (intervention?: import('../types').InterventionDefinition) => void;
  closePlayer: () => void;
  startSession: (interventionId: string) => Promise<import('../types').InterventionSession | null>;
  completeSession: (
    sessionId: string,
    payload: import('../context/InterventionContext').CompleteSessionPayload
  ) => Promise<import('../types').InterventionSession | null>;
  refreshRecommendation: (textContext?: string) => Promise<void>;
}