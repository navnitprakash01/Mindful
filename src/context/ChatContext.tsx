import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ChatMessage, CompanionMode } from '../types';
import { useAuth } from "./AuthContext";
interface ChatContextType {
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);


const CHAT_STORAGE_KEY = 'mindful_chat_history';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();

  const initialChat: ChatMessage[] = [
    {
      id: "c-1",
      sender: "companion",
      text: `Welcome back to your sanctuary, ${user?.name || "friend"}. I am present with you. How is your inner weather today?`,
      timestamp: "2:14 PM",
      mode: "Empathetic Listener",
      suggestedPathways: [
        "Guide me through a calming breath",
        "Help me reframe this feeling",
        "What patterns do you notice?"
      ]
    },
  ];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
    return initialChat;
  });

  // Sync conversation history to localStorage for persistence across reloads
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      // Ignore quota errors
    }
  }, [chatMessages]);

  const addChatMessage = useCallback(async (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const userMsg: ChatMessage = {
      ...msg,
      id: `c-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Send to backend API
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/gemini/companion` : '/api/gemini/companion';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: msg.text,
          mode: msg.mode || 'Empathetic Listener',
          conversationHistory: chatMessages.slice(-10).map((m) => ({
            sender: m.sender === 'user' ? 'User' : 'Companion',
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.reply) {
        throw new Error("Invalid response format from companion API");
      }

      const companionReply: ChatMessage = {
        id: `c-${Date.now() + 1}`,
        sender: 'companion',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: msg.mode,
        suggestedPathways: data.suggestedPathways || [
          "Help me reframe this thought",
          "Guide me through a calming breath",
          "Explore what triggered this feeling"
        ],
      };
      setChatMessages((prev) => [...prev, companionReply]);
    } catch (err: unknown) {
      console.error("Companion chat error:", err);
      const errorReply: ChatMessage = {
        id: `c-${Date.now() + 1}`,
        sender: 'companion',
        text: "I'm having trouble connecting to your companion right now. Please check your connection and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: msg.mode,
        suggestedPathways: ["Try again", "Guide me through a calming breath"],
      };
      setChatMessages((prev) => [...prev, errorReply]);
    }
  }, [chatMessages, session?.access_token]);

  const clearChat = useCallback(() => {
    setChatMessages(initialChat);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [initialChat]);

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