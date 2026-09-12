import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, AlertCircle } from 'lucide-react';
import { useCompanion } from '../../hooks/useCompanion';
import { useAuth } from '../../context/AuthContext';
import { VoiceButton, VoiceStatus } from './VoiceButton';
import { ClientVoiceAnalyzer } from '../../lib/voice/audioAnalyzer';

export const ChatInput: React.FC = () => {
  const {
    inputValue,
    setInputValue,
    sendMessage,
    isLoading,
  } = useCompanion();

  const { session } = useAuth();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analyzerRef = useRef<ClientVoiceAnalyzer | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [crisisNotice, setCrisisNotice] = useState<string | null>(null);

  // Initialize analyzer ref
  if (!analyzerRef.current) {
    analyzerRef.current = new ClientVoiceAnalyzer();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      analyzerRef.current?.cancel();
    };
  }, []);

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
    if (!inputValue.trim() || isLoading || voiceStatus === 'recording') return;
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading && voiceStatus !== 'recording') sendMessage();
    }
  };

  const handleVoiceToggle = async () => {
    setVoiceError(null);
    setCrisisNotice(null);

    // Stop recording
    if (voiceStatus === 'recording') {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setVoiceStatus('processing');

      try {
        const result = await analyzerRef.current?.stop(inputValue);

        if (result && result.success && result.metrics) {
          // Send acoustic metrics and transcript to backend for State Engine ingestion
          const token = session?.access_token;
          const res = await fetch('/api/voice/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              metrics: result.metrics,
              transcript: result.transcript || inputValue,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.isCrisisDetected && data.helplineNotice) {
              setCrisisNotice(data.helplineNotice);
            }
          }
        } else if (result && !result.success) {
          if (result.errorCode === 'TOO_SHORT') {
            setVoiceError('Reflection was too brief. Please speak for at least 2 seconds.');
          } else {
            setVoiceError(result.error || 'Could not analyze voice reflection.');
          }
        }
      } catch (err: any) {
        console.error('[ChatInput] Voice analysis error:', err);
        setVoiceError('Failed to process voice reflection.');
      } finally {
        setVoiceStatus('idle');
        setRecordingSeconds(0);
      }
      return;
    }

    // Start recording
    if (voiceStatus === 'idle' || voiceStatus === 'error' || voiceStatus === 'permission_denied') {
      try {
        setRecordingSeconds(0);
        setVoiceStatus('recording');

        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        await analyzerRef.current?.start({
          onTranscriptChange: (text) => {
            if (text) {
              setInputValue(text);
            }
          },
        });
      } catch (err: any) {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        if (err.message?.includes('PERMISSION_DENIED')) {
          setVoiceStatus('permission_denied');
          setVoiceError('Microphone permission was declined. Please enable microphone access.');
        } else if (err.message?.includes('UNSUPPORTED')) {
          setVoiceStatus('error');
          setVoiceError('Microphone access is not supported by your browser.');
        } else {
          setVoiceStatus('error');
          setVoiceError(err.message || 'Could not start microphone.');
        }
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <form onSubmit={handleSubmit} className="sticky bottom-6 z-10 space-y-2">
      {/* Crisis Warning Banner if triggered */}
      {crisisNotice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto p-4 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.30)] text-xs text-red-200 space-y-1.5 shadow-xl"
        >
          <div className="font-semibold flex items-center gap-1.5 text-red-300">
            <AlertCircle className="w-4 h-4" /> Immediate Support Resources
          </div>
          <p className="whitespace-pre-line leading-relaxed">{crisisNotice}</p>
        </motion.div>
      )}

      {/* Voice Status / Error Banner */}
      {voiceError && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto px-4 py-2 rounded-xl bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-[11px] text-[#f87171] flex items-center justify-between"
        >
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-xs hover:text-white"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Main Input Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-2 bg-[rgba(13,15,26,0.85)] backdrop-blur-[32px] border border-[rgba(255,255,255,0.10)] p-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.50)] focus-within:border-[rgba(108,114,232,0.30)] transition-all duration-200">
          {/* Interactive Voice Button */}
          <VoiceButton
            status={voiceStatus}
            onClick={handleVoiceToggle}
            disabled={isLoading}
            errorMessage={voiceError || undefined}
          />

          {/* Recording Status / Text Area */}
          {voiceStatus === 'recording' ? (
            <div className="flex-1 flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e8799a] animate-ping" />
                <span className="text-xs text-[rgba(232,234,246,0.90)] font-medium">
                  Listening… Speak your reflection aloud
                </span>
              </div>
              <span className="font-mono text-xs text-[#e8799a] font-semibold">
                {formatSeconds(recordingSeconds)}
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceStatus === 'processing'
                  ? 'Understanding your reflection…'
                  : "Share what's on your mind or tap the mic..."
              }
              disabled={isLoading || voiceStatus === 'processing'}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[rgba(232,234,246,0.80)] placeholder:text-[rgba(232,234,246,0.25)] px-4 py-2.5 resize-none disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '160px' }}
              rows={1}
            />
          )}

          {inputValue && voiceStatus !== 'recording' && (
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
            disabled={!inputValue.trim() || isLoading || voiceStatus === 'recording'}
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