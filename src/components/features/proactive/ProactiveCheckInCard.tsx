/**
 * Proactive Check-In Card
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Surfaces subtle, explainable check-ins and tailored suggestions when
 * multi-gate decision policy justifies outreach. Completely non-intrusive.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { ProactiveDecision } from '../../../server/engine/proactiveEngine/types';

interface ProactiveCheckInCardProps {
  onStartIntervention?: (interventionId: string) => void;
  onOpenCheckIn?: () => void;
}

export const ProactiveCheckInCard: React.FC<ProactiveCheckInCardProps> = ({
  onStartIntervention,
  onOpenCheckIn,
}) => {
  const { getAccessToken } = useAuth();
  const [decision, setDecision] = useState<ProactiveDecision | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const lastSurfacedKeyRef = React.useRef<string | null>(null);

  const fetchProactiveStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/proactive/check?timezone=${encodeURIComponent(userTimezone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: ProactiveDecision = await res.json();
        if (data.shouldSurface && !isDismissed) {
          setDecision(data);
          // Prevent duplicate surfaced event POSTs on re-renders/remounts
          const surfaceKey = `${data.evaluatedAt}_${data.actionType || 'checkin'}`;
          if (lastSurfacedKeyRef.current !== surfaceKey) {
            lastSurfacedKeyRef.current = surfaceKey;
            try {
              const surfacedRes = await fetch('/api/proactive/surfaced', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ decision: data }),
              });
              if (surfacedRes.ok) {
                const surfacedData = await surfacedRes.json();
                if (surfacedData?.event?.id) {
                  setEventId(surfacedData.event.id);
                }
              }
            } catch {
              // Graceful fallback
            }
          }
        } else {
          setDecision(null);
        }
      }
    } catch {
      // Graceful silence on failure
      setDecision(null);
    }
  }, [getAccessToken, isDismissed]);

  useEffect(() => {
    fetchProactiveStatus();

    // Re-check on tab focus / return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProactiveStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchProactiveStatus]);

  const handleDismiss = async () => {
    const targetEventId = eventId;
    setIsDismissed(true);
    setDecision(null);
    setEventId(null);

    if (targetEventId) {
      try {
        const token = await getAccessToken();
        if (token) {
          // Record dismissal buffer using actual surfaced event ID
          await fetch('/api/proactive/respond', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventId: targetEventId,
              response: 'dismissed',
            }),
          });
        }
      } catch {}
    }
  };

  const handleAct = async () => {
    const targetEventId = eventId;
    setIsResponding(true);

    if (targetEventId) {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch('/api/proactive/respond', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventId: targetEventId,
              response: 'acted_upon',
            }),
          });
        }
      } catch {}
    }

    if (decision?.suggestedInterventionId && onStartIntervention) {
      onStartIntervention(decision.suggestedInterventionId);
    } else if (onOpenCheckIn) {
      onOpenCheckIn();
    }
    setIsDismissed(true);
    setDecision(null);
    setEventId(null);
  };

  if (!decision || !decision.shouldSurface || isDismissed) {
    return null; // Silence preserved
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <Card className="p-5 border-[rgba(108,114,232,0.30)] bg-[rgba(108,114,232,0.06)] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[rgba(108,114,232,0.18)] border border-[rgba(108,114,232,0.30)] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-[#c0c4ea]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[rgba(232,234,246,0.95)]">
                    {decision.headline || 'Mindful Insight'}
                  </span>
                  <Badge variant="indigo" className="text-[10px] py-0 px-2">
                    Proactive Insight
                  </Badge>
                </div>
                <p className="text-xs text-[rgba(232,234,246,0.75)] leading-relaxed max-w-2xl">
                  {decision.message}
                </p>

                {decision.rationale && (
                  <div className="flex items-center gap-1.5 pt-1.5 text-[11px] text-[rgba(192,196,234,0.55)]">
                    <Clock className="w-3 h-3 text-[rgba(192,196,234,0.50)]" />
                    <span>Why you see this: {decision.rationale}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAct}
                disabled={isResponding}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {decision.suggestedInterventionId ? 'Start Reset' : 'Check In'}
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-[rgba(232,234,246,0.40)] hover:text-[rgba(232,234,246,0.80)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
