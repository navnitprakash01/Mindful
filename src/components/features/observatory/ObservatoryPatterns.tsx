/**
 * Observatory Patterns — Emerging Longitudinal Patterns Section
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Surfaces the top 2-3 strongest validated personal patterns from Phase 2.
 * Strictly guarantees non-causal language and transparent evidence inspection.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PersonalPattern, PatternType } from '../../../types';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PatternEvidenceModal } from '../PatternEvidenceModal';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Tag,
  Activity,
  Compass,
  ArrowRight,
  Plus,
  HelpCircle,
} from 'lucide-react';

interface ObservatoryPatternsProps {
  patterns: PersonalPattern[];
  isPatternsLoading: boolean;
  onOpenCheckIn?: () => void;
}

const PATTERN_ICONS: Record<PatternType, React.ReactNode> = {
  temporal_rhythm: <Clock className="w-4 h-4 text-[#c0c4ea]" />,
  trigger_association: <Tag className="w-4 h-4 text-[#f4a8c0]" />,
  mood_frequency: <Activity className="w-4 h-4 text-[#6ee7b7]" />,
  energy_trajectory: <TrendingUp className="w-4 h-4 text-[#38bdf8]" />,
  context_somatic_cooccurrence: <Compass className="w-4 h-4 text-[#fbbf24]" />,
};

export const ObservatoryPatterns: React.FC<ObservatoryPatternsProps> = ({
  patterns,
  isPatternsLoading,
  onOpenCheckIn,
}) => {
  const [inspectingPattern, setInspectingPattern] = useState<PersonalPattern | null>(null);

  // Show only top 2-3 strongest validated patterns to prevent clutter
  const displayedPatterns = patterns.slice(0, 3);
  const hasPatterns = displayedPatterns.length > 0;

  return (
    <>
      <PatternEvidenceModal
        pattern={inspectingPattern}
        isOpen={inspectingPattern !== null}
        onClose={() => setInspectingPattern(null)}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(108,114,232,0.85)]">
                Patterns Emerging
              </span>
              <Badge variant="primary" size="sm">Phase 2 Intelligence</Badge>
            </div>
            <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
              What Mindful Is Noticing
            </h3>
            <p className="text-xs text-[rgba(192,196,234,0.55)]">
              Statistical regularities observed across your longitudinal wellness history
            </p>
          </div>

          <div className="text-xs text-[rgba(192,196,234,0.50)] font-mono">
            {hasPatterns ? `${patterns.length} pattern(s) active` : 'Evaluating signals'}
          </div>
        </div>

        {/* Patterns Cards Grid or Cold State */}
        {!hasPatterns ? (
          /* Cold State / Insufficient Observations */
          <Card className="p-8 bg-[rgba(13,15,26,0.50)] border-[rgba(255,255,255,0.06)] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center mx-auto text-[#c0c4ea]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.90)]">
                Patterns Are Still Taking Shape
              </h4>
              <p className="text-xs text-[rgba(192,196,234,0.60)] leading-relaxed">
                Mindful needs more real check-ins before it can identify reliable personal patterns.
                Every mood check-in refines your longitudinal baseline.
              </p>
            </div>
            {onOpenCheckIn && (
              <button
                onClick={onOpenCheckIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(108,114,232,0.18)] hover:bg-[rgba(108,114,232,0.28)] border border-[rgba(108,114,232,0.30)] text-xs font-medium text-white transition-all shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Keep Checking In
              </button>
            )}
          </Card>
        ) : (
          /* Top 2-3 Validated Pattern Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedPatterns.map((p) => {
              const confidencePct = Math.round(p.confidence * 100);
              const icon = PATTERN_ICONS[p.patternType] || <Sparkles className="w-4 h-4 text-[#c0c4ea]" />;

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card className="p-6 h-full flex flex-col justify-between bg-[rgba(13,15,26,0.65)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(108,114,232,0.30)] transition-all shadow-lg space-y-4">
                    <div className="space-y-3">
                      {/* Pattern Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                            {icon}
                          </div>
                          <Badge
                            variant={p.strength === 'strong' ? 'primary' : 'neutral'}
                            size="sm"
                            className="font-mono text-[10px]"
                          >
                            Confidence {confidencePct}%
                          </Badge>
                        </div>

                        <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(232,234,246,0.40)]">
                          {p.strength}
                        </span>
                      </div>

                      {/* Pattern Title */}
                      <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.95)] leading-snug">
                        {p.title}
                      </h4>

                      {/* Non-causal Description */}
                      <p className="text-xs text-[rgba(192,196,234,0.65)] leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Footer: Observation Summary & See Why Button */}
                    <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                      <span className="text-[11px] text-[rgba(232,234,246,0.45)] font-mono">
                        Observed in {p.evidence.supportingCount} of {p.evidence.observationCount} check-ins
                      </span>

                      <button
                        onClick={() => setInspectingPattern(p)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#6ee7b7] hover:text-white transition-colors"
                      >
                        See why <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
