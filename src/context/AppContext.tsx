import React from 'react';
import { ViewProvider, useView } from './ViewContext';
import { JournalProvider, useJournal } from './JournalContext';
import { MoodProvider, useMood } from './MoodContext';
import { HabitsProvider, useHabits } from './HabitsContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import { NotificationsProvider, useNotifications } from './NotificationsContext';
import { UIProvider, useUI } from './UIContext';
import { ChatProvider, useChat } from './ChatContext';
import { useToast } from './ToastContext';
import { AppContextType } from './AppContextTypes';

const AppContext = React.createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ViewProvider>
    <JournalProvider>
      <MoodProvider>
        <HabitsProvider>
          <ProfileProvider>
            <NotificationsProvider>
              <UIProvider>
                <ChatProvider>
                  <AppContent>{children}</AppContent>
                </ChatProvider>
              </UIProvider>
            </NotificationsProvider>
          </ProfileProvider>
        </HabitsProvider>
      </MoodProvider>
    </JournalProvider>
  </ViewProvider>
);

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const view = useView();
  const journal = useJournal();
  const mood = useMood();
  const habits = useHabits();
  const profile = useProfile();
  const notifications = useNotifications();
  const ui = useUI();
  const chat = useChat();
  const toast = useToast();

  const value: AppContextType = {
    ...view,
    ...journal,
    ...mood,
    ...habits,
    ...profile,
    ...notifications,
    ...ui,
    ...chat,
    ...toast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};