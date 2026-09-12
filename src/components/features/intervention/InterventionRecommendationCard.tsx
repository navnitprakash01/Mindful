/**
 * Intervention Recommendation Card
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Surfaces real-time deterministic intervention recommendations based on
 * current personal state, patterns, and past session outcomes.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useIntervention } from '../../../context/InterventionContext';
import { InterventionPlayerModal } from './InterventionPlayerModal';
import {
  Sparkles,
  Clock,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const InterventionRecommendationCard: React.FC = () => {
  const {
    recommendation,
    isLoading,
    isPlayerOpen,
    playerIntervention,
    openPlayer,
    closePlayer,
    effectiveness,
  } = useIntervention();

  if (isLoading || !recommendation || !recommendation.intervention) {
    return null;
  }

  const { intervention, suitabilityScore, reasons, isColdOrLowConfidence, safetyNotice } =
    recommendation;

  const itemEffectiveness = effectiveness[intervention.id];

  return (
    <>
      <InterventionPlayerModal
        isOpen={isPlayerOpen}
        onClose={closePlayer}
        intervention={playerIntervention || intervention}
      />

      <Card className="p-6 bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center text-[#c0c4ea]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.14em] text-[#6ee7b7]">
                  Personalized Intervention
                </span>
                <Badge variant={isColdOrLowConfidence ? 'neutral' : 'primary'} size="sm">
                  {Math.round(suitabilityScore * 100)}% State Match
                </Badge>
              </div>
              <h3 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)]">
                {intervention.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.04)] text-[rgba(232,234,246,0.70)] border border-[rgba(255,255,255,0.06)]">
              <Clock className="w-3.5 h-3.5" />
              {intervention.durationMinutes}m
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[rgba(52,211,153,0.10)] text-[#6ee7b7] border border-[rgba(52,211,153,0.18)] uppercase tracking-wider">
              {intervention.category}
            </span>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-[rgba(192,196,234,0.70)] leading-relaxed">
          {intervention.shortDescription}
        </p>

        {/* Evidence reasons */}
        {reasons && reasons.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[rgba(232,234,246,0.40)] font-semibold block">
              Observed State Indicators
            </span>
            <div className="flex flex-wrap gap-2">
              {reasons.map((reason, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl text-xs bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.80)]"
                >
                  • {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Effectiveness summary if historical sessions exist */}
        {itemEffectiveness && itemEffectiveness.completedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-[rgba(192,196,234,0.60)] italic">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6ee7b7] shrink-0" />
            <span>{itemEffectiveness.factualSummary}</span>
          </div>
        )}

        {/* Safety Crisis Alert if present */}
        {safetyNotice && (
          <div className="p-3 rounded-xl bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)] text-xs text-red-200">
            {safetyNotice}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)]">
          <span className="text-[11px] text-[rgba(232,234,246,0.35)]">
            Step-by-step guided somatic & cognitive protocol
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openPlayer(intervention)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Start Reset
          </Button>
        </div>
      </Card>
    </>
  );
};
