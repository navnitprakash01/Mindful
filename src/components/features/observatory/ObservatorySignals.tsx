/**
 * Observatory Signals — Contributing State Signals & Evidence
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Redesigned from the former technical "State Intelligence" panel.
 * Uses progressive disclosure to show active contextual triggers, somatic markers,
 * and expandable structured evidence explaining the current state.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PersonalState } from '../../../types';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Sparkles, Tag, Wind, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface ObservatorySignalsProps {
  personalState: PersonalState | null;
}

export const ObservatorySignals: React.FC<ObservatorySignalsProps> = ({ personalState }) => {
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);

  const activeSignalsCount = personalState?.activeSignalsCount ?? 0;
  const triggers = personalState?.contextualTriggers || [];
  const sensations = personalState?.somaticMarkers || [];
  const evidence = personalState?.evidence || [];

  return (
    <Card className="p-6 sm:p-7 bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] backdrop-blur-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[rgba(108,114,232,0.85)]">
              State Signals
            </span>
            <Badge variant="glass" size="sm" className="font-mono text-[10px]">
              {activeSignalsCount} Contributing Observation{activeSignalsCount === 1 ? '' : 's'}
            </Badge>
          </div>
          <h4 className="font-display-lg text-xl text-[rgba(232,234,246,0.95)]">
            Active Influences
          </h4>
        </div>

        <div className="w-8 h-8 rounded-xl bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.20)] flex items-center justify-center text-[#c0c4ea]">
          <Layers className="w-4 h-4" />
        </div>
      </div>

      {/* Contextual Triggers & Somatic Sensations Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contextual Factors */}
        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgba(232,234,246,0.50)] uppercase tracking-wide">
            <Tag className="w-3 h-3 text-[#f4a8c0]" /> Contextual Factors
          </div>
          {triggers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {triggers.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg text-xs bg-[rgba(244,168,192,0.10)] border border-[rgba(244,168,192,0.20)] text-[rgba(232,234,246,0.90)] font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[rgba(192,196,234,0.45)] italic">
              Stabilizing at baseline
            </span>
          )}
        </div>

        {/* Somatic Markers */}
        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgba(232,234,246,0.50)] uppercase tracking-wide">
            <Wind className="w-3 h-3 text-[#6ee7b7]" /> Somatic Sensations
          </div>
          {sensations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {sensations.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-lg text-xs bg-[rgba(110,231,183,0.10)] border border-[rgba(110,231,183,0.20)] text-[rgba(232,234,246,0.90)] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[rgba(192,196,234,0.45)] italic">
              Relaxed baseline posture
            </span>
          )}
        </div>
      </div>

      {/* Progressive Disclosure: Why This State? Evidence Stack */}
      {evidence.length > 0 && (
        <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-[rgba(232,234,246,0.75)] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#6ee7b7]" />
              Why this state? ({evidence.length} contributing observation{evidence.length === 1 ? '' : 's'})
            </span>
            {isEvidenceExpanded ? (
              <ChevronUp className="w-4 h-4 text-[rgba(232,234,246,0.50)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[rgba(232,234,246,0.50)]" />
            )}
          </button>

          <AnimatePresence>
            {isEvidenceExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-2 pt-2"
              >
                {evidence.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 flex-1">
                      <p className="text-[rgba(232,234,246,0.85)] font-medium">
                        {ev.observation}
                      </p>
                      <span className="text-[10px] font-mono text-[rgba(192,196,234,0.40)] capitalize">
                        Source: {ev.source.replace('_', ' ')}
                      </span>
                    </div>

                    {ev.directionText && (
                      <span className="font-mono text-[11px] text-[#6ee7b7] shrink-0 font-medium">
                        {ev.directionText}
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
};
