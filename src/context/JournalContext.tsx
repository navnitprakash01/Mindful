import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '../types';
import { useAuth } from './AuthContext';

interface JournalContextType {
  journalEntries: JournalEntry[];
  isJournalLoading: boolean;
  isJournalSaving: boolean;
  journalError: string | null;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'wordCount'>) => Promise<JournalEntry | null>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  deleteJournalEntry: (id: string) => Promise<boolean>;
  toggleFavoriteEntry: (id: string) => Promise<JournalEntry | null>;
  refreshJournalEntries: () => Promise<void>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

const API_BASE = '/api/journals';

export const JournalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isJournalLoading, setIsJournalLoading] = useState(true);
  const [isJournalSaving, setIsJournalSaving] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);

  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }

  function mapApiEntryToEntry(apiEntry: {
    id: string;
    createdAt: string;
    title: string;
    content: string;
    tags: string[];
    mood: string;
    moodScore: number;
    emotion?: string;
    aiSummary?: string;
    aiAnalysis?: string;
    favorite: boolean;
    wordCount: number;
  }): JournalEntry {
    return {
      id: apiEntry.id,
      createdAt: apiEntry.createdAt,
      title: apiEntry.title,
      content: apiEntry.content,
      tags: apiEntry.tags,
      mood: apiEntry.mood,
      moodScore: apiEntry.moodScore,
      emotion: apiEntry.emotion,
      aiSummary: apiEntry.aiSummary,
      aiAnalysis: apiEntry.aiAnalysis,
      favorite: apiEntry.favorite,
      wordCount: apiEntry.wordCount,
    };
  }

  const loadEntries = useCallback(async () => {
    if (!user) {
      setJournalEntries([]);
      setIsJournalLoading(false);
      return;
    }
    setIsJournalLoading(true);
    setJournalError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}?pageSize=50`);
      if (!response.ok) {
        throw new Error('Failed to load journal entries');
      }
      const data = await response.json();
      setJournalEntries((data.entries || []).map(mapApiEntryToEntry));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load journal entries';
      setJournalError(message);
      setJournalEntries([]);
    } finally {
      setIsJournalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addJournalEntry = useCallback(async (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'wordCount'>) => {
    if (!user) return null;
    setIsJournalSaving(true);
    setJournalError(null);
    try {
      const response = await fetchWithAuth(API_BASE, {
        method: 'POST',
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
          tags: entry.tags,
          mood: entry.mood,
          moodScore: entry.moodScore,
          emotion: entry.emotion,
          aiSummary: entry.aiSummary,
          aiAnalysis: entry.aiAnalysis,
          favorite: entry.favorite,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save journal entry');
      }
      const newEntry = await response.json();
      const mapped = mapApiEntryToEntry(newEntry);
      setJournalEntries((prev) => [mapped, ...prev]);
      return mapped;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save journal entry';
      setJournalError(message);
      return null;
    } finally {
      setIsJournalSaving(false);
    }
  }, [user]);

  const updateJournalEntry = useCallback(async (id: string, updates: Partial<JournalEntry>) => {
    if (!user) return null;
    setIsJournalSaving(true);
    setJournalError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.mood !== undefined) payload.mood = updates.mood;
      if (updates.moodScore !== undefined) payload.moodScore = updates.moodScore;
      if (updates.emotion !== undefined) payload.emotion = updates.emotion;
      if (updates.aiSummary !== undefined) payload.aiSummary = updates.aiSummary;
      if (updates.aiAnalysis !== undefined) payload.aiAnalysis = updates.aiAnalysis;
      if (updates.favorite !== undefined) payload.favorite = updates.favorite;

      const response = await fetchWithAuth(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Journal entry not found');
        throw new Error('Failed to update journal entry');
      }
      const updated = await response.json();
      const mapped = mapApiEntryToEntry(updated);
      setJournalEntries((prev) => prev.map((e) => (e.id === id ? mapped : e)));
      return mapped;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update journal entry';
      setJournalError(message);
      return null;
    } finally {
      setIsJournalSaving(false);
    }
  }, [user]);

  const deleteJournalEntry = useCallback(async (id: string) => {
    if (!user) return false;
    setJournalError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Journal entry not found');
        throw new Error('Failed to delete journal entry');
      }
      setJournalEntries((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete journal entry';
      setJournalError(message);
      return false;
    }
  }, [user]);

  const toggleFavoriteEntry = useCallback(async (id: string) => {
    if (!user) return null;
    setJournalError(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/${id}/favorite`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Journal entry not found');
        throw new Error('Failed to toggle favorite');
      }
      const updated = await response.json();
      const mapped = mapApiEntryToEntry(updated);
      setJournalEntries((prev) => prev.map((e) => (e.id === id ? mapped : e)));
      return mapped;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle favorite';
      setJournalError(message);
      return null;
    }
  }, [user]);

  return (
    <JournalContext.Provider
      value={{
        journalEntries,
        isJournalLoading,
        isJournalSaving,
        journalError,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        toggleFavoriteEntry,
        refreshJournalEntries: loadEntries,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal must be used within a JournalProvider');
  return context;
};