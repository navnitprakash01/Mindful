import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const EmptyState: React.FC<{ onQuickAction?: (prompt: string) => void }> = ({ onQuickAction }) => {
  const quickActions = [
    { id: 'reflect', label: 'Reflect', prompt: 'Help me reflect on my day and process my thoughts.' },
    { id: 'stress', label: 'Reduce Stress', prompt: 'I feel overwhelmed. Can you guide me through a calming practice?' },
    { id: 'motivation', label: 'Motivation', prompt: 'I need some encouragement to stay focused on my goals.' },
    { id: 'gratitude', label: 'Gratitude', prompt: 'Help me cultivate a sense of gratitude today.' },
    { id: 'sleep', label: 'Sleep Better', prompt: 'I\'m having trouble sleeping. Can you suggest a wind-down routine?' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[rgba(108,114,232,0.15)] to-[rgba(192,196,234,0.08)] flex items-center justify-center mb-6"
      >
        <Sparkles className="w-10 h-10 text-[rgba(108,114,232,0.80)]" />
      </motion.div>

      <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)] mb-2">
        AI Companion
      </h3>
      <p className="text-[rgba(192,196,234,0.60)] text-sm max-w-xs mx-auto mb-6">
        Start a conversation or use one of the suggested prompts.
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            onClick={() => onQuickAction?.(action.prompt)}
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