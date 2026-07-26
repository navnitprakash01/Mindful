import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';
import { Bell, Search, Volume2, VolumeX, Sparkles, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    notifications,
    setIsNotificationDrawerOpen,
    setIsCommandKOpen,
    activeSoundscape,
    toggleSoundscape,
    userProfile,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinks: { label: string; view: ViewTab }[] = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Journal', view: 'journal' },
    { label: 'Companion', view: 'companion' },
    { label: 'Landscape', view: 'mood' },
    { label: 'Habits', view: 'habits' },
    { label: 'Insights', view: 'analytics' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto flex justify-between items-center bg-[rgba(13,15,26,0.75)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.08)] rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.40)]"
      >
        {/* Brand + Desktop Nav */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2.5 group select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6c72e8] to-[#e8799a] flex items-center justify-center shadow-[0_0_16px_rgba(108,114,232,0.40)] group-hover:shadow-[0_0_24px_rgba(108,114,232,0.60)] transition-shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display-lg text-xl text-[rgba(232,234,246,0.90)] group-hover:text-white transition-colors">
              Mindful
            </span>
            {userProfile.plan === 'Mindful Pro' && (
              <Badge variant="pro" size="sm">Pro</Badge>
            )}
          </button>

          <nav className="hidden lg:flex gap-1 items-center">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => setCurrentView(link.view)}
                aria-current={currentView === link.view ? 'page' : undefined}
                className={`relative px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentView === link.view
                    ? 'text-white bg-[rgba(108,114,232,0.16)]'
                    : 'text-[rgba(232,234,246,0.50)] hover:text-[rgba(232,234,246,0.85)] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {currentView === link.view && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-[rgba(108,114,232,0.16)] border border-[rgba(108,114,232,0.25)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Soundscape Toggle */}
          <button
            onClick={() => toggleSoundscape('binaural')}
            title={activeSoundscape ? `Playing ${activeSoundscape}` : 'Play Ambient Soundscape'}
            aria-label={activeSoundscape ? `Turn off ${activeSoundscape} ambient soundscape` : 'Turn on ambient soundscapes'}
            aria-pressed={!!activeSoundscape}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeSoundscape
                ? 'bg-[rgba(108,114,232,0.20)] text-[#c0c4ea] border border-[rgba(108,114,232,0.30)]'
                : 'text-[rgba(232,234,246,0.45)] hover:text-[rgba(232,234,246,0.75)] hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            <AnimatePresence mode="wait">
              {activeSoundscape ? (
                <motion.div key="on" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <Volume2 className="w-3.5 h-3.5 text-[#6c72e8]" />
                </motion.div>
              ) : (
                <motion.div key="off" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                  <VolumeX className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="hidden sm:inline">
              {activeSoundscape ? 'Ambient On' : 'Ambient'}
            </span>
          </button>

          {/* Search/Command K */}
          <button
            onClick={() => setIsCommandKOpen(true)}
            aria-label="Open Search Command Palette"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[rgba(232,234,246,0.40)] hover:text-[rgba(232,234,246,0.70)] hover:bg-[rgba(255,255,255,0.07)] transition-all duration-200"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-md text-[10px] font-mono text-[rgba(232,234,246,0.30)]">⌘K</kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-xl text-[rgba(232,234,246,0.45)] hover:text-[rgba(232,234,246,0.80)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
            title="Notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications, none unread"}
          >
            <Bell className="w-4.5 h-4.5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e8799a] rounded-full shadow-[0_0_8px_rgba(232,121,154,0.80)]"
                />
              )}
            </AnimatePresence>
          </button>

          {/* Profile */}
          <button
            onClick={() => setCurrentView('profile')}
            aria-label="View user profile"
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200 group"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-[rgba(108,114,232,0.25)] group-hover:border-[rgba(108,114,232,0.50)] transition-colors">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        </div>
      </motion.div>
    </header>
  );
};
