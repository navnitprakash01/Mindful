import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Trash2,
  ArrowLeft,
  Bot,
  Plus,
  History,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  MessageSquare,
  X,
} from 'lucide-react';
import { CompanionMode, ChatConversationSummary } from '../../types';
import { getConversationDateGroup, DateGroupLabel } from '../../context/ChatContext';

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

const ConversationHistoryList: React.FC<{
  groupedConversations: Record<DateGroupLabel, ChatConversationSummary[]>;
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}> = ({ groupedConversations, activeConversationId, onSelect, onDelete, onNewChat }) => {
  const groups: DateGroupLabel[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];
  const hasAny = groups.some((group) => (groupedConversations[group] || []).length > 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top New Chat CTA Button */}
      <div className="p-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[rgba(108,114,232,0.30)] to-[rgba(80,85,200,0.20)] hover:from-[rgba(108,114,232,0.45)] hover:to-[rgba(80,85,200,0.35)] text-white border border-[rgba(108,114,232,0.35)] text-xs font-semibold shadow-[0_2px_12px_rgba(108,114,232,0.20)] transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-[#c0c4ea]" />
          <span>New Chat</span>
        </button>
      </div>

      {/* History Items */}
      {!hasAny ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[rgba(232,234,246,0.30)] text-xs">
          <MessageSquare className="w-7 h-7 mb-2 opacity-35 text-[#c0c4ea]" />
          <p className="font-medium text-[rgba(232,234,246,0.60)]">No chats yet</p>
          <p className="text-[11px] mt-1 text-[rgba(232,234,246,0.30)]">Your reflections will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 space-y-4 no-scrollbar">
          {groups.map((group) => {
            const items = groupedConversations[group];
            if (!items || items.length === 0) return null;

            return (
              <div key={group} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[rgba(232,234,246,0.35)]">
                  {group}
                </div>
                {items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelect(conv.id)}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${
                        isActive
                          ? 'bg-[rgba(108,114,232,0.18)] text-white border-[rgba(108,114,232,0.35)] shadow-sm font-medium'
                          : 'bg-transparent text-[rgba(232,234,246,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#8a8ff4]' : 'text-[rgba(232,234,246,0.30)] group-hover:text-[rgba(232,234,246,0.60)]'
                          }`}
                        />
                        <span className="truncate flex-1">{conv.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conv.id);
                        }}
                        title="Delete conversation"
                        aria-label={`Delete ${conv.title}`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[rgba(232,234,246,0.30)] hover:text-[#f28b82] hover:bg-[rgba(242,139,130,0.12)] transition-opacity shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AICompanionView: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    clearChat,
    startNewConversation,
    selectConversation,
    deleteConversation,
    conversations,
    activeConversationId,
    setCurrentView,
  } = useApp();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<CompanionMode>('Empathetic Listener');
  const [isSending, setIsSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // Sidebar & drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Scroll tracking state
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    setIsScrolledUp(false);
    setShowNewMessagePill(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    const scrolledUp = distanceFromBottom > 100;
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setShowNewMessagePill(false);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
  }, []);

  const speakMessage = useCallback((id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (currentlySpeakingId === id) {
      setCurrentlySpeakingId(null);
      return;
    }

    const cleanText = text.replace(/[*_~`#]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [currentlySpeakingId]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  const prevMsgCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevMsgCountRef.current) {
      if (!isScrolledUp) {
        scrollToBottom(true);
      } else {
        setShowNewMessagePill(true);
      }
    }
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages, isScrolledUp, scrollToBottom]);

  const handleSend = async (textToSend?: string) => {
    const msgText = textToSend || input;
    if (!msgText.trim()) return;

    stopSpeech();
    if (!textToSend) setInput('');
    setIsSending(true);

    setTimeout(() => scrollToBottom(true), 50);

    const companionReply = await addChatMessage({ sender: 'user', text: msgText, mode });
    setIsSending(false);

    if (voiceEnabled && companionReply?.text) {
      speakMessage(companionReply.id, companionReply.text);
    }
  };

  const handleToggleVoice = () => {
    if (voiceEnabled) {
      stopSpeech();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleClearChat = () => {
    stopSpeech();
    clearChat();
  };

  const handleNewChat = useCallback(() => {
    stopSpeech();
    startNewConversation();
    setIsMobileDrawerOpen(false);
    setTimeout(() => {
      scrollToBottom(false);
    }, 50);
  }, [stopSpeech, startNewConversation, scrollToBottom]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      stopSpeech();
      await selectConversation(id);
      setIsMobileDrawerOpen(false);
      setTimeout(() => {
        scrollToBottom(false);
      }, 50);
    },
    [stopSpeech, selectConversation, scrollToBottom]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      stopSpeech();
      await deleteConversation(id);
    },
    [stopSpeech, deleteConversation]
  );

  const groupedConversations = useMemo(() => {
    const groups: Record<DateGroupLabel, ChatConversationSummary[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };
    (conversations || []).forEach((conv) => {
      const group = getConversationDateGroup(conv.updatedAt || conv.createdAt);
      groups[group].push(conv);
    });
    return groups;
  }, [conversations]);

  const currentConfig = modeConfig[mode];

  return (
    <div className="relative w-full h-full min-h-0 flex overflow-hidden">
      {/* Deep space background */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, #0a0c1a 0%, #0f1128 40%, #0d0d20 100%)' }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="absolute w-96 h-96 rounded-full top-20 left-1/2 -translate-x-1/2 glow-orb" style={{ opacity: 0.25 }} />
      </div>

      {/* Desktop History Sidebar */}
      <aside
        aria-label="Chat history sidebar"
        aria-hidden={!isSidebarOpen}
        className={`hidden lg:flex flex-col shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-[rgba(10,12,24,0.60)] backdrop-blur-xl transition-[width,opacity] duration-300 ease-in-out z-20 overflow-hidden ${
          isSidebarOpen ? 'w-64 xl:w-72 opacity-100' : 'w-0 opacity-0 border-none pointer-events-none'
        }`}
      >
        <div className="w-64 xl:w-72 h-full flex flex-col shrink-0">
          <div className="p-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#c0c4ea]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[rgba(232,234,246,0.75)]">History</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              title="Collapse history sidebar"
              aria-label="Collapse history sidebar"
              className="p-1.5 rounded-lg text-[rgba(232,234,246,0.40)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(108,114,232,0.5)] cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <ConversationHistoryList
            groupedConversations={groupedConversations}
            activeConversationId={activeConversationId}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onNewChat={handleNewChat}
          />
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[rgba(13,15,26,0.96)] backdrop-blur-2xl border-r border-[rgba(255,255,255,0.10)] flex flex-col p-3 shadow-2xl"
            >
              <div className="p-2 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between shrink-0 mb-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#c0c4ea]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[rgba(232,234,246,0.75)]">Chat History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  title="Close chat history"
                  aria-label="Close chat history"
                  className="p-1.5 rounded-lg text-[rgba(232,234,246,0.40)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ConversationHistoryList
                groupedConversations={groupedConversations}
                activeConversationId={activeConversationId}
                onSelect={handleSelectConversation}
                onDelete={handleDeleteConversation}
                onNewChat={handleNewChat}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Column */}
      <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden relative">
        <div className="max-w-3xl mx-auto w-full h-full min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 md:px-8 pt-2 sm:pt-4 pb-2">
          {/* Header */}
          <div className="flex justify-between items-center py-2 sm:py-3 mb-2 border-b border-[rgba(255,255,255,0.07)] shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Desktop History Sidebar Toggle (Persistent, Bidirectional) */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                title={isSidebarOpen ? 'Collapse history sidebar' : 'Open history sidebar'}
                aria-label={isSidebarOpen ? 'Collapse history sidebar' : 'Open history sidebar'}
                aria-expanded={isSidebarOpen}
                className="hidden lg:flex p-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.60)] hover:text-white border border-[rgba(255,255,255,0.06)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(108,114,232,0.5)] cursor-pointer"
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
                )}
              </button>

              {/* Mobile History Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                title="Open chat history"
                aria-label="Open chat history"
                aria-expanded={isMobileDrawerOpen}
                className="lg:hidden p-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.60)] hover:text-white border border-[rgba(255,255,255,0.06)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(108,114,232,0.5)] cursor-pointer"
              >
                <History className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentView('dashboard')}
                aria-label="Back to dashboard"
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.50)] hover:text-[rgba(232,234,246,0.85)] border border-[rgba(255,255,255,0.06)] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h1 className="font-display-lg text-lg sm:text-xl text-[rgba(232,234,246,0.90)]">
                    AI Companion
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[rgba(108,114,232,0.15)] hover:bg-[rgba(108,114,232,0.25)] text-[#c0c4ea] hover:text-white border border-[rgba(108,114,232,0.30)] text-xs font-medium transition-all"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={handleToggleVoice}
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
                onClick={handleClearChat}
                className="p-2 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(242,139,130,0.10)] text-[rgba(232,234,246,0.30)] hover:text-[#f28b82] rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(242,139,130,0.25)] transition-all"
                title="Clear Session"
                aria-label="Clear Chat Session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0">
            {(Object.keys(modeConfig) as CompanionMode[]).map((m) => {
              const cfg = modeConfig[m];
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
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

          {/* Active Mode Badge */}
          <div className="mb-2 text-xs text-[rgba(232,234,246,0.30)] flex items-center gap-2 shrink-0">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: currentConfig.color, boxShadow: `0 0 6px ${currentConfig.color}80` }}
            />
            {mode} — {currentConfig.desc}
          </div>

          {/* Messages Scroll Container */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="chat-messages-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 sm:space-y-4 pr-1 mb-2 relative"
          >
            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'
                  }`}
                >
                  {/* Avatar + name + audio trigger row */}
                  <div
                    className={`flex items-center justify-between w-full mb-1.5 ${
                      msg.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          msg.sender === 'companion'
                            ? 'bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)]'
                            : 'bg-[rgba(255,255,255,0.10)]'
                        }`}
                      >
                        {msg.sender === 'companion' ? (
                          <Sparkles className="w-3 h-3 text-white" />
                        ) : (
                          <Bot className="w-3 h-3 text-[rgba(232,234,246,0.60)]" />
                        )}
                      </div>
                      <span className="text-[10px] text-[rgba(232,234,246,0.25)] font-mono">
                        {msg.sender === 'user' ? 'You' : `Companion`} · {msg.timestamp}
                      </span>
                    </div>

                    {msg.sender === 'companion' && (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.text)}
                        className={`p-1 px-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                          currentlySpeakingId === msg.id
                            ? 'text-[#8a8ff4] bg-[rgba(108,114,232,0.25)] border border-[rgba(108,114,232,0.40)]'
                            : 'text-[rgba(232,234,246,0.35)] hover:text-[rgba(232,234,246,0.85)] hover:bg-[rgba(255,255,255,0.06)]'
                        }`}
                        title={currentlySpeakingId === msg.id ? 'Stop audio' : 'Listen to response'}
                        aria-label={currentlySpeakingId === msg.id ? 'Stop audio' : 'Listen to response'}
                      >
                        {currentlySpeakingId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 animate-pulse text-[#8a8ff4]" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    className={`px-4.5 py-3 text-sm leading-relaxed border ${
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
                      transition={{ delay: 0.15 }}
                      className="flex flex-wrap gap-2 mt-2.5 max-w-xs"
                    >
                      {msg.suggestedPathways.map((pathway, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(pathway)}
                          className="bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(108,114,232,0.12)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(108,114,232,0.25)] text-xs italic text-[rgba(192,196,234,0.60)] hover:text-[#c0c4ea] px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 text-left"
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
                className="self-start flex items-center gap-2 text-xs text-[rgba(192,196,234,0.50)] italic py-1"
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

          {/* Floating 'New response' Pill */}
          <AnimatePresence>
            {showNewMessagePill && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                onClick={() => scrollToBottom(true)}
                className="self-center z-30 mb-2 px-3.5 py-1.5 rounded-full bg-[rgba(108,114,232,0.92)] hover:bg-[#6c72e8] text-white text-xs font-medium shadow-[0_4px_20px_rgba(108,114,232,0.50)] backdrop-blur-md flex items-center gap-1.5 transition-all border border-[rgba(255,255,255,0.20)]"
              >
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                <span>New response</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input Bar */}
          <div className="phone-chat-input-container shrink-0 mb-1 sm:mb-2 z-40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-[rgba(13,15,26,0.85)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.10)] p-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.50)] focus-within:border-[rgba(108,114,232,0.30)] transition-all duration-200"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  setTimeout(() => scrollToBottom(true), 250);
                }}
                placeholder="Share what's on your mind..."
                className="flex-1 bg-transparent border-none focus:outline-none text-base sm:text-sm text-[rgba(232,234,246,0.80)] placeholder:text-[rgba(232,234,246,0.25)] px-4 py-2"
              />
              <motion.button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim() || isSending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shadow-[0_4px_16px_rgba(108,114,232,0.40)] shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6c72e8, #5055c8)',
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
