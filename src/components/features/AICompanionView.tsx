import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Send, Volume2, VolumeX, Trash2, ArrowLeft, Bot } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CompanionMode } from '../../types';

const modeConfig: Record<CompanionMode, { color: string; bg: string; border: string; desc: string }> = {
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

export const AICompanionView: React.FC = () => {
  const { chatMessages, addChatMessage, clearChat, setCurrentView, showToast } = useApp();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<CompanionMode>('Empathetic Listener');
  const [isSending, setIsSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async (textToSend?: string) => {
    const msgText = textToSend || input;
    if (!msgText.trim()) return;

    if (!textToSend) setInput('');
    setIsSending(true);

    await addChatMessage({ sender: 'user', text: msgText, mode });
    setIsSending(false);

    if (voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg) {
        const utterance = new SpeechSynthesisUtterance(lastMsg.text.slice(0, 150));
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const currentConfig = modeConfig[mode];

  return (
    <div className="relative min-h-screen pt-20 pb-8 px-4 sm:px-6 md:px-8 max-w-3xl mx-auto flex flex-col">
      {/* Deep space background */}
      <div className="fixed inset-0 -z-20 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, #0a0c1a 0%, #0f1128 40%, #0d0d20 100%)' }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="absolute w-96 h-96 rounded-full top-20 left-1/2 -translate-x-1/2 glow-orb" style={{ opacity: 0.25 }} />
      </div>

      {/* === HEADER === */}
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
            onClick={clearChat}
            className="p-2 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(242,139,130,0.10)] text-[rgba(232,234,246,0.30)] hover:text-[#f28b82] rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(242,139,130,0.25)] transition-all"
            title="Clear Session"
            aria-label="Clear Chat Session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* === MODE SELECTOR === */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-5 no-scrollbar">
        {(Object.keys(modeConfig) as CompanionMode[]).map((m) => {
          const cfg = modeConfig[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'font-semibold shadow-md'
                  : 'bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.40)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.07)]'
              }`}
              style={
                isActive
                  ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border }
                  : {}
              }
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Active mode badge */}
      <div className="mb-4 text-xs text-[rgba(232,234,246,0.30)] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentConfig.color, boxShadow: `0 0 6px ${currentConfig.color}80` }} />
        {mode} — {currentConfig.desc}
      </div>

      {/* === MESSAGES === */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-5">
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col max-w-[85%] ${
                msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {/* Avatar + name row */}
              <div className={`flex items-center gap-2 mb-1.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  msg.sender === 'companion'
                    ? 'bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)]'
                    : 'bg-[rgba(255,255,255,0.10)]'
                }`}>
                  {msg.sender === 'companion' ? <Sparkles className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-[rgba(232,234,246,0.60)]" />}
                </div>
                <span className="text-[10px] text-[rgba(232,234,246,0.25)] font-mono">
                  {msg.sender === 'user' ? 'You' : `Companion`} · {msg.timestamp}
                </span>
              </div>

              <div
                className={`px-5 py-3.5 text-sm leading-relaxed border ${
                  msg.sender === 'user'
                    ? 'bg-[rgba(108,114,232,0.15)] border-[rgba(108,114,232,0.25)] text-[rgba(192,196,234,0.90)] rounded-[20px] rounded-tr-sm'
                    : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.80)] rounded-[20px] rounded-tl-sm shadow-[0_8px_24px_rgba(0,0,0,0.30)]'
                }`}
              >
                <p>{msg.text}</p>
              </div>

              {/* Suggested Pathways */}
              {msg.sender === 'companion' && msg.suggestedPathways && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-2 mt-3 max-w-xs"
                >
                  {msg.suggestedPathways.map((pathway, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(pathway)}
                      className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(108,114,232,0.12)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(108,114,232,0.25)] text-xs italic text-[rgba(192,196,234,0.60)] hover:text-[#c0c4ea] px-3.5 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      "{pathway}"
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isSending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start flex items-center gap-2 text-xs text-[rgba(192,196,234,0.50)] italic"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[rgba(192,196,234,0.40)] waveform-bar"
                  style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                />
              ))}
            </div>
            Companion is reflecting...
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* === INPUT BAR === */}
      <div className="sticky bottom-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 bg-[rgba(13,15,26,0.85)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.10)] p-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.50)] focus-within:border-[rgba(108,114,232,0.30)] transition-all duration-200"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[rgba(232,234,246,0.80)] placeholder:text-[rgba(232,234,246,0.25)] px-4 py-2.5"
          />
          <motion.button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim() || isSending}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shadow-[0_4px_16px_rgba(108,114,232,0.40)]"
            style={{
              background: 'linear-gradient(135deg, #6c72e8, #5055c8)',
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};
