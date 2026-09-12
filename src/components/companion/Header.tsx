import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Volume2, VolumeX, Trash2, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCompanion } from '../../hooks/useCompanion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface HeaderProps {
  onModeChange?: (mode: string) => void;
  currentMode?: string;
}

export const Header: React.FC<HeaderProps> = ({ onModeChange, currentMode = 'Empathetic Listener' }) => {
  const { setCurrentView, showToast } = useApp();
  const { voiceEnabled, setVoiceEnabled, clearConversation } = useCompanion();

  return (
    <div className="flex justify-between items-center py-4 mb-6 border-b border-[rgba(255,255,255,0.07)]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentView('dashboard')}
          aria-label="Back to dashboard"
          className="p-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.50)] hover:text-[rgba(232,234,246,0.85)] border border-[rgba(255,255,255,0.06)] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">
              AI Companion
            </h1>
          </div>
          <p className="text-[10px] text-[rgba(232,234,246,0.30)] uppercase tracking-[0.12em] mt-0.5 ml-0.5">
            Session #24 • Intelligent Presence
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`p-2 rounded-xl border transition-all ${
            voiceEnabled
              ? 'bg-[rgba(108,114,232,0.15)] text-[#c0c4ea] border-[rgba(108,114,232,0.30)]'
              : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.30)] border-[rgba(255,255,255,0.06)]'
          }`}
          title="Toggle Voice Output"
          aria-label={voiceEnabled ? 'Disable Voice Output' : 'Enable Voice Output'}
          aria-pressed={voiceEnabled}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          onClick={clearConversation}
          className="p-2 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(242,139,130,0.10)] text-[rgba(232,234,246,0.30)] hover:text-[#f28b82] rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(242,139,130,0.25)] transition-all"
          title="Clear Session"
          aria-label="Clear Chat Session"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const modeConfig: Record<string, { color: string; bg: string; border: string; desc: string }> = {
  'Empathetic Listener': {
    color: '#c0c4ea',
    bg: 'rgba(192,196,234,0.10)',
    border: 'rgba(192,196,234,0.20)',
    desc: 'Present, warm, non-judgmental',
  },
  'Mindful Coach': {
    color: '#6ee7b7',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.20)',
    desc: 'Goal-oriented guidance',
  },
  'Stoic Philosopher': {
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.20)',
    desc: 'Rational, grounded wisdom',
  },
  'CBT Reframer': {
    color: '#f4a8c0',
    bg: 'rgba(232,121,154,0.10)',
    border: 'rgba(232,121,154,0.20)',
    desc: 'Thought pattern restructuring',
  },
};

interface ModeSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const modes = Object.keys(modeConfig);

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-5 no-scrollbar">
      {modes.map((mode) => {
        const config = modeConfig[mode];
        const isActive = currentMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? 'font-semibold shadow-md'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.40)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.07)]'
            }`}
            style={
              isActive
                ? { background: config.bg, color: config.color, borderColor: config.border }
                : {}
            }
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
};

interface ActiveModeBadgeProps {
  mode: string;
}

export const ActiveModeBadge: React.FC<ActiveModeBadgeProps> = ({ mode }) => {
  const config = modeConfig[mode] || modeConfig['Empathetic Listener'];

  return (
    <div className="mb-4 text-xs text-[rgba(232,234,246,0.30)] flex items-center gap-2">
      <div 
        className="w-1.5 h-1.5 rounded-full" 
        style={{ background: config.color, boxShadow: `0 0 6px ${config.color}80` }} 
      />
      {mode} — {config.desc}
    </div>
  );
};

interface WelcomeCardProps {
  onQuickAction: (prompt: string) => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onQuickAction }) => {
  const quickActions = [
    { id: '1', label: 'Reflect', prompt: 'Help me reflect on my day and what I learned.' },
    { id: '2', label: 'Reduce Stress', prompt: 'I\'m feeling stressed. Guide me through a calming practice.' },
    { id: '3', label: 'Motivation', prompt: 'I need some motivation to get through my tasks.' },
    { id: '4', label: 'Gratitude', prompt: 'Help me cultivate gratitude for what I have.' },
    { id: '5', label: 'Sleep Better', prompt: 'I want to improve my sleep quality tonight.' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-[rgba(108,114,232,0.12)] to-[rgba(13,15,26,0.92)] border border-[rgba(108,114,232,0.22)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-[rgba(232,234,246,0.35)] uppercase tracking-[0.12em] mb-1">
            {greeting}
          </p>
          <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
            I'm here whenever you need someone to talk to.
          </h2>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(108,114,232,0.30)] to-[rgba(192,196,234,0.15)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#c0c4ea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            onClick={() => onQuickAction(action.prompt)}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(108,114,232,0.10)] text-[rgba(232,234,246,0.70)] hover:text-[#c0c4ea] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(108,114,232,0.30)] text-[11px] font-medium transition-all duration-200 whitespace-nowrap"
            type="button"
          >
            {action.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};