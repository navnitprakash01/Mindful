/**
 * Pattern Evidence Modal
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Provides transparent, traceable inspection of the evidence behind a discovered pattern.
 * Explicitly communicates observational association without causal claims.
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PersonalPattern } from '../../types';
import { Calendar, BarChart2, ShieldCheck, Info } from 'lucide-react';

interface PatternEvidenceModalProps {
  pattern: PersonalPattern | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatternEvidenceModal: React.FC<PatternEvidenceModalProps> = ({
  pattern,
  isOpen,
  onClose,
}) => {
  if (!pattern) return null;

  const { evidence } = pattern;
  const confidencePct = Math.round(pattern.confidence * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Why am I seeing this?"
      subtitle="Factual evidence supporting this observation"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Pattern Summary */}
        <div className="p-4 rounded-2xl bg-[rgba(108,114,232,0.08)] border border-[rgba(108,114,232,0.20)] space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(108,114,232,0.85)]">
              Observed Pattern
            </span>
            <Badge variant="primary" size="sm" className="font-mono">
              {confidencePct}% Confidence
            </Badge>
          </div>
          <h4 className="font-display-lg text-lg text-[rgba(232,234,246,0.95)]">
            {pattern.title}
          </h4>
          <p className="text-xs text-[rgba(232,234,246,0.60)] leading-relaxed">
            {pattern.description}
          </p>
        </div>

        {/* Evidence Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
              Supporting Observations
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                {evidence.supportingCount}
              </span>
              <span className="text-[11px] text-[rgba(232,234,246,0.40)]">
                of {evidence.observationCount} total
              </span>
            </div>
            {typeof evidence.supportingAvg === 'number' && (
              <span className="text-[10px] text-[#6ee7b7] font-mono mt-1 block">
                Average: {evidence.supportingAvg}
                {evidence.metricKey === 'energyLevel' ? '/10' : '%'}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <span className="text-[10px] uppercase font-semibold text-[rgba(232,234,246,0.40)] block mb-1">
              Comparison Group
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display-lg text-2xl text-[rgba(232,234,246,0.95)]">
                {evidence.comparisonCount}
              </span>
              <span className="text-[11px] text-[rgba(232,234,246,0.40)]">observations</span>
            </div>
            {typeof evidence.comparisonAvg === 'number' && (
              <span className="text-[10px] text-[rgba(192,196,234,0.60)] font-mono mt-1 block">
                Average: {evidence.comparisonAvg}
                {evidence.metricKey === 'energyLevel' ? '/10' : '%'}
              </span>
            )}
          </div>
        </div>

        {/* Sample Context Dates */}
        {evidence.sampleContexts && evidence.sampleContexts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(232,234,246,0.40)]">
                Recent Occurrences
              </span>
              {evidence.supportingObservationIds && evidence.supportingObservationIds.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.25)] text-[#c0c4ea]">
                  {evidence.supportingObservationIds.length} Linked Observation Traces
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {evidence.sampleContexts.map((dt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.70)]"
                >
                  <Calendar className="w-3 h-3 text-[rgba(108,114,232,0.70)]" />
                  <span>{dt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observational Non-Causality Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[rgba(108,114,232,0.80)] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[rgba(232,234,246,0.45)] leading-relaxed">
            <strong className="text-[rgba(232,234,246,0.70)]">Observational Notice:</strong> Mindful identifies statistical associations across your logged entries. This reflects repeated co-occurrence over time and does not establish clinical causation or medical diagnosis.
          </p>
        </div>

        <Button variant="outline" size="md" className="w-full" onClick={onClose}>
          Close Evidence
        </Button>
      </div>
    </Modal>
  );
};
