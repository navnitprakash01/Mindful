import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatMessage, CompanionMode } from '../types';

interface ChatContextType {
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const initialChat: ChatMessage[] = [
  {
    id: "c-1",
    sender: "companion",
    text: "Welcome back to your sanctuary, ${userProfile.name}. I am present with you. How is your inner weather today?",
    timestamp: "2:14 PM",
    mode: "Empathetic Listener",
    suggestedPathways: [
      "Guide me through a calming breath",
      "Help me reframe this feeling",
      "What patterns do you notice?"
    ]
  },
];

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChat);

  const addChatMessage = useCallback(async (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const userMsg: ChatMessage = {
      ...msg,
      id: `c-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Send to backend API
    try {
      const response = await fetch('/api/gemini/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.text,
          mode: msg.mode || 'Empathetic Listener',
          conversationHistory: chatMessages.map((m) => ({
            sender: m.sender === 'user' ? 'User' : 'Companion',
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      const companionReply: ChatMessage = {
        id: `c-${Date.now() + 1}`,
        sender: 'companion',
        text: data.reply || "I am present with you. Take a slow breath.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: msg.mode,
        suggestedPathways: data.suggestedPathways || [
          "Help me reframe this thought",
          "Guide me through 3 slow breaths",
          "Explore what triggered this feeling"
        ],
      };
      setChatMessages((prev) => [...prev, companionReply]);
    } catch {
      const fallbackReply: ChatMessage = {
        id: `c-${Date.now() + 1}`,
        sender: 'companion',
        text: "I hear you deeply. Take a slow, grounding breath. What is one small weight you can release right now?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: msg.mode,
        suggestedPathways: ["Guide me through a breath", "Reframe this thought"],
      };
      setChatMessages((prev) => [...prev, fallbackReply]);
    }
  }, [chatMessages]);

  const clearChat = useCallback(() => {
    setChatMessages(initialChat);
  }, []);

  return (
    <ChatContext.Provider value={{ chatMessages, addChatMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};