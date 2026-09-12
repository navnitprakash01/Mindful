import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';

export type VoiceStatus = 'idle' | 'recording' | 'processing' | 'error' | 'permission_denied';

interface VoiceButtonProps {
  status?: VoiceStatus;
  isRecording?: boolean; // Backwards compatible
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  status = 'idle',
  isRecording = false,
  onClick,
  disabled = false,
  errorMessage,
}) => {
  // Determine effective status
  const currentStatus: VoiceStatus = isRecording ? 'recording' : (status as VoiceStatus);

  const getButtonStyles = () => {
    switch (currentStatus) {
      case 'recording':
        return 'bg-gradient-to-br from-[#e8799a] to-[#fbbf24] shadow-[0_0_24px_rgba(232,121,154,0.50)] ring-2 ring-[#e8799a]/50';
      case 'processing':
        return 'bg-[rgba(108,114,232,0.25)] border border-[rgba(108,114,232,0.40)] text-[#c0c4ea]';
      case 'permission_denied':
      case 'error':
        return 'bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.30)] text-[#f87171]';
      case 'idle':
      default:
        return 'bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.75)]';
    }
  };

  const getAriaLabel = () => {
    switch (currentStatus) {
      case 'recording':
        return 'Stop voice recording';
      case 'processing':
        return 'Processing voice reflection';
      case 'permission_denied':
        return 'Microphone permission denied';
      case 'error':
        return 'Voice error';
      case 'idle':
      default:
        return 'Start voice reflection';
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled || currentStatus === 'processing'}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${getButtonStyles()}`}
        aria-label={getAriaLabel()}
        aria-pressed={currentStatus === 'recording'}
        title={errorMessage || getAriaLabel()}
      >
        <AnimatePresence mode="wait">
          {currentStatus === 'recording' && (
            <motion.div
              key="recording"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-1 text-white"
            >
              <span className="text-[11px] font-semibold tracking-wider">REC</span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full bg-white"
              />
            </motion.div>
          )}

          {currentStatus === 'processing' && (
            <motion.div
              key="processing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Loader2 className="w-5 h-5 animate-spin text-[#c0c4ea]" />
            </motion.div>
          )}

          {(currentStatus === 'error' || currentStatus === 'permission_denied') && (
            <motion.div
              key="error"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <AlertCircle className="w-5 h-5 text-[#f87171]" />
            </motion.div>
          )}

          {currentStatus === 'idle' && (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Mic className="w-5 h-5 text-[rgba(232,234,246,0.75)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {currentStatus === 'recording' && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-white/40 pointer-events-none"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.button>
    </div>
  );
};