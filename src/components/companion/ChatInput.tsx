import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, X } from 'lucide-react';
import { useCompanion } from '../../hooks/useCompanion';
import { Button } from '../ui/Button';

export const ChatInput: React.FC = () => {
  const { 
    inputValue, 
    setInputValue, 
    isRecording, 
    setIsRecording, 
    voiceEnabled, 
    setVoiceEnabled, 
    sendMessage, 
    isLoading,
    clearConversation 
  } = useCompanion();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) sendMessage();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTimeout(() => setIsRecording(false), 3000);
    }
  };

return (
    <form onSubmit={handleSubmit} className="sticky bottom-6 z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-2 bg-[rgba(13,15,26,0.85)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.10)] p-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.50)] focus-within:border-[rgba(108,114,232,0.30)] transition-all duration-200">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-gradient-to-br from-[#e8799a] to-[#fbbf24] shadow-[0_0_24px_rgba(232,121,154,0.50)]'
                : 'bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.08)]'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            aria-pressed={isRecording}
          >
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1 text-white"
                >
                  <span className="text-xs font-medium">REC</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-1.5 h-1.5 rounded-full bg-white/80"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Mic className="w-5 h-5 text-[rgba(232,234,246,0.70)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-white/40"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[rgba(232,234,246,0.80)] placeholder:text-[rgba(232,234,246,0.25)] px-4 py-2.5 resize-none"
            style={{ minHeight: '44px', maxHeight: '160px' }}
            rows={1}
          />

          {inputValue && (
            <motion.button
              type="button"
              onClick={() => setInputValue('')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 text-[rgba(232,234,246,0.40)] hover:text-[rgba(232,234,246,0.80)] rounded-lg transition-colors"
              aria-label="Clear input"
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}

          <motion.button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.92 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shadow-[0_4px_16px_rgba(108,114,232,0.40)]"
            style={{
              background: 'linear-gradient(135deg, #6c72e8, #5055c8)',
            }}
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </motion.div>
    </form>
  );
};

ChatInput.displayName = 'ChatInput';