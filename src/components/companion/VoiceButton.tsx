import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ 
  isRecording, 
  onClick, 
  disabled = false 
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.92 }}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shadow-[0_4px_16px_rgba(108,114,232,0.40)] ${
        isRecording
          ? 'bg-[#e8799a] animate-pulse ring-2 ring-[#e8799a]/50'
          : 'bg-gradient-to-br from-[#6c72e8] to-[#5055c8] hover:from-[#5055c8] hover:to-[#3b3db5]'
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
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-white/80"
            />
            <span className="text-xs font-medium">REC</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <Mic className="w-5 h-5 text-white" />
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
    </motion.button>
  );
};