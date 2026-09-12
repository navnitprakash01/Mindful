/**
 * Pattern Insights Card
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Surfaces validated longitudinal patterns ("What Mindful is noticing") with
 * calibrated confidence scores and traceable evidence inspection.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PersonalPattern, PatternType } from '../../types';
import { useApp } from '../../context/AppContext';
import { PatternEvidenceModal } from './PatternEvidenceModal';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Tag,
  Activity,
  RotateCw,
  HelpCircle,
  Compass,
} from 'lucide-react';

const PATTERN_ICONS: Record<PatternType, React.ReactNode> = {
  temporal_rhythm: <Clock className="w-4 h-4 text-[#c0c4ea]" />,
  trigger_association: <Tag className="w-4 h-4 text-[#f4a8c0]" />,
  mood_frequency: <Activity className="w-4 h-4 text-[#6ee7b7]" />,
  energy_trajectory: <TrendingUp className="w-4 h-4 text-[#38bdf8]" />,
  context_somatic_cooccurrence: <Compass className="w-4 h-4 text-[#fbbf24]" />,
};

const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  temporal_rhythm: 'Temporal Rhythm',
  trigger_association: 'Trigger Association',
  mood_frequency: 'Emotional Frequency',
  energy_trajectory: 'Energy Trajectory',
  context_somatic_cooccurrence: 'Contextual Co-occurrence',
};

export const PatternInsightsCard: React.FC = () => {
  const { patterns, isPatternsLoading, refreshPatterns } = useApp();
  const [selectedPattern, setSelectedPattern] = useState<PersonalPattern | null>(null);

  const hasPatterns = patterns && patterns.length > 0;

  return (
    <>
      <PatternEvidenceModal
        pattern={selectedPattern}
        isOpen={selectedPattern !== null}
        onClose={() => setSelectedPattern(null)}
      />

      <Card className="p-6 bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(108,114,232,0.85)]">
                What Mindful Is Noticing
              </span>
              <Badge variant="primary" size="sm">Phase 2</Badge>
            </div>
            <h3 className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
              Longitudinal Patterns
            </h3>
            <p className="text-xs text-[rgba(232,234,246,0.45)]">
              Statistical patterns discovered from your personal state history
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshPatterns()}
            disabled={isPatternsLoading}
            leftIcon={
              <RotateCw
                className={`w-3.5 h-3.5 ${isPatternsLoading ? 'animate-spin text-[#c0c4ea]' : ''}`}
              />
            }
          >
            {isPatternsLoading ? 'Analyzing…' : 'Refresh'}
          </Button>
        </div>

        {/* Content Area */}
        {!hasPatterns ? (
          /* Cold Start Empty State */
          <div className="p-8 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(108,114,232,0.10)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center mx-auto text-[#c0c4ea]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="font-display-lg text-base text-[rgba(232,234,246,0.90)]">
                Patterns are still taking shape
              </h4>
              <p className="text-xs text-[rgba(232,234,246,0.40)] leading-relaxed">
                Keep logging your state. Mindful needs a few more observations before it can identify meaningful personal patterns.
              </p>
            </div>
          </div>
        ) : (
          /* Validated Patterns List */
          <div className="space-y-3">
            <AnimatePresence>
              {patterns.slice(0, 3).map((pattern, idx) => {
                const icon = PATTERN_ICONS[pattern.type] || <Sparkles className="w-4 h-4 text-[#c0c4ea]" />;
                const typeLabel = PATTERN_TYPE_LABELS[pattern.type] || 'Observation';
                const confidencePct = Math.round(pattern.confidence * 100);

                return (
                  <motion.div
                    key={pattern.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    className="p-4 rounded-2xl bg-[rgba(255,255,255,0.025)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,114,232,0.30)] transition-all space-y-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                          {icon}
                        </div>
                        <span className="text-[11px] font-medium text-[rgba(192,196,234,0.70)] uppercase tracking-wider">
                          {typeLabel}
                        </span>
                      </div>

                      <Badge variant="neutral" size="sm" className="font-mono">
                        {confidencePct}% Confidence
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-display-lg text-base text-[rgba(232,234,246,0.92)] mb-1">
                        {pattern.title}
                      </h4>
                      <p className="text-xs text-[rgba(232,234,246,0.55)] leading-relaxed">
                        {pattern.aiExplanation || pattern.description}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[rgba(255,255,255,0.04)]">
                      <span className="text-[10px] text-[rgba(232,234,246,0.35)] font-mono">
                        Based on {pattern.observationCount} observations
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPattern(pattern)}
                        leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
                        className="text-xs text-[#c0c4ea] hover:text-white"
                      >
                        See Evidence
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </>
  );
};
