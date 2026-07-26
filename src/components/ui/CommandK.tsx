import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, HeartHandshake, Sparkles, Activity, Settings, User, Compass, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';

export const CommandK: React.FC = () => {
  const { isCommandKOpen, setIsCommandKOpen, setCurrentView, showToast } = useApp();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandKOpen(!isCommandKOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandKOpen, setIsCommandKOpen]);

  const commandItems: { label: string; view: ViewTab; icon: React.ReactNode; category: string }[] = [
    { label: 'Zen Dashboard', view: 'dashboard', icon: <Compass className="w-4 h-4" />, category: 'Navigation' },
    { label: 'Begin Journal Reflection', view: 'journal', icon: <BookOpen className="w-4 h-4" />, category: 'Action' },
    { label: 'Talk to AI Companion', view: 'companion', icon: <Sparkles className="w-4 h-4" />, category: 'Action' },
    { label: 'Log Mood & Energy', view: 'mood', icon: <HeartHandshake className="w-4 h-4" />, category: 'Action' },
    { label: 'Habits & Daily Rituals', view: 'habits', icon: <Activity className="w-4 h-4" />, category: 'Navigation' },
    { label: 'Emotional Topography', view: 'analytics', icon: <Activity className="w-4 h-4" />, category: 'Navigation' },
    { label: 'Settings & Soundscapes', view: 'settings', icon: <Settings className="w-4 h-4" />, category: 'Preferences' },
    { label: 'Profile & Sanctuary Plan', view: 'profile', icon: <User className="w-4 h-4" />, category: 'Preferences' },
  ];

  const filteredItems = commandItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (view: ViewTab, label: string) => {
    setCurrentView(view);
    setIsCommandKOpen(false);
    setSearch('');
    showToast(`Navigated to ${label}`);
  };

  return (
    <AnimatePresence>
      {isCommandKOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCommandKOpen(false)}
            className="fixed inset-0 bg-[rgba(13,15,26,0.50)] backdrop-blur-[12px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-[rgba(13,15,26,0.75)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.12)] rounded-[28px] shadow-[0_40px_100px_rgba(0,0,0,0.60)] overflow-hidden z-10"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)'
            }}
          >
            {/* Search Input */}
            <div className="flex items-center px-6 py-5 border-b border-[rgba(255,255,255,0.08)] gap-3 bg-[rgba(255,255,255,0.02)]">
              <Search className="w-5 h-5 text-[rgba(232,234,246,0.30)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search sanctuary..."
                className="w-full bg-transparent text-base md:text-lg text-[rgba(232,234,246,0.95)] placeholder:text-[rgba(232,234,246,0.25)] focus:outline-none placeholder:font-light font-body-md"
                autoFocus
              />
              <button
                onClick={() => setIsCommandKOpen(false)}
                className="text-[rgba(232,234,246,0.25)] hover:text-[rgba(232,234,246,0.80)] p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.10)] transition-all flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto p-3 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center mb-3">
                    <Search className="w-5 h-5 text-[rgba(232,234,246,0.20)]" />
                  </div>
                  <p className="text-sm font-semibold text-[rgba(232,234,246,0.60)]">No commands found</p>
                  <p className="text-xs text-[rgba(232,234,246,0.30)] mt-1">Try searching for a view like "Journal" or "Settings"</p>
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.view, item.label)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] hover:bg-[rgba(108,114,232,0.12)] border border-transparent hover:border-[rgba(108,114,232,0.25)] transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center gap-4 text-sm text-[rgba(232,234,246,0.70)] group-hover:text-[#c0c4ea] font-medium transition-colors">
                      <div className="p-2.5 bg-[rgba(255,255,255,0.05)] rounded-xl text-[rgba(232,234,246,0.50)] group-hover:bg-[rgba(108,114,232,0.20)] group-hover:text-[#c0c4ea] transition-all shadow-sm">
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold tracking-[0.10em] uppercase px-3 py-1 rounded-full bg-[rgba(255,255,255,0.05)] text-[rgba(232,234,246,0.30)] group-hover:bg-[rgba(108,114,232,0.15)] group-hover:text-[#c0c4ea] transition-colors">
                      {item.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-[rgba(255,255,255,0.02)] px-6 py-3 text-[10px] text-[rgba(232,234,246,0.30)] flex justify-between items-center border-t border-[rgba(255,255,255,0.05)] font-mono uppercase tracking-widest">
              <span>Mindful Command Line</span>
              <span>ESC to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
