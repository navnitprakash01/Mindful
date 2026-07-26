import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';
import { BookOpen, Sparkles, LayoutGrid, HeartHandshake, CheckSquare, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView } = useApp();

  if (currentView === 'landing') return null;

  const items: { label: string; view: ViewTab; icon: React.ReactNode }[] = [
    { label: 'Journal', view: 'journal', icon: <BookOpen className="w-4.5 h-4.5" /> },
    { label: 'AI Chat', view: 'companion', icon: <Sparkles className="w-4.5 h-4.5" /> },
    { label: 'Home', view: 'dashboard', icon: <LayoutGrid className="w-4.5 h-4.5" /> },
    { label: 'Mood', view: 'mood', icon: <HeartHandshake className="w-4.5 h-4.5" /> },
    { label: 'Habits', view: 'habits', icon: <CheckSquare className="w-4.5 h-4.5" /> },
    { label: 'Insights', view: 'analytics', icon: <BarChart3 className="w-4.5 h-4.5" /> },
  ];

  return (
    <nav className="fixed bottom-5 left-0 right-0 z-50 pointer-events-none flex justify-center px-4 lg:hidden">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.2 }}
        className="pointer-events-auto bg-[rgba(13,15,26,0.85)] backdrop-blur-[32px] rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-[0_8px_40px_rgba(0,0,0,0.60)] flex items-center px-2 py-2 gap-1"
      >
        {items.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`relative flex flex-col items-center justify-center py-2 px-3.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-[rgba(232,234,246,0.35)] hover:text-[rgba(232,234,246,0.70)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-[rgba(108,114,232,0.20)] border border-[rgba(108,114,232,0.30)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.icon}</span>
              <span className={`relative z-10 text-[10px] font-medium tracking-tight mt-0.5 ${isActive ? 'text-[#c0c4ea]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
};
