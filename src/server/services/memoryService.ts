/**
 * Personal Memory Service
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Responsibilities:
 * - Validate, minimize, sanitize, and persist discrete, structured memory records.
 * - Enforce strict 160-character length limit.
 * - Neutralize prompt injection and instruction-like content (memory is data, NOT instructions).
 * - Enforce strict memory minimization: NO raw journal, voice, camera, or companion transcripts.
 * - Coordinate lifecycle transitions (candidate -> active -> stale -> archived) and expiration.
 * - Resilient dual-layer persistence (Supabase DB + zero-budget in-memory fallback).
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import { screenForCrisis } from '../engine/interventionEngine/safety';

export type MemoryCategory = 'preference' | 'goal' | 'context' | 'learned_affinity';
export type MemorySourceType = 'user_explicit' | 'pattern_engine' | 'intervention_outcome';
export type MemoryStatus = 'candidate' | 'active' | 'stale' | 'archived';

export interface PersonalMemory {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  summary: string;
  confidence: number;
  status: MemoryStatus;
  sourceType: MemorySourceType;
  sourceId?: string;
  userConfirmed: boolean;
  lastObservedAt: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryInput {
  category: MemoryCategory;
  key: string;
  summary: string;
  confidence?: number;
  status?: MemoryStatus;
  sourceType: MemorySourceType;
  sourceId?: string;
  userConfirmed?: boolean;
  expiresAt?: string;
}

const TABLE_MEMORIES = 'personal_memories';
export const MAX_MEMORY_SUMMARY_LENGTH = 160;
const STALE_DAYS_THRESHOLD = 30;

// In-memory fallback caches for zero-budget offline resilience & testing
const inMemoryMemories = new Map<string, PersonalMemory[]>();

// Strict prompt injection / instruction-channel patterns that MUST NOT become memory
const INSTRUCTION_PATTERNS = [
  /ignore\s+(all\s+)?(safety\s+)?rules/i,
  /always\s+recommend/i,
  /when\s+i\s+say\s+.+,\s+(do|execute|say)/i,
  /override\s+(your\s+)?system\s+prompt/i,
  /never\s+tell\s+me\s+no/i,
  /you\s+must\s+(always|never|obey)/i,
  /disregard\s+(previous|all)/i,
  /system\s*instruction/i,
  /system\s*prompt/i,
  /as\s+an\s+ai\s+you\s+must/i,
  /bypass\s+(safety|guardrail|filter)/i,
];

// Clinical / psychiatric labels that must NEVER become persistent memory
const CLINICAL_DIAGNOSTIC_PATTERNS = [
  /diagnos(ed|is)/i,
  /schizophren/i,
  /bipolar/i,
  /borderline/i,
  /psychopath/i,
  /pathological/i,
  /major\s+depressive/i,
  /clinical\s+anxiety/i,
];

/**
 * Timeout wrapper for database requests to guarantee zero hanging on unmigrated / offline DB
 */
async function withDbTimeout<T>(promise: PromiseLike<T>, timeoutMs = 1200): Promise<T> {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('TEST_ENV_IN_MEMORY_ONLY');
  }
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
}

