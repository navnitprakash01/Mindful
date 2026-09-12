import React, { memo } from 'react';
import { motion } from 'motion/react';

interface WelcomeCardProps {
  onQuickAction: (prompt: string) => void;
}

const quickActions = [
  { id: 'reflect', label: 'Reflect', prompt: 'Help me reflect on my day and process what happened.' },
  { id: 'stress', label: 'Reduce Stress', prompt: 'I\'m feeling overwhelmed. Guide me through a calming practice.' },
  { id: 'motivation', label: 'Motivation', prompt: 'I need some motivation. Help me reframe this challenge.' },
  { id: 'gratitude', label: 'Gratitude', prompt: 'Help me practice gratitude and shift my perspective.' },
  { id: 'sleep', label: 'Sleep Better', prompt: 'I\'m having trouble sleeping. Guide me through a wind-down routine.' },
];

export const WelcomeCard = memo(function WelcomeCard({ onQuickAction }: WelcomeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-display-lg text-lg text-[rgba(232,234,246,0.90)]">Good Evening</h3>
          <p className="text-[rgba(192,196,234,0.70)] text-sm mt-0.5">
            I'm here whenever you need someone to talk to.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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
});

WelcomeCard.displayName = 'WelcomeCard';