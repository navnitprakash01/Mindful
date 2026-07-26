import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 15, scale: 0.90 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.15)] text-[rgba(232,234,246,0.90)] px-5 py-3 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.50)] backdrop-blur-[24px] flex items-center gap-3 text-sm font-medium tracking-wide"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(232,121,154,0.30)] flex items-center justify-center shadow-[0_0_12px_rgba(108,114,232,0.40)]">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
