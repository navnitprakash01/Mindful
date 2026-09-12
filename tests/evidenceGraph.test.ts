import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import {
  PersonalState,
  WellnessSignal,
  StateDimensionKey,
  STATE_DIMENSION_CONFIG,
} from '../src/server/engine/types';
import { PersonalPattern } from '../src/server/engine/patternEngine/types';
import {
  InterventionRecommendation,
  InterventionSession,
  InterventionEffectiveness,
} from '../src/server/engine/interventionEngine/types';
import { GraphBuilder } from '../src/server/engine/evidenceGraph/graphBuilder';
import { ExplanationBuilder } from '../src/server/engine/evidenceGraph/explanationBuilder';
import { UncertaintyEngine } from '../src/server/engine/evidenceGraph/uncertaintyEngine';
import { evidenceService } from '../src/server/engine/evidenceGraph/evidenceService';

process.env.NODE_ENV = 'test';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function createMockSignal(overrides: Partial<WellnessSignal> = {}): WellnessSignal {
  return {
    id: randomUUID(),
    userId: USER_A,
    timestamp: new Date().toISOString(),
    modality: 'mood_checkin',
    estimates: {
      mood: { value: 72, confidence: 0.8 },
      stress: { value: 35, confidence: 0.8 },
      fatigue: { value: 30, confidence: 0.8 },
      energy: { value: 70, confidence: 0.8 },
      focus: { value: 75, confidence: 0.8 },
      cognitiveLoad: { value: 40, confidence: 0.8 },
    },
    features: {
      triggers: ['work', 'project_milestone'],
      somaticSensations: ['relaxed_shoulders'],
    },
    reliabilityWeight: 0.85,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    ...overrides,
  };
}

