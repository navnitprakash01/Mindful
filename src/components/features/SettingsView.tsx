import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Volume2, VolumeX, Download, ShieldCheck, Sparkles, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MemoryVaultSettings } from './settings/MemoryVaultSettings';

export const SettingsView: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    activeSoundscape,
    toggleSoundscape,
    journalEntries,
    moodLogs,
    setIsPricingModalOpen,
    showToast,
  } = useApp();
  const { signOut } = useAuth();

  const soundscapesList = [
    { id: 'binaural', title: 'Binaural Alpha Waves (10Hz)', desc: 'Encourages deep focus and relaxed mental clarity.', emoji: '🧠' },
    { id: 'rain', title: 'Soft Rain on Skylight', desc: 'Continuous organic pink noise for anxiety reduction.', emoji: '🌧️' },
    { id: 'ocean', title: 'Ocean Tides & Swells', desc: '10-second modulated ocean wave cycles.', emoji: '🌊' },
    { id: 'forest', title: 'Forest Canopy Breeze', desc: 'Gentle low-pass wind resonance.', emoji: '🌿' },
    { id: 'zen', title: 'Zen Meditation Drone (136.1Hz)', desc: 'Sacred Om harmonic frequency for deep stillness.', emoji: '🪷' },
  ];

  const handleExportData = () => {
    const data = { profile: userProfile, journalEntries, moodLogs, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindful_sanctuary_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Sanctuary data exported securely 📦');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed', error);
      showToast('Unable to sign out right now.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge variant="slate" className="mb-3">Sanctuary Settings</Badge>
        <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.93)]">
          Preferences & Ambient Soundscapes
        </h1>
      </motion.div>

      {/* Soundscapes Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-[rgba(108,114,232,0.15)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-[#c0c4ea]" />
            </div>
            <div>
              <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Synthesized Ambient Soundscapes</h2>
              <p className="text-xs text-[rgba(232,234,246,0.40)] font-body-md mt-0.5">
                Generative Web Audio soundscapes crafted to quiet the mind.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {soundscapesList.map((sc, idx) => {
              const isPlaying = activeSoundscape === sc.id;
              return (
                <motion.div
                  key={sc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  onClick={() => toggleSoundscape(sc.id as 'binaural' | 'rain' | 'ocean' | 'forest' | 'zen')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3 ${
                    isPlaying
                      ? 'bg-[rgba(108,114,232,0.15)] border-[rgba(108,114,232,0.35)] shadow-[0_0_20px_rgba(108,114,232,0.15)]'
                      : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(108,114,232,0.20)] hover:bg-[rgba(108,114,232,0.04)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{sc.emoji}</span>
                    <div>
                      <h4 className={`font-semibold text-sm ${isPlaying ? 'text-[#c0c4ea]' : 'text-[rgba(232,234,246,0.75)]'}`}>
                        {sc.title}
                      </h4>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isPlaying ? 'text-[rgba(192,196,234,0.60)]' : 'text-[rgba(232,234,246,0.35)]'}`}>
                        {sc.desc}
                      </p>
                    </div>
                  </div>
                  <div className={`shrink-0 p-2 rounded-xl border transition-all ${
                    isPlaying ? 'bg-[rgba(108,114,232,0.20)] border-[rgba(108,114,232,0.30)]' : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]'
                  }`}>
                    {isPlaying
                      ? <Volume2 className="w-4 h-4 text-[#c0c4ea] animate-pulse" />
                      : <VolumeX className="w-4 h-4 text-[rgba(232,234,246,0.30)]" />
                    }
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center">
                <User className="w-5 h-5 text-[rgba(232,234,246,0.60)]" />
              </div>
              <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Sanctuary Account</h2>
            </div>
            <Badge variant={userProfile.plan === 'Mindful Pro' ? 'pro' : 'slate'}>
              {userProfile.plan}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={userProfile.name}
              onChange={(e) => updateUserProfile({ name: e.target.value })}
            />
            <Input
              label="Email Address"
              value={userProfile.email}
              onChange={(e) => updateUserProfile({ email: e.target.value })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleLogout}
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          </div>

          {userProfile.plan !== 'Mindful Pro' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative rounded-2xl overflow-hidden border border-[rgba(108,114,232,0.25)] p-6 flex justify-between items-center gap-4"
              style={{ background: 'linear-gradient(135deg, rgba(108,114,232,0.15) 0%, rgba(13,15,26,0.90) 100%)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#c0c4ea]" />
                  <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.90)]">Upgrade to Mindful Pro</h4>
                </div>
                <p className="text-xs text-[rgba(192,196,234,0.50)] leading-relaxed">
                  Unlock unlimited AI sessions, binaural soundscapes, and full data export.
                </p>
              </div>
              <Button
                onClick={() => setIsPricingModalOpen(true)}
                variant="primary"
                size="sm"
                className="shrink-0"
              >
                Upgrade Plan
              </Button>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Memory & Proactivity (Phase 8) */}
      <MemoryVaultSettings />

      {/* Data Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-[#6ee7b7]" />
              <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.90)]">Data Sovereignty</h3>
            </div>
            <p className="text-xs text-[rgba(232,234,246,0.40)] font-body-md max-w-md leading-relaxed">
              Your reflections are your own. Download a full JSON archive of your journal entries, mood logs, and habit streaks at any time.
            </p>
          </div>
          <Button
            onClick={handleExportData}
            variant="glass"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Data
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
