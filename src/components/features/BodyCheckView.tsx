/**
 * BodyCheckView Component
 * Mindful 3.0 — Somatic Reset & Biofeedback Surface
 *
 * Dedicated top-level product surface for physical and somatic resets:
 * 1. Prominent Hero Card for Postural & Sensory Reset with camera biofeedback
 * 2. Somatic practices catalog (Box breathing, sensory grounding, focus reset, etc.)
 * 3. Recent Body Check session history with usefulness ratings and delta shifts
 * 4. Transparent local camera privacy disclosure
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Video,
  Wind,
  Compass,
  Zap,
  Moon,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useIntervention } from '../../context/InterventionContext';
import { InterventionPlayerModal } from './intervention/InterventionPlayerModal';
import { INTERVENTION_LIBRARY } from '../../server/engine/interventionEngine/library';
import { InterventionDefinition } from '../../types';

export const BodyCheckView: React.FC = () => {
  const {
    sessionHistory,
    isPlayerOpen,
    playerIntervention,
    openPlayer,
    closePlayer,
  } = useIntervention();

  const [selectedIntervention, setSelectedIntervention] = useState<InterventionDefinition | null>(null);

  // Hero Intervention: Postural & Sensory Reset
  const heroIntervention = INTERVENTION_LIBRARY['somatic-recovery'] || {
    id: 'somatic-recovery',
    title: 'Postural & Sensory Reset',
    shortDescription: 'Release screen tension, align posture, and calm overstimulated visual pathways.',
    longDescription: 'Addresses screen fatigue and postural compression with gentle somatic neck releases, eye horizon gaze, and physiological sighs.',
    category: 'recovery',
    targetDimensions: ['fatigue', 'energy'],
    durationMinutes: 4,
    difficulty: 'gentle',
  } as InterventionDefinition;

  // Additional Somatic Practices Catalog
  const somaticPractices: InterventionDefinition[] = [
    INTERVENTION_LIBRARY['breathing-reset'],
    INTERVENTION_LIBRARY['grounding-anchor'],
    INTERVENTION_LIBRARY['focus-reset'],
    INTERVENTION_LIBRARY['sleep-winddown'],
    INTERVENTION_LIBRARY['behavioral-activation'],
  ].filter(Boolean) as InterventionDefinition[];

  const handleStartIntervention = (item: InterventionDefinition) => {
    setSelectedIntervention(item);
    openPlayer(item);
  };

  const activeModalIntervention = selectedIntervention || playerIntervention || heroIntervention;

  return (
    <>
      <InterventionPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => {
          closePlayer();
          setSelectedIntervention(null);
        }}
        intervention={activeModalIntervention}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-12">
        {/* ── 1. HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.16em] text-[#6ee7b7]">
                Somatic Sanctuary
              </span>
              <Badge variant="primary" size="sm">Body Check</Badge>
            </div>
            <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.95)] tracking-tight">
              Body Check
            </h1>
            <p className="font-body-md text-base sm:text-lg text-[rgba(192,196,234,0.70)] max-w-2xl">
              Reset your body and attention. Regulate somatic tension, re-align posture, and recover cognitive clarity through bounded physical protocols.
            </p>
          </div>

          {/* Privacy affirmation chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] text-xs text-[rgba(232,234,246,0.70)]">
            <ShieldCheck className="w-4 h-4 text-[#6ee7b7]" />
            <span>100% on-device & private</span>
          </div>
        </div>

        {/* ── 2. HERO CARD: POSTURAL & SENSORY RESET ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="relative overflow-hidden p-6 sm:p-10 bg-gradient-to-br from-[rgba(108,114,232,0.12)] via-[rgba(18,20,32,0.85)] to-[rgba(13,15,26,0.95)] border-[rgba(108,114,232,0.30)] shadow-[0_16px_50px_rgba(0,0,0,0.50)]">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,rgba(108,114,232,0.18)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[rgba(108,114,232,0.20)] border border-[rgba(108,114,232,0.35)] flex items-center justify-center text-[#c0c4ea] shadow-[0_0_24px_rgba(108,114,232,0.25)]">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#6ee7b7]">
                        Primary Somatic Reset
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[rgba(52,211,153,0.12)] text-[#6ee7b7] border border-[rgba(52,211,153,0.20)]">
                        Recovery
                      </span>
                    </div>
                    <h2 className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.95)] tracking-tight">
                      {heroIntervention.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs font-mono text-[rgba(232,234,246,0.80)]">
                    <Clock className="w-3.5 h-3.5 text-[#c0c4ea]" />
                    {heroIntervention.durationMinutes} min protocol
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(232,234,246,0.70)] capitalize">
                    {heroIntervention.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-[rgba(232,234,246,0.80)] max-w-3xl leading-relaxed">
                {heroIntervention.longDescription || heroIntervention.shortDescription}
              </p>

              {/* Protocol Step Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {heroIntervention.steps?.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-[#c0c4ea]">
                      <span className="w-5 h-5 rounded-full bg-[rgba(108,114,232,0.20)] flex items-center justify-center text-[11px] font-bold">
                        {step.stepNumber}
                      </span>
                      <span className="font-semibold text-[rgba(232,234,246,0.90)] truncate">{step.title}</span>
                    </div>
                    <p className="text-[11px] text-[rgba(232,234,246,0.55)] line-clamp-2 leading-relaxed">
                      {step.instruction}
                    </p>
                  </div>
                ))}
              </div>

              {/* Biofeedback & Camera Callout */}
              <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(129,140,248,0.15)] flex items-center justify-center text-[#818cf8] shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[rgba(232,234,246,0.90)]">
                      Adaptive Somatic Biofeedback Available
                    </div>
                    <div className="text-[11px] text-[rgba(232,234,246,0.50)]">
                      Optionally use on-device camera to pace breathing to your physical stillness.
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleStartIntervention(heroIntervention)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shrink-0 shadow-[0_0_24px_rgba(108,114,232,0.40)]"
                >
                  Begin Body Check
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── 3. MORE SOMATIC PRACTICES ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                More Physical & Somatic Resets
              </h2>
              <p className="text-xs text-[rgba(192,196,234,0.60)]">
                Evidence-based somatic protocols tailored to different physiological states.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {somaticPractices.map((practice) => {
              const isBoxBreathing = practice.id === 'breathing-reset';
              const isGrounding = practice.id === 'grounding-anchor';
              const isSleep = practice.id === 'sleep-winddown';
              const isActivation = practice.id === 'behavioral-activation';

              const Icon = isBoxBreathing
                ? Wind
                : isGrounding
                ? Compass
                : isSleep
                ? Moon
                : isActivation
                ? Zap
                : Sparkles;

              return (
                <Card
                  key={practice.id}
                  className="p-6 bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] flex flex-col justify-between space-y-5 hover:border-[rgba(108,114,232,0.30)] transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#c0c4ea] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-[rgba(232,234,246,0.60)]">
                        <Clock className="w-3 h-3 text-[#c0c4ea]" />
                        {practice.durationMinutes}m
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#6ee7b7] mb-1">
                        {practice.category}
                      </div>
                      <h3 className="font-display-lg text-lg text-[rgba(232,234,246,0.95)]">
                        {practice.title}
                      </h3>
                      <p className="text-xs text-[rgba(192,196,234,0.70)] mt-1.5 line-clamp-2 leading-relaxed">
                        {practice.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                    <span className="text-[11px] text-[rgba(232,234,246,0.40)]">
                      {practice.steps?.length || 4} guided steps
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartIntervention(practice)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Start
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── 4. RECENT BODY CHECK SESSIONS ── */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
              Recent Reset History
            </h2>
            <p className="text-xs text-[rgba(192,196,234,0.60)]">
              Logged session outcomes, perceived usefulness, and observed dimension shifts.
            </p>
          </div>

          {sessionHistory && sessionHistory.length > 0 ? (
            <div className="space-y-3">
              {sessionHistory.slice(0, 5).map((sess) => {
                const practice = INTERVENTION_LIBRARY[sess.interventionId];
                const title = practice?.title || sess.interventionId;
                const formattedDate = new Date(sess.completedAt || sess.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Card
                    key={sess.id}
                    className="p-5 bg-[rgba(13,15,26,0.50)] border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[rgba(232,234,246,0.40)]">
                          {formattedDate}
                        </span>
                        {sess.biofeedbackSummary?.biofeedbackAssisted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[rgba(108,114,232,0.15)] text-[#c0c4ea] border border-[rgba(108,114,232,0.25)]">
                            Biofeedback Assisted
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-medium text-[rgba(232,234,246,0.95)]">
                        {title}
                      </h4>
                      {sess.userFeedback && (
                        <p className="text-xs text-[rgba(192,196,234,0.60)] italic">
                          "{sess.userFeedback}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Usefulness Stars */}
                      {sess.perceivedUsefulness && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= (sess.perceivedUsefulness || 0)
                                  ? 'fill-[#fbbf24] text-[#fbbf24]'
                                  : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Observed Shifts */}
                      {sess.dimensionDeltas && (
                        <div className="flex items-center gap-2">
                          {Object.entries(sess.dimensionDeltas).slice(0, 2).map(([dim, val]) => {
                            const delta = typeof val === 'number' ? val : Number(val || 0);
                            return (
                              <span
                                key={dim}
                                className="px-2 py-1 rounded-lg text-xs font-mono bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.75)]"
                              >
                                {dim}: {delta > 0 ? `+${delta}` : delta}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center bg-[rgba(13,15,26,0.40)] border-[rgba(255,255,255,0.05)] space-y-2">
              <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-[rgba(232,234,246,0.40)] mx-auto">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-[rgba(232,234,246,0.70)]">
                No Body Check sessions recorded yet
              </h3>
              <p className="text-xs text-[rgba(232,234,246,0.40)] max-w-sm mx-auto">
                Complete your first Postural & Sensory Reset to track how physical recovery shifts your personal state.
              </p>
            </Card>
          )}
        </div>

        {/* ── 5. NON-MEDICAL NOTICE ── */}
        <div className="pt-8 border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-[rgba(232,234,246,0.35)] font-body-md max-w-2xl mx-auto space-y-1">
          <p>
            Mindful Body Check sessions are voluntary somatic and postural pauses designed for everyday workplace ergonomics and mindful breathing.
          </p>
          <p>
            They are non-clinical, non-diagnostic self-care protocols and do not provide medical diagnosis or treatment.
          </p>
        </div>
      </div>
    </>
  );
};
