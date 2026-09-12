/**
 * Proactive Decision Engine Types & Contracts
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

export type ProactiveActionType =
  | 'gentle_state_reflection'
  | 'pattern_check_in'
  | 'intervention_suggestion'
  | 'intervention_follow_up';

export type ProactiveDecisionType = 'surfaced' | 'suppressed';

export type SuppressionReason =
  | 'crisis_active'
  | 'opt_in_disabled'
  | 'quiet_hours_active'
  | 'frequency_cap_reached'
  | 'cooldown_active'
  | 'active_intervention_in_progress'
  | 'recent_dismissal'
  | 'insufficient_evidence'
  | 'low_confidence_state'
  | 'duplicate_recent_prompt';

export interface ProactiveSettings {
  enabled: boolean;
  frequencyCapPerDay: 1 | 2 | 3;
  quietHoursStart: number; // 0 - 23 (e.g. 22 for 10 PM)
  quietHoursEnd: number;   // 0 - 23 (e.g. 8 for 8 AM)
  userTimezone?: string;   // e.g. 'America/New_York', 'UTC'
}

export interface ProactiveEvent {
  id: string;
  userId: string;
  triggerType: string;
  decision: 'surfaced' | 'suppressed' | 'dismissed' | 'acted_upon';
  suppressionReason?: string;
  actionPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface ProactiveDecision {
  shouldSurface: boolean;
  decisionType: ProactiveDecisionType;
  actionType?: ProactiveActionType;
  suppressionReason?: SuppressionReason;
  headline?: string;
  message?: string;
  rationale: string;
  evidenceReferences: string[];
  suggestedInterventionId?: string;
  cooldownHoursRemaining?: number;
  evaluatedAt: string;
  policyVersion: string;
}
