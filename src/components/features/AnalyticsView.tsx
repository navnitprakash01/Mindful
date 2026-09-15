/**
 * Inner Observatory — Insights View
 * Mindful 2.0 — Neuroscience-Inspired Personal Wellness Intelligence
 *
 * Implements an immersive, emotionally responsive 3D sanctuary that answers:
 * 1. How am I doing? (Living 3D state centerpiece with "YOU" orb + Mood/Energy/Focus trio)
 * 2. What is happening? (One concise evidence-based factual statement with micro-waveform)
 * 3. What may be influencing you? (Floating context & somatic sensation chips)
 * 4. Explore your inner data → (Progressive disclosure for timeline, patterns, and signals)
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
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Calendar, RotateCw, Activity, Plus } from 'lucide-react';
import { useForecast } from '../../hooks/useForecast';
import { ForecastTrajectoryCard, WeeklyDigestCard } from './forecast';

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

  const { forecast, digest, isLoading: isForecastLoading } = useForecast();

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

  // Zero check-in cold state check
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

      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        {/* ── 1. OBSERVATORY HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#6c72e8]">
              Personal State Engine
            </span>
            <h1 className="font-display-lg text-3xl sm:text-4xl text-[rgba(232,234,246,0.95)] tracking-tight">
              Your Inner Observatory
            </h1>
            <p className="font-body-md text-sm sm:text-base text-[rgba(192,196,234,0.65)] max-w-xl">
              An intimate, continuous reflection of your living state, illuminated through
              calibrated signal fusion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshPatterns()}
              disabled={isPatternsLoading}
              className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] text-[rgba(232,234,246,0.70)] hover:text-white transition-all disabled:opacity-50"
              title="Refresh intelligence models"
              aria-label="Refresh intelligence models"
            >
              <RotateCw className={`w-4 h-4 ${isPatternsLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[rgba(232,234,246,0.70)]">
              <Calendar className="w-3.5 h-3.5 text-[#6c72e8]" />
              <span>Last 7 Days</span>
            </div>
          </div>
        </div>

        {/* ── 2. COLD STATE WELCOME BANNER (Only when completely 0 observations exist) ── */}
        {isCompletelyCold && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ObservatoryColdState onOpenCheckIn={() => setIsCheckInModalOpen(true)} />
          </motion.div>
        )}

        {/* ── 3. LIVING 3D INNER STATE CENTERPIECE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ObservatoryHero
            constellation={constellation}
            personalState={personalState}
            patterns={patterns}
            selectedDimension={selectedDimension}
            onSelectDimension={setSelectedDimension}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
            onExplorePatterns={handleExploreDetails}
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
            constellation={constellation}
            whatsHappening={whatsHappening}
            triggers={personalState?.contextualTriggers || []}
            sensations={personalState?.somaticMarkers || []}
            personalState={personalState}
            onOpenCheckIn={() => setIsCheckInModalOpen(true)}
            onExploreDetails={handleExploreDetails}
          />
        </motion.div>

        {/* ── 4.5. LONGITUDINAL WELLNESS INTELLIGENCE (Phase 13) ── */}
        {forecast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-6"
          >
            <ForecastTrajectoryCard forecast={forecast} isLoading={isForecastLoading} />
            {digest && <WeeklyDigestCard digest={digest} />}
          </motion.div>
        )}

        {/* ── 4.7. PERSONAL STATE OBSERVATORY — Dimension Breakdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
        >
          <div
            className="p-6 sm:p-8 rounded-[28px]"
            style={{
              background: 'rgba(15,18,34,0.50)',
              backdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.40)',
            }}
          >
            {/* Observatory Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(108,114,232,0.15)', border: '1px solid rgba(108,114,232,0.30)' }}
                >
                  <Activity className="w-4 h-4" style={{ color: '#c0c4ea' }} />
                </div>
                <div>
                  <h3 className="font-display-lg text-2xl" style={{ color: 'rgba(232,234,246,0.95)' }}>
                    Personal State
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(232,234,246,0.45)' }}>
                    <span>Based on your recent signals</span>
                    <div
                      className="group/tooltip relative inline-flex items-center cursor-help"
                      title={"Score: Mindful's current estimate on a 0–100 scale.\nConfidence: How reliable that estimate is based on the available signals."}
                      aria-label="Score and confidence explanation"
                    >
                      <span className="hover:text-[#c0c4ea] transition-colors" style={{ color: 'rgba(108,114,232,0.70)' }}>&#9432;</span>
                      <div
                        className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block w-64 p-2.5 rounded-xl text-[11px] shadow-2xl z-50 leading-relaxed text-left"
                        style={{ background: '#121526', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(232,234,246,0.85)' }}
                      >
                        <div className="font-semibold text-white mb-1">Score &amp; Confidence</div>
                        <div><strong className="text-[#c0c4ea]">Score:</strong> {"Mindful's current estimate on a 0–100 scale."}</div>
                        <div className="mt-1"><strong className="text-[#c0c4ea]">Confidence:</strong> How reliable that estimate is based on the available signals.</div>
                        <div className="mt-1.5 text-[10px] border-t pt-1" style={{ color: 'rgba(232,234,246,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                          Unified multimodal signal estimate • Exponential decay (t½ = 12h)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {((personalState?.overallConfidence ?? 0) >= 0.10 && (personalState?.activeSignalsCount ?? 0) > 0) ? (
                  <div
                    className="group relative cursor-help"
                    title="How certain Mindful is about this estimate based on the available information."
                    aria-label="How certain Mindful is about this estimate based on the available information."
                  >
                    <Badge variant="sage" size="sm">
                      Confidence {Math.round((personalState?.overallConfidence ?? 0) * 100)}%
                    </Badge>
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 p-2 rounded-lg text-[11px] shadow-xl z-50 text-center leading-tight"
                      style={{ background: '#121526', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(232,234,246,0.85)' }}
                    >
                      How certain Mindful is about this estimate based on the available information.
                    </div>
                  </div>
                ) : (
                  <Badge variant="amber" size="sm">Awaiting data</Badge>
                )}
              </div>
            </div>

            {/* Dimension Cards */}
            {isCompletelyCold ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(108,114,232,0.10)', border: '1px solid rgba(108,114,232,0.20)' }}
                >
                  <Activity className="w-6 h-6" style={{ color: 'rgba(108,114,232,0.60)' }} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="font-display-lg text-lg" style={{ color: 'rgba(232,234,246,0.80)' }}>
                    Establishing your baseline
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,234,246,0.40)' }}>
                    Complete your first mood check-in to activate the Personal State Engine and begin measuring your wellness dimensions.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsCheckInModalOpen(true)}
                >
                  Begin First Check-in
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { label: 'Mood', directionHint: 'Higher = more positive', value: personalState?.dimensions?.mood?.value ?? personalState?.mood ?? 50, confidence: Math.round((personalState?.dimensions?.mood?.confidence ?? 0) * 100), color: '#6ee7b7' },
                  { label: 'Stress', directionHint: 'Lower = less stress', value: personalState?.dimensions?.stress?.value ?? personalState?.stress ?? 50, confidence: Math.round((personalState?.dimensions?.stress?.confidence ?? 0) * 100), color: '#f4a8c0' },
                  { label: 'Tiredness', directionHint: 'Lower = less tired', value: personalState?.dimensions?.fatigue?.value ?? personalState?.fatigue ?? 50, confidence: Math.round((personalState?.dimensions?.fatigue?.confidence ?? 0) * 100), color: '#fbbf24' },
                  { label: 'Energy', directionHint: 'Higher = more energy', value: personalState?.dimensions?.energy?.value ?? personalState?.energy ?? 50, confidence: Math.round((personalState?.dimensions?.energy?.confidence ?? 0) * 100), color: '#38bdf8' },
                  { label: 'Focus', directionHint: 'Higher = better focus', value: personalState?.dimensions?.focus?.value ?? personalState?.focus ?? 50, confidence: Math.round((personalState?.dimensions?.focus?.confidence ?? 0) * 100), color: '#c0c4ea' },
                  { label: 'Mental Load', directionHint: 'Lower = less mental load', value: personalState?.dimensions?.cognitiveLoad?.value ?? personalState?.cognitiveLoad ?? 50, confidence: Math.round((personalState?.dimensions?.cognitiveLoad?.confidence ?? 0) * 100), color: '#a78bfa' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl flex flex-col justify-between relative hover:border-[rgba(255,255,255,0.12)] transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    title={`Score: Mindful's current estimate on a 0–100 scale.\nConfidence: ${item.confidence}% (How reliable this estimate is based on the available signals.)`}
                  >
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <span className="text-[10px] uppercase font-semibold tracking-wider truncate" style={{ color: 'rgba(232,234,246,0.40)' }}>
                        {item.label}
                      </span>
                      <div
                        className="group/cardtooltip relative inline-flex items-center cursor-help"
                        aria-label={`${item.label} confidence: ${item.confidence}%`}
                      >
                        <span className="text-[11px] hover:text-[#c0c4ea] transition-colors" style={{ color: 'rgba(108,114,232,0.50)' }}>&#9432;</span>
                        <div
                          className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover/cardtooltip:block w-48 p-2 rounded-xl text-[10px] shadow-2xl z-50 leading-snug text-left"
                          style={{ background: '#121526', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(232,234,246,0.85)' }}
                        >
                          <div className="font-semibold text-white mb-0.5">{item.label}</div>
                          <div><strong className="text-[#c0c4ea]">Score:</strong> {item.value} / 100</div>
                          <div><strong className="text-[#c0c4ea]">Confidence:</strong> {item.confidence}%</div>
                          <div className="mt-1 text-[9px] border-t pt-1" style={{ color: 'rgba(232,234,246,0.45)', borderColor: 'rgba(255,255,255,0.06)' }}>
                            Confidence reflects reliability based on available signals.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 my-1">
                      <span className="font-display-lg text-2xl" style={{ color: 'rgba(232,234,246,0.90)' }}>
                        {item.value}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(232,234,246,0.30)' }}>/100</span>
                    </div>

                    <p className="text-[10px] mb-2.5 leading-tight" style={{ color: 'rgba(232,234,246,0.40)' }}>
                      {item.directionHint}
                    </p>

                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: item.color,
                          boxShadow: `0 0 6px ${item.color}80`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
