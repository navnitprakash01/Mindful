import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, ChatConversation, ChatConversationSummary, CompanionMode } from '../types';
import { useAuth } from './AuthContext';

export interface ChatContextType {
  chatMessages: ChatMessage[];
  conversations: ChatConversationSummary[];
  activeConversationId: string | null;
  isHistoryLoading: boolean;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage | null>;
  clearChat: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const STORAGE_KEY_CONVERSATIONS = 'mindful_companion_conversations_v2';
export const STORAGE_KEY_ACTIVE_ID = 'mindful_companion_active_id_v2';

export function generateConversationTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Reflective Conversation';
  if (cleaned.length <= 40) return cleaned;

  const words = cleaned.split(' ');
  let title = '';
  for (const word of words) {
    if ((title + (title ? ' ' : '') + word).length > 37) break;
    title += (title ? ' ' : '') + word;
  }
  return title.length < cleaned.length ? `${title}...` : title;
}

export type DateGroupLabel = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export function getConversationDateGroup(dateInput: string | number | Date): DateGroupLabel {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Older';

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7DaysAgo = startOfToday - 7 * 86400000;

    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    if (itemDay >= startOfToday) return 'Today';
    if (itemDay >= startOfYesterday) return 'Yesterday';
    if (itemDay >= startOf7DaysAgo) return 'Previous 7 Days';
    return 'Older';
  } catch {
    return 'Older';
  }
}

