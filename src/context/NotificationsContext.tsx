import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Phase 8: Check for dynamic proactive intelligence notification on load & visibility change
  const checkForProactiveNotification = useCallback(async () => {
    try {
      const token = localStorage.getItem('mindful_token') || sessionStorage.getItem('mindful_token');
      if (!token) return;

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/proactive/check?timezone=${encodeURIComponent(userTimezone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const decision = await res.json();
        if (decision && decision.shouldSurface) {
          const dynamicNotifId = `proactive-${decision.evaluatedAt || Date.now()}`;

          setNotifications((prev) => {
            // Deduplicate if already present
            if (prev.some((n) => n.id === dynamicNotifId)) return prev;

            const newNotif: AppNotification = {
              id: dynamicNotifId,
              title: decision.headline || 'Mindful Check-In',
              message: decision.message || 'Would you like to take a quiet moment to check in?',
              timestamp: 'Just now',
              read: false,
              type: decision.actionType === 'intervention_suggestion' ? 'insight' : 'reminder',
            };
            return [newNotif, ...prev];
          });
        }
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    checkForProactiveNotification();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForProactiveNotification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkForProactiveNotification]);

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