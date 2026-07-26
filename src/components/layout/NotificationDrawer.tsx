import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Check, Trash2, Sparkles, Flame, Clock } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { useUI } from '../../context/UIContext';

export const NotificationDrawer: React.FC = () => {
  const { notifications, markNotificationRead, clearNotifications } = useNotifications();
  const { isNotificationDrawerOpen, setIsNotificationDrawerOpen } = useUI();

  return (
    <AnimatePresence>
      {isNotificationDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="fixed inset-0 bg-[rgba(13,15,26,0.60)] backdrop-blur-xs"
          />

          {/* Drawer Content */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] border-l border-[rgba(255,255,255,0.08)] shadow-[0_40px_100px_rgba(0,0,0,0.60)] h-full p-6 flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-[rgba(108,114,232,0.9)]" />
                <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.9)]">
                  Notifications
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="p-1.5 text-[rgba(232,234,246,0.45)] hover:text-[#f28b82] transition-colors rounded-full"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationDrawerOpen(false)}
                  className="p-1.5 text-[rgba(232,234,246,0.45)] hover:text-[rgba(192,196,234,0.9)] transition-colors rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[rgba(232,234,246,0.4)]">
                  <Bell className="w-12 h-12 stroke-1 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Your sanctuary is serene</p>
                  <p className="text-xs mt-1">No unread notifications right now.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      notif.read
                        ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] opacity-70'
                        : 'bg-[rgba(255,255,255,0.04)] border-[rgba(108,114,232,0.20)] shadow-[0_8px_32px_rgba(0,0,0,0.30)]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        {notif.type === 'streak' && <Flame className="w-4 h-4 text-[#fbbf24]" />}
                        {notif.type === 'insight' && <Sparkles className="w-4 h-4 text-[#6c72e8]" />}
                        {notif.type === 'reminder' && <Clock className="w-4 h-4 text-[#34d399]" />}
                        <h4 className="text-sm font-semibold text-[rgba(232,234,246,0.9)]">
                          {notif.title}
                        </h4>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={() => markNotificationRead(notif.id)}
                          className="p-1 text-[rgba(232,234,246,0.45)] hover:text-[rgba(192,196,234,0.9)]"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[rgba(232,234,246,0.45)] mt-1.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-[rgba(232,234,246,0.3)] mt-2 block font-mono">
                      {notif.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
