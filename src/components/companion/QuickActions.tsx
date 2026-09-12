import React from 'react';
import { motion } from 'motion/react';
import { useCompanion } from '../../hooks/useCompanion';
import { QuickAction } from '../../types/companion';

export const QuickActions: React.FC = () => {
  const { quickActions, sendMessage, inputValue, setInputValue } = useCompanion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-wrap gap-2"
    >
      {quickActions.map((action: any, i: number) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
          onClick={() => setInputValue(action.prompt)}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(108,114,232,0.10)] text-[rgba(232,234,246,0.70)] hover:text-[#c0c4ea] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(108,114,232,0.30)] text-[11px] font-medium transition-all duration-200 whitespace-nowrap"
          type="button"
        >
          {action.label}
        </motion.button>
      ))}
    </motion.div>
  );
};