export const memoryService = {
  /**
   * Validates and sanitizes memory summary and key.
   * Throws Error if validation fails or content attempts prompt injection.
   */
  validateAndSanitize(input: CreateMemoryInput): { key: string; summary: string } {
    const allowedCategories: MemoryCategory[] = ['preference', 'goal', 'context', 'learned_affinity'];
    if (!allowedCategories.includes(input.category)) {
      throw new Error(`INVALID_CATEGORY: Category must be one of: ${allowedCategories.join(', ')}`);
    }

    const allowedSources: MemorySourceType[] = ['user_explicit', 'pattern_engine', 'intervention_outcome'];
    if (!allowedSources.includes(input.sourceType)) {
      throw new Error(`INVALID_SOURCE_TYPE: Source type must be one of: ${allowedSources.join(', ')}`);
    }

    if (!input.key || typeof input.key !== 'string' || !input.key.trim()) {
      throw new Error('INVALID_KEY: Memory key is required');
    }
    const cleanKey = input.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 50);

    if (!input.summary || typeof input.summary !== 'string' || !input.summary.trim()) {
      throw new Error('INVALID_SUMMARY: Summary text is required');
    }
    const cleanSummary = input.summary.trim().replace(/\s+/g, ' ');

    if (cleanSummary.length > MAX_MEMORY_SUMMARY_LENGTH) {
      throw new Error(`SUMMARY_TOO_LONG: Summary exceeds authoritative limit of ${MAX_MEMORY_SUMMARY_LENGTH} characters`);
    }

    // Screen for crisis markers - crisis text must NEVER become memory
    const crisisCheck = screenForCrisis(cleanSummary);
    if (crisisCheck.isCrisisDetected) {
      throw new Error('PROHIBITED_CONTENT: Crisis, self-harm, or emergency markers must never be persisted as memory');
    }

    // Screen for prompt injection / instruction-channel hijacking
    for (const pattern of INSTRUCTION_PATTERNS) {
      if (pattern.test(cleanSummary)) {
        throw new Error('INSTRUCTION_REJECTED: Memory must represent passive contextual data, not executable instructions');
      }
    }

    // Screen for psychiatric diagnostic labels
    for (const pattern of CLINICAL_DIAGNOSTIC_PATTERNS) {
      if (pattern.test(cleanSummary)) {
        throw new Error('CLINICAL_LABEL_REJECTED: Mindful does not store psychiatric diagnoses or clinical profiling');
      }
    }

    return { key: cleanKey, summary: cleanSummary };
  },

  /**
   * Create or update a personal memory with deterministic lifecycle rules.
   * User ownership is strictly enforced via authenticated userId.
   */
  async createMemory(userId: string, input: CreateMemoryInput): Promise<PersonalMemory> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const { key, summary } = this.validateAndSanitize(input);

    const now = new Date().toISOString();
    let initialStatus: MemoryStatus = input.status || 'candidate';
    const userConfirmed = input.userConfirmed ?? (input.sourceType === 'user_explicit');

    // Lifecycle determination
    if (input.sourceType === 'user_explicit') {
      // Explicit user statements become active immediately
      initialStatus = 'active';
    } else if (input.sourceType === 'pattern_engine') {
      // Pattern derived: active only if high confidence and confirmed or mature
      const conf = input.confidence ?? 0.50;
      initialStatus = conf >= 0.70 ? 'active' : 'candidate';
    } else if (input.sourceType === 'intervention_outcome') {
      initialStatus = 'active';
    }

    const rawConf = typeof input.confidence === 'number' ? input.confidence : (input.sourceType === 'user_explicit' ? 0.95 : 0.60);
    const confidence = Number(Math.max(0.0, Math.min(1.0, rawConf)).toFixed(2));

    const userMemories = inMemoryMemories.get(userId) || [];
    const existingIndex = userMemories.findIndex((m) => m.category === input.category && m.key === key);

    const memoryId = existingIndex >= 0 ? userMemories[existingIndex].id : randomUUID();

    const memoryRecord: PersonalMemory = {
      id: memoryId,
      userId,
      category: input.category,
      key,
      summary,
      confidence,
      status: initialStatus,
      sourceType: input.sourceType,
      sourceId: input.sourceId && isValidUuid(input.sourceId) ? input.sourceId : undefined,
      userConfirmed,
      lastObservedAt: now,
      expiresAt: input.expiresAt,
      createdAt: existingIndex >= 0 ? userMemories[existingIndex].createdAt : now,
      updatedAt: now,
    };

    // Update in-memory store
    if (existingIndex >= 0) {
      userMemories[existingIndex] = memoryRecord;
    } else {
      userMemories.unshift(memoryRecord);
    }
    inMemoryMemories.set(userId, userMemories);

    // Persist to Supabase with DB timeout guard
    try {
      await withDbTimeout(
        supabase.from(TABLE_MEMORIES).upsert({
          id: memoryRecord.id,
          user_id: memoryRecord.userId,
          category: memoryRecord.category,
          key: memoryRecord.key,
          summary: memoryRecord.summary,
          confidence: memoryRecord.confidence,
          status: memoryRecord.status,
          source_type: memoryRecord.sourceType,
          source_id: memoryRecord.sourceId || null,
          user_confirmed: memoryRecord.userConfirmed,
          last_observed_at: memoryRecord.lastObservedAt,
          expires_at: memoryRecord.expiresAt || null,
          updated_at: memoryRecord.updatedAt,
        }, { onConflict: 'user_id, category, key' })
      );
    } catch {
      // In-memory fallback preserved
    }

    return memoryRecord;
  },

  /**
   * List memories for an authenticated user with optional category/status filters.
   */
  async listMemories(
    userId: string,
    filters?: { category?: MemoryCategory; status?: MemoryStatus }
  ): Promise<PersonalMemory[]> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    // Try database fetch
    try {
      let query = supabase
        .from(TABLE_MEMORIES)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await withDbTimeout(query);
      if (!error && data) {
        const mapped: PersonalMemory[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          category: row.category,
          key: row.key,
          summary: row.summary,
          confidence: Number(row.confidence),
          status: row.status,
          sourceType: row.source_type,
          sourceId: row.source_id || undefined,
          userConfirmed: Boolean(row.user_confirmed),
          lastObservedAt: row.last_observed_at,
          expiresAt: row.expires_at || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        inMemoryMemories.set(userId, mapped);
        return mapped;
      }
    } catch {
      // Fall through to in-memory store
    }

    let records = inMemoryMemories.get(userId) || [];
    if (filters?.category) {
      records = records.filter((m) => m.category === filters.category);
    }
    if (filters?.status) {
      records = records.filter((m) => m.status === filters.status);
    }
    return records;
  },

  /**
   * Get a single memory by ID for the authenticated user.
   */
  async getMemory(userId: string, memoryId: string): Promise<PersonalMemory | null> {
    if (!isValidUuid(userId) || !isValidUuid(memoryId)) return null;

    const memories = await this.listMemories(userId);
    return memories.find((m) => m.id === memoryId) || null;
  },

  /**
   * Delete an individual memory record permanently.
   */
  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    if (!isValidUuid(userId) || !isValidUuid(memoryId)) return false;

    // Remove from in-memory cache
    const userMemories = inMemoryMemories.get(userId) || [];
    const filtered = userMemories.filter((m) => m.id !== memoryId);
    const existed = filtered.length !== userMemories.length;
    inMemoryMemories.set(userId, filtered);

    // Remove from Supabase
    try {
      await withDbTimeout(
        supabase
          .from(TABLE_MEMORIES)
          .delete()
          .eq('id', memoryId)
          .eq('user_id', userId)
      );
    } catch {
      // Memory fallback preserved
    }

    return existed;
  },

  /**
   * Forget All Memories: Server-authoritative total purge of personal memories for user.
   */
  async forgetAllMemories(userId: string): Promise<number> {
    if (!isValidUuid(userId)) return 0;

    const count = (inMemoryMemories.get(userId) || []).length;
    inMemoryMemories.set(userId, []);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_MEMORIES)
          .delete()
          .eq('user_id', userId)
      );
    } catch {
      // In-memory cleared
    }

    return count;
  },

  /**
   * Identifies and marks memories stale if no observation occurred in the past 30 days.
   * Stale memories do not influence proactive decisions.
   */
  async expireStaleMemories(userId: string): Promise<number> {
    if (!isValidUuid(userId)) return 0;

    const memories = await this.listMemories(userId);
    const cutoff = new Date(Date.now() - STALE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000).getTime();
    let updatedCount = 0;

    for (const mem of memories) {
      if (mem.status === 'active' && new Date(mem.lastObservedAt).getTime() < cutoff) {
        mem.status = 'stale';
        mem.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    }

    inMemoryMemories.set(userId, memories);
    return updatedCount;
  },

  /**
   * Resolves up to `limit` active, non-stale, relevant memories formatted for contextual display
   * or untrusted XML injection into the AI Companion.
   * Never returns raw transcripts or sensitive data.
   */
  async resolveActiveMemoryContext(userId: string, limit = 5): Promise<PersonalMemory[]> {
    if (!isValidUuid(userId)) return [];

    await this.expireStaleMemories(userId);
    const active = await this.listMemories(userId, { status: 'active' });

    // Sort by confidence descending, then by updated date descending
    return active
      .sort((a, b) => b.confidence - a.confidence || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, Math.min(5, limit));
  },
};
