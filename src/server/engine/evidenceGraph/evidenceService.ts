/**
 * Evidence Service
 * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
 *
 * Coordinates dynamic read-time assembly of the Typed Provenance DAG
 * and deterministic Explanation Tree across State, Patterns, and Interventions.
 *
 * READ-TIME ASSEMBLY GUARANTEES:
 * - Pure dynamic query orchestration (under 10ms in memory, zero background sync jobs).
 * - Multi-tenant isolated (every query and node strictly bounded to authenticated userId).
 * - Zero mutation of underlying engines; StateEngine, PatternEngine, and InterventionEngine
 *   remain the sole authorities.
 */

import { isValidUuid } from '../providers';
import { stateService } from '../../services/stateService';
import { patternService } from '../../services/patternService';
import { interventionService } from '../../services/interventionService';
import { GraphBuilder } from './graphBuilder';
import { ExplanationBuilder } from './explanationBuilder';
import { EvidenceGraphResponse } from './types';

export const evidenceService = {
  /**
   * Generates the complete Evidence Graph and Explanation Tree for an authenticated user
   */
  async getEvidenceGraph(userId: string): Promise<EvidenceGraphResponse> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    // 1. Concurrently fetch all domain records for the user
    const [
      currentState,
      signals,
      baseline,
      patterns,
      recommendation,
      recentSessions,
      effectiveness,
    ] = await Promise.all([
      stateService.getCurrentState(userId).catch(() => null),
      stateService.getActiveSignals(userId).catch(() => []),
      stateService.getPersonalBaseline(userId).catch(() => undefined),
      patternService.getPatterns(userId).catch(() => []),
      interventionService.getRecommendation(userId).catch(() => null),
      interventionService.getUserHistory(userId, 10).catch(() => []),
      interventionService.getEffectiveness(userId).catch(() => ({})),
    ]);

    // 2. Build Typed Provenance DAG (enforcing tenant isolation, privacy, and crisis precedence)
    const graph = GraphBuilder.build({
      userId,
      currentState,
      signals,
      patterns,
      recommendation,
      recentSessions,
      effectiveness,
      baseline,
      referenceTime: new Date(),
    });

    // 3. Build Deterministic Explanation Tree (strictly non-causal)
    const explanations = ExplanationBuilder.build({
      userId,
      graph,
      currentState,
      signals,
      patterns,
      recommendation,
      recentSessions,
      effectiveness,
    });

    return {
      graph,
      explanations,
    };
  },
};
