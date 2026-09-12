import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Bot } from 'lucide-react';
import { ConversationMessage } from '../../types/companion';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const time = message.timestamp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
    >
      <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
          isUser
            ? 'bg-[rgba(255,255,255,0.10)]'
            : 'bg-gradient-to-br from-[rgba(108,114,232,0.50)] to-[rgba(192,196,234,0.25)]'
        }`}>
          {isUser ? (
            <Bot className="w-3 h-3 text-[rgba(232,234,246,0.60)]" />
          ) : (
            <Sparkles className="w-3 h-3 text-white" />
          )}
        </div>
        <span className="text-[10px] text-[rgba(232,234,246,0.25)] font-mono">
          {isUser ? 'You' : 'Companion'} · {time}
        </span>
      </div>

      <div
        className={`px-5 py-3.5 text-sm leading-relaxed border ${
          isUser
            ? 'bg-[rgba(108,114,232,0.15)] border-[rgba(108,114,232,0.25)] text-[rgba(192,196,234,0.90)] rounded-[20px] rounded-tr-sm'
            : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.80)] rounded-[20px] rounded-tl-sm shadow-[0_8px_24px_rgba(0,0,0,0.30)]'
        }`}
      >
        <p>{message.content}</p>
      </div>

      {message.status === 'sending' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[rgba(192,196,234,0.40)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, delay: 0, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[rgba(192,196,234,0.40)]"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, delay: 0.15, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[rgba(192,196,234,0.40)]"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, delay: 0.3, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[rgba(192,196,234,0.40)]"
          />
        </motion.div>
      )}
    </motion.div>
  );
};