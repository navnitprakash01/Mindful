import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';
import { BookOpen, Sparkles, LayoutGrid, HeartHandshake, CheckSquare, BarChart3, Compass, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (currentView === 'landing') return null;

  const isCompanion = currentView === 'companion';

  const items: { label: string; view: ViewTab; icon: React.ReactNode }[] = [
    { label: 'Journal', view: 'journal', icon: <BookOpen className="w-4.5 h-4.5" /> },
    { label: 'AI Chat', view: 'companion', icon: <Sparkles className="w-4.5 h-4.5" /> },
    { label: 'Home', view: 'dashboard', icon: <LayoutGrid className="w-4.5 h-4.5" /> },
    { label: 'Mood', view: 'mood', icon: <HeartHandshake className="w-4.5 h-4.5" /> },
    { label: 'Habits', view: 'habits', icon: <CheckSquare className="w-4.5 h-4.5" /> },
    { label: 'Insights', view: 'analytics', icon: <BarChart3 className="w-4.5 h-4.5" /> },
  ];

  return (
    <>
      {/* ── PHONE AI CHAT ONLY: Compact Floating Navigation Button / Menu ── */}
      {isCompanion && (
        <div
          ref={menuRef}
          className="md:hidden fixed z-50 left-4"
          style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Expanded Navigation Popover Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-14 left-0 w-56 bg-[rgba(13,15,26,0.94)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.12)] rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.75)] p-2 flex flex-col gap-1 z-50"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[rgba(232,234,246,0.40)] border-b border-[rgba(255,255,255,0.06)] mb-1 flex items-center justify-between">
                  <span>Navigation</span>
                  <span className="text-[#6c72e8]">Mindful</span>
                </div>
                {items.map((item) => {
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        setCurrentView(item.view);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left ${
                        isActive
                          ? 'bg-[rgba(108,114,232,0.20)] text-white border border-[rgba(108,114,232,0.30)]'
                          : 'text-[rgba(232,234,246,0.60)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[#c0c4ea]' : 'text-[rgba(232,234,246,0.45)]'}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6c72e8]" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Floating Trigger Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            whileTap={{ scale: 0.92 }}
            className="w-11 h-11 rounded-2xl bg-[rgba(13,15,26,0.88)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.12)] shadow-[0_8px_32px_rgba(0,0,0,0.60)] flex items-center justify-center text-[#c0c4ea] hover:text-white transition-all focus:outline-none"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-5 h-5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative flex items-center justify-center"
                >
                  <Compass className="w-5 h-5 text-[#c0c4ea]" />
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6c72e8] shadow-[0_0_6px_#6c72e8]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      {/* ── STANDARD BOTTOM NAV: Rendered for Tablet (when companion) AND All Mobile (when other views) ── */}
      <nav
        className={`${
          isCompanion
            ? 'hidden md:flex lg:hidden app-bottom-nav relative z-30 shrink-0 justify-center px-4 pt-1 pointer-events-auto'
            : 'flex lg:hidden fixed left-0 right-0 z-50 pointer-events-none justify-center px-4'
        }`}
        style={
          isCompanion
            ? { paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }
            : { bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }
        }
      >
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
    </>
  );
};
