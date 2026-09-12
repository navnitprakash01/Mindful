/**
 * Observatory Deep Dive — Progressive Disclosure Container
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Houses deeper technical intelligence (Your Rhythm timeline, Phase 2 patterns,
 * state signals evidence stack, and all 6 dimensions) behind a graceful progressive
 * disclosure accordion ("Explore your inner data →").
 *
 * This keeps the first viewport serene and un-cluttered while providing instant,
 * smooth access to detailed evidence when desired.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PersonalState, PersonalPattern, StateDimensionKey } from '../../../types';
import {
  HistoricalRhythmData,
  DimensionMetricSummary,
} from '../../../lib/observatoryHelpers';
import { DaySlot } from '../../../lib/emotionalRhythm';
import { ObservatoryRhythm } from './ObservatoryRhythm';
import { ObservatoryPatterns } from './ObservatoryPatterns';
import { ObservatorySignals } from './ObservatorySignals';
import { ObservatoryDimensions } from './ObservatoryDimensions';
import { ChevronDown, ChevronUp, Database, ArrowRight } from 'lucide-react';

interface ObservatoryDeepDiveProps {
  isOpen: boolean;
  onToggle: () => void;
  rhythmData: HistoricalRhythmData;
  sevenDaySlots: DaySlot[];
  patterns: PersonalPattern[];
  isPatternsLoading: boolean;
  personalState: PersonalState | null;
  dimensions: DimensionMetricSummary[];
  selectedDimension: StateDimensionKey | null;
  onSelectDimension: (key: StateDimensionKey | null) => void;
  onOpenCheckIn: () => void;
}

export const ObservatoryDeepDive: React.FC<ObservatoryDeepDiveProps> = ({
  isOpen,
  onToggle,
  rhythmData,
  sevenDaySlots,
  patterns,
  isPatternsLoading,
  personalState,
  dimensions,
  selectedDimension,
  onSelectDimension,
  onOpenCheckIn,
}) => {
  return (
    <div className="space-y-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
      {/* Progressive Disclosure Toggle Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onToggle}
            className="group inline-flex items-center gap-2 text-left cursor-pointer focus:outline-none"
          >
            <span className="font-display-lg text-2xl sm:text-3xl text-[rgba(232,234,246,0.95)] group-hover:text-white transition-colors">
              Explore your inner data
            </span>
            <div className="p-1.5 rounded-full bg-[rgba(255,255,255,0.05)] group-hover:bg-[rgba(255,255,255,0.10)] text-[rgba(232,234,246,0.70)] group-hover:text-white transition-all">
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          <p className="text-xs text-[rgba(192,196,234,0.55)] mt-1">
            Deeper timeline history, longitudinal pattern evidence, signals, and all 6 core metrics
          </p>
        </div>

        <button
          onClick={onToggle}
          className="text-xs font-mono text-[rgba(108,114,232,0.90)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>{isOpen ? 'Collapse view' : 'Reveal deep dive'}</span>
          <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Expanded Deeper Technical Layers */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10 overflow-hidden pt-2"
          >
            {/* 1. Your Rhythm (Curved spatial timeline) */}
            <ObservatoryRhythm
              rhythm={rhythmData}
              sevenDaySlots={sevenDaySlots}
              onOpenCheckIn={onOpenCheckIn}
            />

            {/* 2. Patterns Emerging (Validated Phase 2 patterns) */}
            <ObservatoryPatterns
              patterns={patterns}
              isPatternsLoading={isPatternsLoading}
              onOpenCheckIn={onOpenCheckIn}
            />

            {/* 3. State Signals & Detailed 6 Dimensions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12">
                <ObservatorySignals personalState={personalState} />
              </div>

              <div className="lg:col-span-12">
                <ObservatoryDimensions
                  dimensions={dimensions}
                  selectedDimension={selectedDimension}
                  onSelectDimension={onSelectDimension}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
