/**
 * FocusSessionWidget Component
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Compact dashboard widget to launch or monitor deep work focus sessions.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain, Play, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { FocusSessionModal } from './FocusSessionModal';

interface FocusSessionWidgetProps {
  onTriggerIntervention?: (interventionId: string) => void;
}

export const FocusSessionWidget: React.FC<FocusSessionWidgetProps> = ({
  onTriggerIntervention,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card
        variant="zen"
        className="p-5 sm:p-6 relative overflow-hidden group hover:border-[rgba(108,114,232,0.35)] transition-all duration-300"
      >
        {/* Ambient Glow */}
        <div
          className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity"
          style={{ background: 'radial-gradient(circle, rgba(108,114,232,0.6) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(108,114,232,0.14)] border border-[rgba(108,114,232,0.25)] flex items-center justify-center text-[#c0c4ea] shrink-0 mt-0.5">
              <Brain className="w-5 h-5 text-[#818cf8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="lavender" size="sm">Deep Work</Badge>
                <span className="text-[11px] text-[rgba(192,196,234,0.45)] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#34d399]" /> Zero-Keylogging
                </span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Real-Time Cognitive Focus Session
              </h3>
              <p className="text-xs text-[rgba(192,196,234,0.50)] mt-0.5 max-w-md leading-relaxed">
                Track attentional flow and cognitive strain during deep work with zero keystroke recording.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="md"
            className="w-full sm:w-auto bg-[#6c72e8] hover:bg-[#5b61d6] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md whitespace-nowrap"
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Start Focus Session
          </Button>
        </div>
      </Card>

      <FocusSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTriggerIntervention={onTriggerIntervention}
      />
    </>
  );
};
