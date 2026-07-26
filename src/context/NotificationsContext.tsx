import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppNotification } from '../types';

interface NotificationsContextType {
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const initialNotifications: AppNotification[] = [
  {
    id: "notif-1",
    title: "14-Day Streak Unlocked! 🔥",
    message: "You've completed your Morning Grounding Meditation for 14 days straight.",
    timestamp: "10 mins ago",
    read: false,
    type: "streak",
  },
  {
    id: "notif-2",
    title: "Weekly Emotional Topography Ready 🌊",
    message: "Your AI synthesis shows a 24% increase in deep focus hours.",
    timestamp: "2 hours ago",
    read: false,
    type: "insight",
  },
  {
    id: "notif-3",
    title: "Evening Check-in Reminder",
    message: "What is one thing you held onto today that you can gently release?",
    timestamp: "Yesterday",
    read: true,
    type: "reminder",
  },
];

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, markNotificationRead, clearNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
};