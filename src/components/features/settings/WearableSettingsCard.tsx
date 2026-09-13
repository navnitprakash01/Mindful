/**
 * Wearable Settings Card
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Provides complete user sovereignty over wearable data:
 * - Master opt-in toggle (default OFF)
 * - Granular category consent (Sleep, Heart Rate/HRV, Activity)
 * - Transparent status & sync timestamp
 * - One-click "Disconnect & Delete Wearable History" data purge
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Watch,
  Heart,
  Moon,
  Activity,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { WearableSettings, DEFAULT_WEARABLE_SETTINGS } from '../../../server/engine/wearable/types';

export const WearableSettingsCard: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { showToast } = useApp();

  const [settings, setSettings] = useState<WearableSettings>(DEFAULT_WEARABLE_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      setIsLoading(true);
      const res = await fetch('/api/wearable/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.settings) {
          setSettings(data.settings);
        }
      }
    } catch {
      // Graceful fallback to default settings
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettingsOnServer = async (updates: Partial<WearableSettings>) => {
    const nextSettings = { ...settings, ...updates };
    setSettings(nextSettings);

    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/wearable/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        showToast('Failed to update wearable settings', 'error');
        loadSettings();
      } else {
        showToast('Wearable settings updated', 'success');
      }
    } catch {
      showToast('Network error updating wearable settings', 'error');
      loadSettings();
    }
  };

  const handleToggleCategory = (category: 'sleep' | 'heartRateHrv' | 'activity') => {
    const nextConsent = {
      ...settings.consentCategories,
      [category]: !settings.consentCategories[category],
    };
    updateSettingsOnServer({ consentCategories: nextConsent });
  };

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/wearable/purge', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Disconnected and purged ${data.purgedCount || 0} wearable records`, 'success');
        setSettings({
          ...settings,
          enabled: false,
          connectedPlatform: 'disconnected',
          lastSyncedAt: undefined,
        });
        setShowPurgeConfirm(false);
      } else {
        showToast('Failed to purge wearable records', 'error');
      }
    } catch {
      showToast('Error purging wearable data', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Watch className="w-5 h-5 text-[#818cf8]" />
              <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">
                Wearable & Behavioral Integration
              </h3>
              <Badge
                variant={settings.enabled ? 'indigo' : 'default'}
                className="text-[10px] py-0 px-2 uppercase tracking-wider"
              >
                {settings.enabled
                  ? settings.connectedPlatform === 'mock'
                    ? 'Connected: Mock Provider'
                    : 'Connected'
                  : 'Disconnected'}
              </Badge>
            </div>
            <p className="text-xs text-[rgba(232,234,246,0.50)] font-body-md max-w-xl leading-relaxed">
              Incorporate non-diagnostic physiological patterns (sleep, heart rate variability, activity) into your Personal State. All data is evaluated baseline-relative and never creates clinical diagnoses.
            </p>
          </div>

          {/* Master Toggle */}
          <button
            onClick={() => updateSettingsOnServer({ enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
              settings.enabled ? 'bg-[#818cf8]' : 'bg-[rgba(255,255,255,0.15)]'
            }`}
            aria-label="Toggle Wearable Ingestion"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sync Info */}
        {settings.enabled && (
          <div className="flex items-center gap-2 text-xs text-[rgba(232,234,246,0.50)] bg-[rgba(255,255,255,0.03)] p-3 rounded-xl border border-[rgba(255,255,255,0.06)]">
            <Clock className="w-3.5 h-3.5 text-[#818cf8]" />
            <span>
              {settings.lastSyncedAt
                ? `Last synchronized: ${new Date(settings.lastSyncedAt).toLocaleString()}`
                : 'Ready to synchronize. Using calibrated personal physiological baseline.'}
            </span>
          </div>
        )}

        {/* Granular Scope Consent Checkboxes */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold text-[rgba(232,234,246,0.70)] uppercase tracking-wider">
            Consented Data Categories
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sleep Architecture */}
            <div
              onClick={() => handleToggleCategory('sleep')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                settings.consentCategories.sleep
                  ? 'bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.30)]'
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] opacity-60'
              }`}
            >
              <Moon className="w-4 h-4 text-[#818cf8] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[rgba(232,234,246,0.85)]">Sleep & Rest</div>
                <div className="text-[11px] text-[rgba(232,234,246,0.45)]">Duration & sleep efficiency</div>
              </div>
            </div>

            {/* Heart Rate & HRV */}
            <div
              onClick={() => handleToggleCategory('heartRateHrv')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                settings.consentCategories.heartRateHrv
                  ? 'bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.30)]'
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] opacity-60'
              }`}
            >
              <Heart className="w-4 h-4 text-[#f43f5e] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[rgba(232,234,246,0.85)]">Autonomic Rhythm</div>
                <div className="text-[11px] text-[rgba(232,234,246,0.45)]">Resting HR & HRV RMSSD</div>
              </div>
            </div>

            {/* Daytime Activity */}
            <div
              onClick={() => handleToggleCategory('activity')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                settings.consentCategories.activity
                  ? 'bg-[rgba(129,140,248,0.08)] border-[rgba(129,140,248,0.30)]'
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] opacity-60'
              }`}
            >
              <Activity className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[rgba(232,234,246,0.85)]">Movement & Steps</div>
                <div className="text-[11px] text-[rgba(232,234,246,0.45)]">Active time & step cadence</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Purge / Revocation */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-[rgba(232,234,246,0.40)]">
            <ShieldCheck className="w-4 h-4 text-[#34d399]" />
            <span>Zero raw sensor data is ever sent to AI or persisted permanently.</span>
          </div>

          {!showPurgeConfirm ? (
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowPurgeConfirm(true)}
              className="text-[rgba(244,63,94,0.80)] hover:text-[#f43f5e]"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Disconnect & Delete History
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[rgba(244,63,94,0.90)] font-medium">Permanently purge?</span>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePurge}
                disabled={isPurging}
                className="bg-[#f43f5e] hover:bg-[#e11d48]"
              >
                {isPurging ? 'Purging...' : 'Confirm Purge'}
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowPurgeConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
