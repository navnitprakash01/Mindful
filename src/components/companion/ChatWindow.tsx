import React, { memo } from 'react';
import { useCompanion } from '../../hooks/useCompanion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

export const ChatWindow: React.FC = () => {
  const { messages, isLoading, messagesEndRef, scrollToBottom } = useCompanion();

  return (
    <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-5">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
};

ChatWindow.displayName = 'ChatWindow';