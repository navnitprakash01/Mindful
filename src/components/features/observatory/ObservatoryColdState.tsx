/**
 * Observatory Cold State
 * Mindful 2.0 — Insights UI/UX Redesign
 *
 * Rendered when the user has zero historical observations or uncalibrated baseline.
 * Welcomes the user with digital sanctuary aesthetics and invites them to log their first state.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Sparkles, Plus, Compass } from 'lucide-react';

interface ObservatoryColdStateProps {
  onOpenCheckIn: () => void;
}

export const ObservatoryColdState: React.FC<ObservatoryColdStateProps> = ({ onOpenCheckIn }) => {
  return (
    <Card className="p-8 sm:p-12 text-center bg-[rgba(13,15,26,0.60)] border-[rgba(255,255,255,0.07)] backdrop-blur-xl relative overflow-hidden space-y-6">
      {/* Soft central radiant orb */}
      <div className="w-16 h-16 rounded-3xl bg-[rgba(108,114,232,0.12)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center mx-auto text-[#c0c4ea] shadow-[0_0_32px_rgba(108,114,232,0.30)]">
        <Compass className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="primary" size="sm">First Arrival</Badge>
        </div>
        <h3 className="font-display-lg text-3xl text-[rgba(232,234,246,0.95)] tracking-tight">
          Your Observatory Is Just Opening
        </h3>
        <p className="font-body-md text-sm sm:text-base text-[rgba(192,196,234,0.65)] leading-relaxed">
          Mindful needs a little more real-world data before it can map your personal patterns
          and longitudinal rhythms. Each check-in calibrates your 6-dimensional constellation.
        </p>
      </div>

      <div>
        <button
          onClick={onOpenCheckIn}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6c72e8] to-[#8b5cf6] hover:opacity-95 text-white font-medium text-sm shadow-[0_4px_20px_rgba(108,114,232,0.40)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Log Your State
        </button>
      </div>
    </Card>
  );
};
