import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConversationMessage, QuickAction } from '../types/companion';

const initialQuickActions: QuickAction[] = [
  { id: '1', label: 'Reflect', prompt: 'Help me reflect on my day and what I learned.' },
  { id: '2', label: 'Reduce Stress', prompt: 'I\'m feeling stressed. Guide me through a calming practice.' },
  { id: '3', label: 'Motivation', prompt: 'I need some motivation to get through my tasks.' },
  { id: '4', label: 'Gratitude', prompt: 'Help me cultivate gratitude for what I have.' },
  { id: '5', label: 'Sleep Better', prompt: 'I want to improve my sleep quality tonight.' },
];

const initialMessages: import('../types/companion').ConversationMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm your AI Companion. How are you feeling today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'sent',
  },
];

export const useCompanion = () => {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<import('../types/companion').ConversationMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentMode, setCurrentMode] = useState('Empathetic Listener');
  const [quickActions] = useState<QuickAction[]>(initialQuickActions);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (content?: string) => {
    const messageContent = content || inputValue;
    if (!messageContent?.trim() || isLoading) return;

    const userMessage: import('../types/companion').ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const accessToken = session?.access_token;
      const response = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          message: messageContent.trim(),
          conversation: conversationHistory,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Update user message status to sent
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: 'sent' as const } : msg
      ));

      // Add assistant response
      const assistantMessage: import('../types/companion').ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
        suggestedPathways: data.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update user message to error state
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: 'error' as const } : msg
      ));
      
      // Show error message
      const errorMessage: import('../types/companion').ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, user?.id]);

  const clearConversation = useCallback(() => {
    setMessages(initialMessages);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    isRecording,
    setIsRecording,
    voiceEnabled,
    setVoiceEnabled,
    currentMode,
    setCurrentMode,
    quickActions,
    sendMessage,
clearConversation,
    messagesEndRef,
    scrollToBottom,
  };
};