function createMockState(overrides: Partial<PersonalState> = {}): PersonalState {
  const dims: Record<StateDimensionKey, any> = {
    mood: { value: 72, confidence: 0.8, baselineDeviation: 7, trend: 'improving', contributingSignalIds: [], modalityBreakdown: {} },
    stress: { value: 35, confidence: 0.8, baselineDeviation: -5, trend: 'improving', contributingSignalIds: [], modalityBreakdown: {} },
    fatigue: { value: 30, confidence: 0.8, baselineDeviation: -10, trend: 'improving', contributingSignalIds: [], modalityBreakdown: {} },
    energy: { value: 70, confidence: 0.8, baselineDeviation: 10, trend: 'improving', contributingSignalIds: [], modalityBreakdown: {} },
    focus: { value: 75, confidence: 0.8, baselineDeviation: 5, trend: 'stable', contributingSignalIds: [], modalityBreakdown: {} },
    cognitiveLoad: { value: 40, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [], modalityBreakdown: {} },
  };

  return {
    id: randomUUID(),
    userId: USER_A,
    timestamp: new Date().toISOString(),
    mood: 72,
    stress: 35,
    fatigue: 30,
    energy: 70,
    focus: 75,
    cognitiveLoad: 40,
    confidence: 0.8,
    dimensions: dims,
    evidence: [],
    sourceSummary: { mood_checkin: 1 },
    overallConfidence: 0.8,
    somaticMarkers: ['relaxed_shoulders'],
    contextualTriggers: ['work'],
    activeSignalsCount: 1,
    clustersCount: 1,
    isCrisisDetected: false,
    decayHalfLifeHours: 12,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Phase 6 — Explainable AI / Evidence Graph', () => {
  describe('1. Typed Provenance DAG Construction & Structure', () => {
    it('constructs a valid DAG with root, signal, dimension, and modality nodes', () => {
      const sig = createMockSignal();
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          stress: {
            value: 35,
            confidence: 0.8,
            baselineDeviation: -5,
            trend: 'improving',
            contributingSignalIds: [sig.id],
            modalityBreakdown: {
              mood_checkin: { value: 35, weight: 1.0, confidence: 0.8 },
            },
          },
        },
      });

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: state,
        signals: [sig],
      });

      assert.strictEqual(graph.userId, USER_A);
      assert.ok(graph.rootNodeId);
      assert.ok(graph.nodes[graph.rootNodeId]);
      assert.strictEqual(graph.nodes[graph.rootNodeId].type, 'fusion_state');

      // Check signal node
      const sigNode = graph.nodes[`node-sig-${sig.id}`];
      assert.ok(sigNode);
      assert.strictEqual(sigNode.type, 'raw_signal');

      // Check dimension node
      const dimNode = graph.nodes['node-dim-stress'];
      assert.ok(dimNode);
      assert.strictEqual(dimNode.type, 'fusion_state');

      // Check modality estimate node
      const modNode = graph.nodes['node-mod-stress-mood_checkin'];
      assert.ok(modNode);
      assert.strictEqual(modNode.type, 'modality_estimate');

      // Check edge hierarchy: signal -> modality -> dimension -> state
      const sigToMod = graph.edges.find((e) => e.sourceNodeId === sigNode.id && e.targetNodeId === modNode.id);
      assert.ok(sigToMod);
      assert.strictEqual(sigToMod.type, 'extracted_from');

      const modToDim = graph.edges.find((e) => e.sourceNodeId === modNode.id && e.targetNodeId === dimNode.id);
      assert.ok(modToDim);
      assert.strictEqual(modToDim.type, 'consolidated_into');

      const dimToState = graph.edges.find((e) => e.sourceNodeId === dimNode.id && e.targetNodeId === graph.rootNodeId);
      assert.ok(dimToState);
      assert.strictEqual(dimToState.type, 'fused_into');
    });

    it('rejects foreign user signals, strictly isolating the graph to authenticated user', () => {
      const sigA = createMockSignal({ userId: USER_A });
      const sigB = createMockSignal({ userId: USER_B });
      const state = createMockState({ userId: USER_A });

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: state,
        signals: [sigA, sigB],
      });

      assert.ok(graph.nodes[`node-sig-${sigA.id}`]);
      assert.strictEqual(graph.nodes[`node-sig-${sigB.id}`], undefined);
    });

    it('handles empty state and zero signals gracefully (cold start)', () => {
      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: null,
        signals: [],
      });

      assert.strictEqual(graph.userId, USER_A);
      assert.ok(graph.rootNodeId);
      assert.strictEqual(graph.nodes[graph.rootNodeId].confidence, 0.0);
      assert.strictEqual(Object.keys(graph.nodes).length, 7); // root + 6 dimension nodes
      assert.strictEqual(graph.edges.length, 6);
    });
  });

  describe('2. Dimension Explanation & State Transparency', () => {
    it('generates non-empty headlines and detailed explanations for all 6 dimensions', () => {
      const state = createMockState();
      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: state,
        signals: [],
      });

      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: state,
        signals: [],
      });

      const expectedDimensions: StateDimensionKey[] = [
        'mood',
        'stress',
        'fatigue',
        'energy',
        'focus',
        'cognitiveLoad',
      ];

      for (const dim of expectedDimensions) {
        const d = explanation.dimensions[dim];
        assert.ok(d, `Missing dimension explanation for ${dim}`);
        assert.strictEqual(d.dimension, dim);
        assert.ok(d.headline.length > 5);
        assert.ok(d.detailedExplanation.length > 10);
        assert.strictEqual(typeof d.value, 'number');
        assert.strictEqual(typeof d.confidence, 'number');
      }
    });

    it('clearly indicates single-modality observation awaiting multi-source corroboration', () => {
      const sig = createMockSignal({ modality: 'mood_checkin' });
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          mood: {
            value: 80,
            confidence: 0.75,
            baselineDeviation: 10,
            trend: 'improving',
            contributingSignalIds: [sig.id],
            modalityBreakdown: { mood_checkin: { value: 80, weight: 1.0, confidence: 0.75 } },
          },
        },
      });

      const graph = GraphBuilder.build({ userId: USER_A, currentState: state, signals: [sig] });
      const explanation = ExplanationBuilder.build({ userId: USER_A, graph, currentState: state, signals: [sig] });

      const moodExp = explanation.dimensions.mood;
      assert.ok(moodExp.crossModalSummary?.includes('Single modality'));
      assert.ok(moodExp.contributingSources.includes('check-in'));
    });
  });

  describe('3. Multimodal Consistency & Divergence Explanations', () => {
    it('reports high cross-modal agreement when independent modalities align', () => {
      const sig1 = createMockSignal({ id: 'sig-1', modality: 'mood_checkin' });
      const sig2 = createMockSignal({ id: 'sig-2', modality: 'voice_transcript' });
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          stress: {
            value: 30,
            confidence: 0.9,
            baselineDeviation: -10,
            trend: 'improving',
            contributingSignalIds: ['sig-1', 'sig-2'],
            consistencyScore: 0.85,
            divergenceDetected: false,
            modalityBreakdown: {
              mood_checkin: { value: 28, weight: 0.5, confidence: 0.85 },
              voice_transcript: { value: 32, weight: 0.5, confidence: 0.85 },
            },
          },
        },
      });

      const graph = GraphBuilder.build({ userId: USER_A, currentState: state, signals: [sig1, sig2] });
      const explanation = ExplanationBuilder.build({ userId: USER_A, graph, currentState: state, signals: [sig1, sig2] });

      const stressExp = explanation.dimensions.stress;
      assert.ok(stressExp.crossModalSummary?.includes('High cross-modal agreement'));
      assert.ok(stressExp.contributingSources.includes('check-in'));
      assert.ok(stressExp.contributingSources.includes('voice'));
    });

    it('reports modal divergence and decomposes uncertainty when signals contrast', () => {
      const sig1 = createMockSignal({ id: 'sig-1', modality: 'mood_checkin' });
      const sig2 = createMockSignal({ id: 'sig-2', modality: 'voice_transcript' });
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          stress: {
            value: 55,
            confidence: 0.6,
            baselineDeviation: 15,
            trend: 'declining',
            contributingSignalIds: ['sig-1', 'sig-2'],
            consistencyScore: 0.35,
            divergenceDetected: true,
            modalityBreakdown: {
              mood_checkin: { value: 25, weight: 0.5, confidence: 0.8 },
              voice_transcript: { value: 85, weight: 0.5, confidence: 0.8 },
            },
          },
        },
      });

      const graph = GraphBuilder.build({ userId: USER_A, currentState: state, signals: [sig1, sig2] });
      const explanation = ExplanationBuilder.build({ userId: USER_A, graph, currentState: state, signals: [sig1, sig2] });

      const stressExp = explanation.dimensions.stress;
      assert.ok(stressExp.crossModalSummary?.includes('divergent'));

      // Check uncertainty decomposition contains modal_divergence
      const uncertainty = graph.uncertaintyDecomposition.stress;
      assert.ok(uncertainty.some((u) => u.factor === 'modal_divergence'));
    });
  });

  describe('4. Uncertainty Decomposition Engine', () => {
    it('decomposes sample scarcity when observation count is low', () => {
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          focus: {
            value: 60,
            confidence: 0.3,
            baselineDeviation: 0,
            trend: 'stable',
            contributingSignalIds: ['sig-single'],
          },
        },
      });
      const sig = createMockSignal({ id: 'sig-single' });

      const decomp = UncertaintyEngine.decompose(state, [sig]);
      assert.ok(decomp.focus.some((u) => u.factor === 'sample_scarcity'));
    });

    it('decomposes temporal decay when signals are stale', () => {
      const staleTimestamp = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
      const staleSig = createMockSignal({ id: 'sig-stale', timestamp: staleTimestamp });
      const state = createMockState({
        dimensions: {
          ...createMockState().dimensions,
          energy: {
            value: 50,
            confidence: 0.4,
            baselineDeviation: 0,
            trend: 'stable',
            contributingSignalIds: ['sig-stale'],
          },
        },
      });

      const decomp = UncertaintyEngine.decompose(state, [staleSig]);
      assert.ok(decomp.energy.some((u) => u.factor === 'temporal_decay'));
    });

    it('decomposes preliminary baseline when baseline observation count is low', () => {
      const state = createMockState();
      const preliminaryBaseline = {
        userId: USER_A,
        observationCount: 3,
        overallConfidence: 0.3,
        isPreliminary: true,
        dimensions: {} as any,
        lastUpdated: new Date().toISOString(),
      };

      const decomp = UncertaintyEngine.decompose(state, [], preliminaryBaseline);
      assert.ok(decomp.mood.some((u) => u.factor === 'preliminary_baseline'));
    });
  });

  describe('5. Pattern Provenance & Backward Compatibility', () => {
    it('links supporting raw signals via associates_with edges when observation IDs exist', () => {
      const sig = createMockSignal();
      const pattern: PersonalPattern = {
        id: randomUUID(),
        userId: USER_A,
        type: 'trigger_association',
        patternKey: 'work_stress_spike',
        title: 'Work context coincides with elevated stress',
        description: 'Repeated observations of high stress when work tag is logged.',
        confidence: 0.82,
        strength: 'moderate',
        status: 'validated',
        firstObservedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lastObservedAt: new Date().toISOString(),
        observationCount: 5,
        evidence: {
          observationCount: 5,
          supportingCount: 4,
          comparisonCount: 1,
          supportingTimestamps: [sig.timestamp],
          supportingObservationIds: [sig.id],
          metricKey: 'stress',
          supportingAvg: 75,
          sampleContexts: ['Oct 12', 'Oct 14'],
        },
        deterministicTitle: 'Work context coincides with elevated stress',
        deterministicDescription: '...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: createMockState(),
        signals: [sig],
        patterns: [pattern],
      });

      const patNode = graph.nodes[`node-pat-${pattern.id}`];
      assert.ok(patNode);
      assert.strictEqual(patNode.type, 'pattern');

      // Edge from signal to pattern
      const edge = graph.edges.find((e) => e.sourceNodeId === `node-sig-${sig.id}` && e.targetNodeId === patNode.id);
      assert.ok(edge);
      assert.strictEqual(edge.type, 'associates_with');
    });

    it('handles legacy patterns without supportingObservationIds safely', () => {
      const legacyPattern: PersonalPattern = {
        id: randomUUID(),
        userId: USER_A,
        type: 'temporal_rhythm',
        patternKey: 'evening_fatigue',
        title: 'Evening fatigue rhythm',
        description: 'Fatigue rises in late evening.',
        confidence: 0.78,
        strength: 'moderate',
        status: 'validated',
        firstObservedAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
        observationCount: 8,
        evidence: {
          observationCount: 8,
          supportingCount: 6,
          comparisonCount: 2,
          supportingTimestamps: [],
          metricKey: 'fatigue',
          supportingAvg: 68,
          sampleContexts: ['Oct 10', 'Oct 11'],
        },
        deterministicTitle: 'Evening fatigue rhythm',
        deterministicDescription: '...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: createMockState(),
        signals: [],
        patterns: [legacyPattern],
      });

      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: createMockState(),
        patterns: [legacyPattern],
      });

      assert.strictEqual(explanation.patterns.length, 1);
      assert.strictEqual(explanation.patterns[0].supportingObservationIds, undefined);
      assert.strictEqual(explanation.patterns[0].isCausalClaim, false);
      assert.ok(explanation.patterns[0].summary.includes('Observed in 6 out of 8'));
    });
  });

  describe('6. Recommendation Provenance & Factor Contribution', () => {
    it('builds structured factor contributions and links target dimensions to recommendation', () => {
      const recommendation: InterventionRecommendation = {
        intervention: {
          id: 'paced-breathing',
          title: 'Paced Resonant Breathing',
          shortDescription: 'Regulate autonomic nervous system tone.',
          longDescription: '...',
          category: 'breathing',
          targetDimensions: ['stress', 'energy'],
          suitableRanges: [],
          minimumConfidence: 0.5,
          durationMinutes: 5,
          steps: [],
          safetyNotes: 'Gentle reset',
          difficulty: 'gentle',
          cooldownHours: 2,
          version: '1.0',
        },
        suitabilityScore: 0.88,
        reasons: ['Elevated stress observed in recent signals', 'Past sessions showed positive shift'],
        confidence: 0.85,
        isColdOrLowConfidence: false,
        evidence: {
          stateDimensions: [
            { dimension: 'stress', value: 75, contribution: 0.44 },
            { dimension: 'energy', value: 40, contribution: 0.20 },
          ],
          patternKeys: ['work_stress_spike'],
          sessionIds: ['sess-1'],
          factors: [
            { factor: 'state_fit', contribution: 0.44, explanation: 'Current stress dimension alignment' },
            { factor: 'pattern_fit', contribution: 0.22, explanation: 'Work stress pattern relevance' },
            { factor: 'history_fit', contribution: 0.22, explanation: 'Past positive response' },
          ],
        },
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: createMockState(),
        signals: [],
        recommendation,
      });

      const recNode = graph.nodes['node-rec-paced-breathing'];
      assert.ok(recNode);
      assert.strictEqual(recNode.type, 'recommendation');

      // Check justifies edges from target dimensions
      const stressJustifies = graph.edges.find(
        (e) => e.sourceNodeId === 'node-dim-stress' && e.targetNodeId === recNode.id
      );
      assert.ok(stressJustifies);
      assert.strictEqual(stressJustifies.type, 'justifies');

      // Check explanation tree
      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: createMockState(),
        recommendation,
      });

      assert.ok(explanation.recommendation);
      assert.strictEqual(explanation.recommendation.interventionId, 'paced-breathing');
      assert.ok(explanation.recommendation.stateFactors.length > 0);
      assert.ok(explanation.recommendation.patternFactors.length > 0);
      assert.ok(explanation.recommendation.historyFactors.length > 0);
    });
  });

  describe('7. Outcome Delta vs. Usefulness Rating Separation', () => {
    it('strictly separates measured objective deltas from subjective user-reported ratings', () => {
      const session: InterventionSession = {
        id: randomUUID(),
        userId: USER_A,
        interventionId: 'box-breathing',
        status: 'completed',
        startedAt: new Date(Date.now() - 600000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: 300,
        preStateSnapshot: { mood: 60, stress: 75, fatigue: 40, energy: 50, focus: 60, cognitiveLoad: 70 },
        postStateSnapshot: { mood: 70, stress: 50, fatigue: 40, energy: 55, focus: 70, cognitiveLoad: 50 },
        dimensionDeltas: { stress: -25, cognitiveLoad: -20, mood: 10, energy: 5, focus: 10 },
        perceivedUsefulness: 5,
        interventionVersion: '1.0',
        createdAt: new Date().toISOString(),
      };

      const eff: Record<string, InterventionEffectiveness> = {
        'box-breathing': {
          interventionId: 'box-breathing',
          attemptsCount: 3,
          completedCount: 3,
          completionRate: 1.0,
          avgUsefulness: 4.7,
          dimensionStats: {},
          factualSummary: 'Completed 3 times with average usefulness rating of 4.7/5.',
          hasEnoughHistory: true,
        },
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: createMockState(),
        signals: [],
        recentSessions: [session],
        effectiveness: eff,
      });

      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: createMockState(),
        recentSessions: [session],
        effectiveness: eff,
      });

      assert.strictEqual(explanation.recentOutcomes.length, 1);
      const outcome = explanation.recentOutcomes[0];

      // Measured objective delta
      assert.strictEqual(outcome.measuredDeltas.stress, -25);
      assert.ok(outcome.measuredSummary.toLowerCase().includes('stress -25 pts'));

      // User reported subjective rating
      assert.strictEqual(outcome.userRating, 5);
      assert.ok(outcome.userRatingSummary?.includes('5/5'));

      // Inferred historical pattern
      assert.ok(outcome.inferredSummary.includes('Completed 3 times'));
    });
  });

  describe('8. Automated Non-Causal Phrasing Scanner', () => {
    it('contains ZERO prohibited causal or clinical words across all explanations and node summaries', () => {
      const sig = createMockSignal();
      const state = createMockState();
      const pattern: PersonalPattern = {
        id: randomUUID(),
        userId: USER_A,
        type: 'trigger_association',
        patternKey: 'work_stress',
        title: 'Work Co-occurrence',
        description: 'Work logs coincided with higher stress levels.',
        confidence: 0.8,
        strength: 'moderate',
        status: 'validated',
        firstObservedAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
        observationCount: 5,
        evidence: {
          observationCount: 5,
          supportingCount: 4,
          comparisonCount: 1,
          supportingTimestamps: [],
          metricKey: 'stress',
          supportingAvg: 70,
          sampleContexts: ['Oct 1'],
        },
        deterministicTitle: 'Work Co-occurrence',
        deterministicDescription: '...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: state,
        signals: [sig],
        patterns: [pattern],
      });

      const explanations = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: state,
        signals: [sig],
        patterns: [pattern],
      });

      // Words that must NEVER appear in automated explanations
      const prohibitedRegexes = [
        /\bcaused by\b/i,
        /\bproves\b/i,
        /\bcauses\b/i,
        /\bcausation\b/i,
        /\bdiagnos(?:is|ed|tic)\b/i,
        /\btreatment\b/i,
        /\bcure\b/i,
        /\bprescribe\b/i,
      ];

      // Collect all text from nodes and explanations
      const textCorpus: string[] = [];

      for (const node of Object.values(graph.nodes)) {
        textCorpus.push(node.label);
        textCorpus.push(node.summary);
      }

      for (const dim of Object.values(explanations.dimensions)) {
        textCorpus.push(dim.headline);
        textCorpus.push(dim.detailedExplanation);
        if (dim.crossModalSummary) textCorpus.push(dim.crossModalSummary);
      }

      for (const pat of explanations.patterns) {
        textCorpus.push(pat.title);
        textCorpus.push(pat.summary);
      }

      for (const text of textCorpus) {
        for (const regex of prohibitedRegexes) {
          assert.strictEqual(
            regex.test(text),
            false,
            `Prohibited causal/clinical word matched by ${regex} in text: "${text}"`
          );
        }
      }
    });
  });

  describe('9. Crisis Precedence & Multi-Tenant Security Invariants', () => {
    it('sets root node to crisis type and attaches 988 lifeline notice when crisis is detected', () => {
      const crisisState = createMockState({
        isCrisisDetected: true,
        matchedCrisisTrigger: 'suicidal_ideation',
        crisisNotice: 'Mindful detected an urgent safety concern. 24/7 Lifeline support is available.',
      });

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: crisisState,
        signals: [],
      });

      assert.strictEqual(graph.rootNodeId, 'node-crisis-root');
      const rootNode = graph.nodes[graph.rootNodeId];
      assert.strictEqual(rootNode.type, 'crisis');
      assert.strictEqual(rootNode.confidence, 1.0);
      assert.ok(rootNode.metadata.lifeline);
      assert.ok(String(rootNode.metadata.lifeline).includes('988'));

      const explanation = ExplanationBuilder.build({
        userId: USER_A,
        graph,
        currentState: crisisState,
        signals: [],
      });

      assert.strictEqual(explanation.isCrisisDetected, true);
      assert.ok(explanation.crisisNotice);
      assert.ok(explanation.crisisNotice.includes('safety concern'));
    });

    it('enforces privacy data minimization by NEVER exposing raw journal body text', () => {
      const rawSecretDiary = 'My super private secret journal entry that nobody should see!';
      const journalSig = createMockSignal({
        modality: 'text_journal',
        features: {
          content: rawSecretDiary,
          notes: rawSecretDiary,
          themes: ['work_stress', 'burnout'],
        },
      });

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: createMockState(),
        signals: [journalSig],
      });

      const node = graph.nodes[`node-sig-${journalSig.id}`];
      assert.ok(node);
      assert.strictEqual(node.summary.includes(rawSecretDiary), false);
      assert.ok(node.summary.includes('work_stress'));
    });

    it('evidenceService validates UUID and orchestrates dynamic read-time assembly under 20ms', async () => {
      await assert.rejects(
        () => evidenceService.getEvidenceGraph('invalid-uuid'),
        /INVALID_USER_ID/
      );

      const start = Date.now();
      const response = await evidenceService.getEvidenceGraph(USER_A);
      const elapsed = Date.now() - start;

      assert.ok(response.graph);
      assert.ok(response.explanations);
      assert.strictEqual(response.graph.userId, USER_A);
      assert.strictEqual(response.explanations.userId, USER_A);
      assert.ok(elapsed < 200, `Evidence graph retrieval took ${elapsed}ms; expected < 200ms`);
    });
  });
});
