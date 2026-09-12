/**
 * Inner Observatory — Insights View
 * Mindful 2.0 — Neuroscience-Inspired Personal Wellness Intelligence
 *
 * Implements an immersive, emotionally responsive 3D sanctuary that answers:
 * 1. How am I doing? (Living 3D state centerpiece with "YOU" orb + Mood/Energy/Focus trio)
 * 2. What is happening? (One concise evidence-based factual statement with micro-waveform)
 * 3. What may be influencing you? (Floating context & somatic sensation chips)
 * 4. Your next step (Actionable reflection CTA)
 * 5. Explore your inner data → (Progressive disclosure for timeline, patterns, and signals)
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { usePersonalState } from '../../context/StateContext';
import { StateDimensionKey } from '../../types';
import { calculateSevenDaySlots } from '../../lib/emotionalRhythm';
import {
  buildStateConstellation,
  buildHistoricalPath,
  buildCurrentStateSummary,
  buildDimensionSummary,
  deriveWhatsHappeningInsight,
} from '../../lib/observatoryHelpers';
import { ObservatoryHero } from './observatory/ObservatoryHero';
import { ObservatoryLivingSummary } from './observatory/ObservatoryLivingSummary';
import { ObservatoryDeepDive } from './observatory/ObservatoryDeepDive';
import { ObservatoryColdState } from './observatory/ObservatoryColdState';
import { MoodCheckInModal } from './MoodCheckInModal';
import { InterventionPlayerModal } from './intervention/InterventionPlayerModal';
import { useIntervention } from '../../context/InterventionContext';
import { Badge } from '../ui/Badge';
import { Calendar, RotateCw } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    moodLogs,
    personalState: appState,
    patterns: appPatterns,
    isPatternsLoading: appPatternsLoading,
  } = useApp();

  const {
    personalState: contextState,
    patterns: contextPatterns,
    isPatternsLoading: contextPatternsLoading,
    refreshPatterns,
  } = usePersonalState();

  // Prefer contextState, fallback to appState
  const personalState = contextState || appState;
  const patterns = contextPatterns && contextPatterns.length > 0 ? contextPatterns : (appPatterns || []);
  const isPatternsLoading = contextPatternsLoading || appPatternsLoading;

  const [selectedDimension, setSelectedDimension] = useState<StateDimensionKey | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const deepDiveRef = useRef<HTMLDivElement | null>(null);

  const { isPlayerOpen, closePlayer, playerIntervention } = useIntervention();

  // Derived 7-day slots from actual mood logs (strict zero-fabrication)
  const sevenDaySlots = useMemo(() => {
    return calculateSevenDaySlots(moodLogs || []);
  }, [moodLogs]);

  // Pure mathematical derivations
  const constellation = useMemo(() => {
    return buildStateConstellation(personalState);
  }, [personalState]);

  const rhythmData = useMemo(() => {
    return buildHistoricalPath(sevenDaySlots);
  }, [sevenDaySlots]);

  const stateSummary = useMemo(() => {
    return buildCurrentStateSummary(personalState);
  }, [personalState]);

  const dimensionSummaries = useMemo(() => {
    return buildDimensionSummary(personalState);
  }, [personalState]);

  const recordedSlotsCount = useMemo(() => {
    return sevenDaySlots.filter((s) => s.primaryLog !== null).length;
  }, [sevenDaySlots]);

  const whatsHappening = useMemo(() => {
    return deriveWhatsHappeningInsight(personalState, recordedSlotsCount, rhythmData);
  }, [personalState, recordedSlotsCount, rhythmData]);

  const isCompletelyCold = (!moodLogs || moodLogs.length === 0) && constellation.center.isCold;

  const handleExploreDetails = () => {
    setIsDeepDiveOpen(true);
    setTimeout(() => {
      deepDiveRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <>
      <MoodCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
      />
      <InterventionPlayerModal
        isOpen={isPlayerOpen}
        onClose={closePlayer}
        intervention={playerIntervention}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-10">
        {/* ── 1. HEADER: How are you doing? ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.16em] text-[rgba(108,114,232,0.90)]">
                Insights
              </span>
              <Badge variant="primary" size="sm">How Are You Doing?</Badge>
            </div>
            <h1 className="font-display-lg text-4xl sm:text-5xl text-[rgba(232,234,246,0.95)] tracking-tight">
              Your Inner Observatory
            </h1>
            <p className="font-body-md text-sm sm:text-base text-[rgba(192,196,234,0.65)] max-w-xl">
              An intimate, continuous reflection of your living state, illuminated through
              calibrated signal fusion.
            </p>
          </div>

          {/* Timeframe & Action Controls */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[rgba(232,234,246,0.75)] font-mono">
              <Calendar className="w-3.5 h-3.5 text-[rgba(108,114,232,0.85)]" />
              <span>7 Days Active</span>
            </div>

            <button
              onClick={() => void refreshPatterns()}
              disabled={isPatternsLoading}
              aria-label="Refresh pattern analysis"
              className="p-2 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)] text-[rgba(232,234,246,0.70)] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPatternsLoading ? 'animate-spin text-[#c0c4ea]' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 2. COLD STATE WELCOME BANNER (Only when completely 0 observations exist) ── */}
        {isCompletelyCold && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ObservatoryColdState onOpenCheckIn={() => setIsCheckInModalOpen(true)} />
          </motion.div>
        )}

        {/* ── 3. LIVING 3D INNER STATE CENTERPIECE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <ObservatoryHero
            constellation={constellation}
            selectedDimension={selectedDimension}
            onSelectDimension={setSelectedDimension}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
          />
        </motion.div>

        {/* ── 4. LIVING SUMMARY & EMOTIONAL ANSWERS ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ObservatoryLivingSummary
            summary={stateSummary}
            whatsHappening={whatsHappening}
            triggers={personalState?.contextualTriggers || []}
            sensations={personalState?.somaticMarkers || []}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
            onExploreDetails={handleExploreDetails}
          />
        </motion.div>

        {/* ── 5. PROGRESSIVE DISCLOSURE: Explore your inner data → ── */}
        <div ref={deepDiveRef}>
          <ObservatoryDeepDive
            isOpen={isDeepDiveOpen}
            onToggle={() => setIsDeepDiveOpen(!isDeepDiveOpen)}
            rhythmData={rhythmData}
            sevenDaySlots={sevenDaySlots}
            patterns={patterns}
            isPatternsLoading={isPatternsLoading}
            personalState={personalState}
            dimensions={dimensionSummaries}
            selectedDimension={selectedDimension}
            onSelectDimension={setSelectedDimension}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
          />
        </div>

        {/* Non-medical Disclaimer */}
        <div className="pt-8 border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-[rgba(232,234,246,0.35)] font-body-md max-w-2xl mx-auto">
          Mindful 2.0 inner observatory visualizations are personal self-reflection tools designed to illuminate
          longitudinal wellness patterns, not clinical psychiatric diagnoses or medical assessments.
        </div>
      </div>
    </>
  );
};