export const createInitialGreeting = (userName?: string): ChatMessage => ({
  id: `welcome-${Date.now()}`,
  sender: 'companion',
  text: `Welcome back to your sanctuary, ${userName || 'friend'}. I am present with you. How is your inner weather today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  mode: 'Empathetic Listener',
  suggestedPathways: [
    'Guide me through a calming breath',
    'Help me reframe this feeling',
    'What patterns do you notice?',
  ],
});


export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();

  const [conversationsMap, setConversationsMap] = useState<Record<string, ChatConversation>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map: Record<string, ChatConversation> = {};
          parsed.forEach((c: ChatConversation) => {
            if (c && c.id) map[c.id] = c;
          });
          return map;
        }
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      return savedId || null;
    } catch {
      return null;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      const savedConvs = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      if (savedId && savedConvs) {
        const parsed: ChatConversation[] = JSON.parse(savedConvs);
        const match = parsed.find((c) => c.id === savedId);
        if (match && Array.isArray(match.messages) && match.messages.length > 0) {
          return match.messages;
        }
      }
    } catch {
      // Ignore
    }
    return [createInitialGreeting(user?.name)];
  });

  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const activeConvIdRef = useRef<string | null>(activeConversationId);
  activeConvIdRef.current = activeConversationId;

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    try {
      const list = (Object.values(conversationsMap) as ChatConversation[]).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }
  }, [conversationsMap]);

  // Persist active ID to localStorage
  useEffect(() => {
    try {
      if (activeConversationId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeConversationId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
      }
    } catch {
      // Ignore
    }
  }, [activeConversationId]);

  // Sync with backend on authentication
  useEffect(() => {
    const fetchBackendConversations = async () => {
      if (!session?.access_token) return;
      try {
        setIsHistoryLoading(true);
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/companion/conversations`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.conversations)) {
            setConversationsMap((prev) => {
              const updated = { ...prev };
              data.conversations.forEach((bc: any) => {
                const existing = updated[bc.id];
                updated[bc.id] = {
                  id: bc.id,
                  title: bc.title || 'Conversation',
                  createdAt: bc.created_at || new Date().toISOString(),
                  updatedAt: bc.updated_at || bc.created_at || new Date().toISOString(),
                  messages: existing?.messages || [],
                };
              });
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Failed to sync companion conversations with server:', err);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchBackendConversations();
  }, [session?.access_token]);

  // Start a fresh, unpersisted conversation draft
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    activeConvIdRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    } catch {
      // Ignore
    }
    setChatMessages([createInitialGreeting(user?.name)]);
  }, [user?.name]);

  // Switch to an existing conversation
  const selectConversation = useCallback(
    async (id: string) => {
      const conv = conversationsMap[id];
      if (!conv) return;

      setActiveConversationId(id);
      activeConvIdRef.current = id;
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
      } catch {
        // Ignore
      }

      // If we already have cached messages in state, show them immediately
      if (conv.messages && conv.messages.length > 0) {
        setChatMessages(conv.messages);
      } else {
        setChatMessages([createInitialGreeting(user?.name)]);
      }

      // If user is authenticated, refresh messages from backend
      if (session?.access_token) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${baseUrl}/api/companion/conversations/${id}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.messages) && data.messages.length > 0) {
              const formatted: ChatMessage[] = data.messages.map((m: any) => ({
                id: m.id || `m-${Date.now()}`,
                sender: m.role === 'user' ? 'user' : 'companion',
                text: m.content || '',
                timestamp: m.created_at
                  ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '',
                mode: m.metadata?.mode,
                suggestedPathways: m.metadata?.suggestedPathways,
              }));

              if (activeConvIdRef.current === id) {
                setChatMessages(formatted);
              }
              setConversationsMap((prev) => ({
                ...prev,
                [id]: {
                  ...prev[id],
                  messages: formatted,
                },
              }));
            }
          }
        } catch (err) {
          console.warn('Failed to load conversation messages:', err);
        }
      }
    },
    [conversationsMap, session?.access_token, user?.name]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      setConversationsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      if (activeConvIdRef.current === id) {
        startNewConversation();
      }

      if (session?.access_token) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || '';
          await fetch(`${baseUrl}/api/companion/conversations/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        } catch (err) {
          console.warn('Failed to delete conversation on server:', err);
        }
      }
    },
    [session?.access_token, startNewConversation]
  );

  // Add message
  const addChatMessage = useCallback(
    async (msg: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage | null> => {
      const userMsg: ChatMessage = {
        ...msg,
        id: `c-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      let currentConvId = activeConvIdRef.current;
      const nowIso = new Date().toISOString();

      // If active conversation is null or not in map, create new conversation
      if (!currentConvId || !conversationsMap[currentConvId]) {
        currentConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const title = generateConversationTitle(msg.text);

        const newConv: ChatConversation = {
          id: currentConvId,
          title,
          createdAt: nowIso,
          updatedAt: nowIso,
          messages: [userMsg],
        };

        setActiveConversationId(currentConvId);
        activeConvIdRef.current = currentConvId;
        setConversationsMap((prev) => ({
          [currentConvId as string]: newConv,
          ...prev,
        }));
        setChatMessages([userMsg]);

        // Background sync to backend if authenticated
        if (session?.access_token) {
          (async () => {
            try {
              const baseUrl = import.meta.env.VITE_API_URL || '';
              const cRes = await fetch(`${baseUrl}/api/companion/conversations`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ firstUserMessage: msg.text }),
              });
              if (cRes.ok) {
                const serverConv = await cRes.json();
                if (serverConv?.id) {
                  await fetch(`${baseUrl}/api/companion/conversations/${serverConv.id}/messages`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      conversationId: serverConv.id,
                      role: 'user',
                      content: msg.text,
                      metadata: { mode: msg.mode },
                    }),
                  });
                }
              }
            } catch (e) {
              console.warn('Background server conversation sync failed:', e);
            }
          })();
        }
      } else {
        // Existing conversation
        const activeConv = conversationsMap[currentConvId];
        const updatedMessages = [...(activeConv?.messages || chatMessages), userMsg];
        setChatMessages(updatedMessages);
        setConversationsMap((prev) => ({
          ...prev,
          [currentConvId as string]: {
            ...prev[currentConvId as string],
            updatedAt: nowIso,
            messages: updatedMessages,
          },
        }));

        if (session?.access_token) {
          (async () => {
            try {
              const baseUrl = import.meta.env.VITE_API_URL || '';
              await fetch(`${baseUrl}/api/companion/conversations/${currentConvId}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  conversationId: currentConvId,
                  role: 'user',
                  content: msg.text,
                  metadata: { mode: msg.mode },
                }),
              });
            } catch (e) {
              console.warn('Background server message sync failed:', e);
            }
          })();
        }
      }

      // Send to companion API
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const endpoint = baseUrl ? `${baseUrl}/api/gemini/companion` : '/api/gemini/companion';

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const historyForPrompt = chatMessages.slice(-10).map((m) => ({
          sender: m.sender === 'user' ? 'User' : 'Companion',
          text: m.text,
        }));

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: msg.text,
            mode: msg.mode || 'Empathetic Listener',
            conversationHistory: historyForPrompt,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.reply) {
          throw new Error('Invalid response format from companion API');
        }

        const companionReply: ChatMessage = {
          id: `c-${Date.now() + 1}`,
          sender: 'companion',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: msg.mode,
          suggestedPathways: data.suggestedPathways || data.suggestions || [
            'Help me reframe this thought',
            'Guide me through a calming breath',
            'Explore what triggered this feeling',
          ],
        };

        const targetConvId = currentConvId;
        setChatMessages((prev) => {
          if (activeConvIdRef.current === targetConvId) {
            return [...prev, companionReply];
          }
          return prev;
        });

        setConversationsMap((prev) => {
          const existing = prev[targetConvId];
          if (!existing) return prev;
          return {
            ...prev,
            [targetConvId]: {
              ...existing,
              updatedAt: new Date().toISOString(),
              messages: [...existing.messages, companionReply],
            },
          };
        });

        if (session?.access_token) {
          (async () => {
            try {
              const baseUrl = import.meta.env.VITE_API_URL || '';
              await fetch(`${baseUrl}/api/companion/conversations/${targetConvId}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  conversationId: targetConvId,
                  role: 'assistant',
                  content: companionReply.text,
                  metadata: {
                    mode: companionReply.mode,
                    suggestedPathways: companionReply.suggestedPathways,
                  },
                }),
              });
            } catch (e) {
              console.warn('Background server reply sync failed:', e);
            }
          })();
        }

        return companionReply;
      } catch (err: unknown) {
        console.error('Companion chat error:', err);
        const errorReply: ChatMessage = {
          id: `c-${Date.now() + 1}`,
          sender: 'companion',
          text: "I'm having trouble connecting to your companion right now. Please check your connection and try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: msg.mode,
          suggestedPathways: ['Try again', 'Guide me through a calming breath'],
        };

        const targetConvId = currentConvId;
        setChatMessages((prev) => {
          if (activeConvIdRef.current === targetConvId) {
            return [...prev, errorReply];
          }
          return prev;
        });

        setConversationsMap((prev) => {
          const existing = prev[targetConvId];
          if (!existing) return prev;
          return {
            ...prev,
            [targetConvId]: {
              ...existing,
              updatedAt: new Date().toISOString(),
              messages: [...existing.messages, errorReply],
            },
          };
        });

        return errorReply;
      }
    },
    [chatMessages, conversationsMap, session?.access_token]
  );

  const clearChat = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

  const conversationSummaries: ChatConversationSummary[] = (Object.values(conversationsMap) as ChatConversation[])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.[c.messages.length - 1]?.text,
    }));

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        conversations: conversationSummaries,
        activeConversationId,
        isHistoryLoading,
        addChatMessage,
        clearChat,
        startNewConversation,
        selectConversation,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};