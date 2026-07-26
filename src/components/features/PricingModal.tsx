import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';
import { Check, Sparkles, ShieldCheck, CreditCard } from 'lucide-react';

export const PricingModal: React.FC = () => {
  const { isPricingModalOpen, setIsPricingModalOpen, updateUserProfile, showToast } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = () => {
    setIsProcessing(true);
    setTimeout(() => {
      updateUserProfile({ plan: 'Mindful Pro' });
      setIsProcessing(false);
      setIsPricingModalOpen(false);
      showToast("Welcome to Mindful Pro! Sanctuary unlocked ✨");
    }, 1500);
  };

  const proFeatures = [
    "Unlimited AI Companion sessions with Gemini 3.6 Flash",
    "4 Empathy Modes (Empathetic, Coach, Stoic, CBT Reframer)",
    "Volumetric 3D Emotional Topography & Memory Anchors",
    "Synthesized Web Audio Binaural Soundscapes",
    "Focus-First Atmospheric Journaling",
    "Infinite Encrypted History & JSON/Markdown Export",
    "Priority Support & Multi-device Synchronization",
  ];

  return (
    <Modal
      isOpen={isPricingModalOpen}
      onClose={() => setIsPricingModalOpen(false)}
      title="Mindful Pro Sanctuary"
      subtitle="Invest in your emotional peace and mental space."
      maxWidth="2xl"
    >
      {/* Billing Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-[rgba(255,255,255,0.04)] p-1.5 rounded-full flex items-center gap-1 border border-[rgba(255,255,255,0.08)] backdrop-blur-md relative">
          {/* Animated active background */}
          <motion.div
            layoutId="billing-switch"
            className="absolute top-1.5 bottom-1.5 rounded-full bg-[rgba(108,114,232,0.25)] border border-[rgba(108,114,232,0.40)] pointer-events-none"
            initial={false}
            animate={{
              left: billingCycle === 'monthly' ? '0.375rem' : 'auto',
              right: billingCycle === 'annual' ? '0.375rem' : 'auto',
              width: billingCycle === 'monthly' ? '120px' : '172px'
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          <button
            onClick={() => setBillingCycle('monthly')}
            className={`relative px-5 py-2 rounded-full text-xs font-medium transition-all z-10 w-[120px] ${
              billingCycle === 'monthly'
                ? 'text-white font-semibold shadow-sm'
                : 'text-[rgba(232,234,246,0.50)] hover:text-[rgba(232,234,246,0.80)]'
            }`}
          >
            Monthly ($12/mo)
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`relative px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-2 z-10 w-[172px] ${
              billingCycle === 'annual'
                ? 'text-white font-semibold shadow-sm'
                : 'text-[rgba(232,234,246,0.50)] hover:text-[rgba(232,234,246,0.80)]'
            }`}
          >
            <span>Annual ($8/mo)</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
              billingCycle === 'annual' ? 'bg-[#34d399] text-slate-900' : 'bg-[rgba(52,211,153,0.20)] text-[#6ee7b7]'
            }`}>
              Save 33%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free Plan */}
        <div className="p-7 rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] flex flex-col justify-between">
          <div>
            <h4 className="font-display-lg text-2xl text-[rgba(232,234,246,0.80)]">Free Sanctuary</h4>
            <p className="text-xs text-[rgba(232,234,246,0.40)] mt-2 font-body-md">Basic mindful habits and journaling.</p>
            <div className="my-6">
              <span className="font-display-lg text-4xl text-[rgba(232,234,246,0.90)]">$0</span>
              <span className="text-xs text-[rgba(232,234,246,0.30)] font-mono ml-1">/ forever</span>
            </div>
            <ul className="space-y-3.5 text-xs text-[rgba(232,234,246,0.60)]">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[rgba(255,255,255,0.20)] shrink-0" />
                <span>Basic Journal Canvas</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[rgba(255,255,255,0.20)] shrink-0" />
                <span>3 AI Companion responses / day</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[rgba(255,255,255,0.20)] shrink-0" />
                <span>Habit Streak Counter</span>
              </li>
            </ul>
          </div>
          <Button variant="outline" size="md" className="w-full mt-8 opacity-50" disabled>
            Current Plan
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="p-7 rounded-[32px] border border-[rgba(108,114,232,0.40)] flex flex-col justify-between shadow-[0_0_50px_rgba(108,114,232,0.15)] relative overflow-hidden group"
          style={{ background: 'linear-gradient(135deg, rgba(108,114,232,0.15) 0%, rgba(13,15,26,0.95) 100%)' }}
        >
          {/* Animated glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{ background: 'radial-gradient(circle at top right, rgba(108,114,232,0.3) 0%, transparent 60%)' }}
          />

          <Badge variant="pro" size="sm" className="absolute top-5 right-5 z-10 px-3">
            <Sparkles className="w-3 h-3 mr-1" />
            Recommended
          </Badge>

          <div className="relative z-10">
            <h4 className="font-display-lg text-2xl text-white">Mindful Pro</h4>
            <p className="text-xs text-[rgba(192,196,234,0.60)] mt-2 font-body-md">Full sanctuary experience & AI support.</p>
            <div className="my-6">
              <span className="font-display-lg text-4xl text-white">
                {billingCycle === 'annual' ? '$96' : '$12'}
              </span>
              <span className="text-xs text-[rgba(192,196,234,0.50)] font-mono ml-1">
                {billingCycle === 'annual' ? '/ year ($8/mo)' : '/ month'}
              </span>
            </div>

            <ul className="space-y-3 text-xs text-[rgba(232,234,246,0.85)]">
              {proFeatures.map((feat, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#6c72e8] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleUpgrade}
            isLoading={isProcessing}
            variant="primary"
            size="md"
            className="w-full mt-8 relative z-10 h-12 text-sm shadow-[0_0_20px_rgba(108,114,232,0.4)]"
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Upgrade to Pro Sanctuary
          </Button>
        </div>
      </div>

      <div className="text-center text-[10px] text-[rgba(232,234,246,0.30)] uppercase tracking-wider flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
        <span>7-day risk-free money back guarantee • Cancel anytime</span>
      </div>
    </Modal>
  );
};
