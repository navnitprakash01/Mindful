/**
 * Memory Vault & Proactivity Settings Component
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Provides complete user sovereignty over personal AI memory:
 * - Independent toggles for Personal Memory and Proactive Check-Ins
 * - Server-enforced frequency caps and quiet hours
 * - Transparent Memory Vault view with provenance badges
 * - Individual memory deletion and "Forget All Memories" purge
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Sparkles,
  Trash2,
  Plus,
  Moon,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { PersonalMemory, MemoryCategory } from '../../../server/services/memoryService';
import { ProactiveSettings } from '../../../server/engine/proactiveEngine/types';

export const MemoryVaultSettings: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { showToast } = useApp();

  const [memories, setMemories] = useState<PersonalMemory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [settings, setSettings] = useState<ProactiveSettings>({
    enabled: false,
    frequencyCapPerDay: 1,
    quietHoursStart: 22,
    quietHoursEnd: 8,
  });

  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');
  const [isAdding, setIsAdding] = useState(false);

  // Load memories and settings
  const loadData = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      setIsLoadingMemories(true);
      const [memRes, setRes] = await Promise.all([
        fetch('/api/memory', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/proactive/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (memRes.ok) {
        const memData = await memRes.json();
        setMemories(memData.memories || []);
      }
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.settings) {
          setSettings(setData.settings);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingMemories(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update proactive settings on server
  const handleUpdateProactiveSettings = async (updates: Partial<ProactiveSettings>) => {
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);

    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/proactive/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        showToast('Proactive preferences updated ⚡');
      }
    } catch {
      showToast('Unable to update settings right now.');
    }
  };

  // Add explicit memory
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary.trim()) return;

    try {
      setIsAdding(true);
      const token = await getAccessToken();
      if (!token) return;

      const key = `${newCategory}_${Date.now()}`;
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: newCategory,
          key,
          summary: newSummary.trim(),
          confidence: 0.95,
        }),
      });

      if (res.ok) {
        setNewSummary('');
        showToast('Saved to Personal Memory Vault 🧠');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save memory');
      }
    } catch {
      showToast('Error saving memory');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete individual memory
  const handleDeleteMemory = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/memory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        showToast('Memory forgotten permanently 🗑️');
      }
    } catch {
      showToast('Unable to delete memory');
    }
  };

  // Forget All Memories
  const handleForgetAll = async () => {
    if (!window.confirm('Are you sure you want to forget all personal memories? This action is permanent and cannot be undone.')) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/memory', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMemories([]);
        showToast('All personal memories purged 🧼');
      }
    } catch {
      showToast('Failed to purge memories');
    }
  };

  const getProvenanceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'user_explicit':
        return 'User stated';
      case 'pattern_engine':
        return 'Observed pattern';
      case 'intervention_outcome':
        return 'Learned preference';
      default:
        return 'Context';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Proactive Intelligence Preferences Card */}
      <Card className="p-8 space-y-6 border-[rgba(108,114,232,0.25)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(108,114,232,0.15)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#c0c4ea]" />
          </div>
          <div>
            <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
              Proactive Intelligence
            </h2>
            <p className="text-xs text-[rgba(232,234,246,0.40)] font-body-md mt-0.5">
              Allow Mindful to offer subtle, explainable check-ins when longitudinal evidence justifies outreach.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Master Proactivity Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div>
              <span className="font-medium text-sm text-[rgba(232,234,246,0.90)] block">
                Proactive Check-Ins
              </span>
              <span className="text-xs text-[rgba(232,234,246,0.40)] block mt-0.5">
                Surfaces gentle resets and reflections when recurring patterns or tension are detected.
              </span>
            </div>
            <button
              onClick={() => handleUpdateProactiveSettings({ enabled: !settings.enabled })}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.enabled ? 'bg-[#6c72e8]' : 'bg-[rgba(255,255,255,0.15)]'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Frequency Cap */}
          {settings.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <div>
                <span className="font-medium text-sm text-[rgba(232,234,246,0.85)] block mb-1">
                  Daily Reach-Out Limit
                </span>
                <span className="text-xs text-[rgba(232,234,246,0.40)] block">
                  Prevents notification fatigue. A 6-hour cooldown is always enforced.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleUpdateProactiveSettings({ frequencyCapPerDay: num as 1 | 2 | 3 })}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      settings.frequencyCapPerDay === num
                        ? 'bg-[rgba(108,114,232,0.25)] border-[rgba(108,114,232,0.45)] text-white'
                        : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.50)] hover:text-white'
                    }`}
                  >
                    {num} / day
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quiet Hours */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] gap-3">
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-[#c0c4ea]" />
              <div>
                <span className="font-medium text-sm text-[rgba(232,234,246,0.85)] block">
                  Quiet Hours (Local Time)
                </span>
                <span className="text-xs text-[rgba(232,234,246,0.40)] block">
                  Mindful stays strictly silent during your rest window.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[rgba(232,234,246,0.70)]">
              <span>{settings.quietHoursStart}:00</span>
              <span className="text-[rgba(232,234,246,0.30)]">to</span>
              <span>{settings.quietHoursEnd}:00</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Memory Vault Card */}
      <Card className="p-8 space-y-6 border-[rgba(108,114,232,0.25)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(108,114,232,0.15)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#c0c4ea]" />
            </div>
            <div>
              <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
                Personal AI Memory Vault
              </h2>
              <p className="text-xs text-[rgba(232,234,246,0.40)] font-body-md mt-0.5">
                Bounded, non-clinical context remembered to personalize your support.
              </p>
            </div>
          </div>

          {memories.length > 0 && (
            <Button
              onClick={handleForgetAll}
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Forget All Memories
            </Button>
          )}
        </div>

        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] space-y-3">
          <span className="text-xs font-semibold text-[rgba(232,234,246,0.80)] block">
            Add Personal Preference or Goal
          </span>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] rounded-xl px-3 py-2 text-xs text-[rgba(232,234,246,0.90)] focus:outline-none focus:border-[#6c72e8]"
            >
              <option value="preference" className="bg-[#121424]">Preference</option>
              <option value="goal" className="bg-[#121424]">Goal</option>
              <option value="context" className="bg-[#121424]">Context</option>
            </select>
            <input
              type="text"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="e.g., Prefers short 3-minute midday resets (max 160 chars)"
              maxLength={160}
              className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] rounded-xl px-3.5 py-2 text-xs text-[rgba(232,234,246,0.90)] placeholder-[rgba(232,234,246,0.30)] focus:outline-none focus:border-[#6c72e8]"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAdding || !newSummary.trim()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Remember
            </Button>
          </div>
          <div className="flex justify-between text-[10px] text-[rgba(232,234,246,0.35)]">
            <span>Memory is passive context — never executable instructions.</span>
            <span>{newSummary.length}/160</span>
          </div>
        </form>

        {/* Memories List */}
        <div className="space-y-2.5">
          {isLoadingMemories ? (
            <div className="p-6 text-center text-xs text-[rgba(232,234,246,0.40)]">
              Loading memory vault...
            </div>
          ) : memories.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] space-y-1">
              <p className="text-xs text-[rgba(232,234,246,0.60)]">Your Memory Vault is currently empty.</p>
              <p className="text-[11px] text-[rgba(232,234,246,0.35)]">
                Explicit preferences you save or high-confidence recurring patterns will be organized here.
              </p>
            </div>
          ) : (
            memories.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(108,114,232,0.20)] transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="indigo" className="text-[10px] py-0 px-2 uppercase tracking-wide">
                      {mem.category}
                    </Badge>
                    <span className="text-[10px] text-[rgba(192,196,234,0.60)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full">
                      {getProvenanceLabel(mem.sourceType)}
                    </span>
                    <span className="text-[10px] text-[rgba(232,234,246,0.35)]">
                      {Math.round(mem.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(232,234,246,0.90)] leading-relaxed">
                    {mem.summary}
                  </p>
                  <span className="text-[10px] text-[rgba(232,234,246,0.30)] block">
                    Last observed: {new Date(mem.lastObservedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1.5 rounded-lg text-[rgba(232,234,246,0.30)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Forget this memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
};
