import { EvidenceFreshnessStatus, ExternalEvidenceSnapshot } from "./types";

export interface CacheEntry<T> {
  key: string;
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export interface CacheLookupResult<T> {
  hit: boolean;
  freshness: EvidenceFreshnessStatus;
  data?: T;
  cachedAt?: number;
  ageSeconds?: number;
}

export interface EvidenceCacheConfig {
  defaultTtlMs: number;       // default 1 hour for network health
  freshThresholdMs: number;   // 7 days
  staleThresholdMs: number;   // 30 days
}

export const DEFAULT_EVIDENCE_CACHE_CONFIG: EvidenceCacheConfig = {
  defaultTtlMs: 60 * 60 * 1000,              // 1 hour memory TTL
  freshThresholdMs: 7 * 24 * 60 * 60 * 1000,  // 7 days freshness
  staleThresholdMs: 30 * 24 * 60 * 60 * 1000 // 30 days stale threshold
};

export class EvidenceCacheManager {
  private static instance: EvidenceCacheManager;
  private cache: Map<string, CacheEntry<ExternalEvidenceSnapshot>> = new Map();
  private config: EvidenceCacheConfig;

  private constructor(config?: Partial<EvidenceCacheConfig>) {
    this.config = { ...DEFAULT_EVIDENCE_CACHE_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<EvidenceCacheConfig>): EvidenceCacheManager {
    if (!EvidenceCacheManager.instance) {
      EvidenceCacheManager.instance = new EvidenceCacheManager(config);
    }
    return EvidenceCacheManager.instance;
  }

  public getDeterministicKey(externalExerciseId: string): string {
    return `external-evidence-health:${(externalExerciseId || "").trim().toLowerCase()}`;
  }

  /**
   * Evaluates freshness status based on snapshot checkedAt timestamp.
   */
  public evaluateFreshness(checkedAtIso: string): EvidenceFreshnessStatus {
    if (!checkedAtIso) return "EXPIRED";
    const checkedTime = new Date(checkedAtIso).getTime();
    if (isNaN(checkedTime)) return "EXPIRED";
    
    const ageMs = Date.now() - checkedTime;
    if (ageMs <= this.config.freshThresholdMs) {
      return "FRESH";
    } else if (ageMs <= this.config.staleThresholdMs) {
      return "STALE";
    }
    return "EXPIRED";
  }

  /**
   * Retrieves snapshot from memory cache if within TTL.
   */
  public get(externalExerciseId: string): CacheLookupResult<ExternalEvidenceSnapshot> {
    const key = this.getDeterministicKey(externalExerciseId);
    const entry = this.cache.get(key);

    if (!entry) {
      return { hit: false, freshness: "EXPIRED" };
    }

    const now = Date.now();
    const ageMs = now - entry.cachedAt;

    if (ageMs > entry.ttlMs) {
      // Memory TTL expired
      this.cache.delete(key);
      return { hit: false, freshness: "EXPIRED" };
    }

    const freshness = this.evaluateFreshness(entry.data.checkedAt);
    return {
      hit: true,
      freshness,
      data: entry.data,
      cachedAt: entry.cachedAt,
      ageSeconds: Math.floor(ageMs / 1000)
    };
  }

  /**
   * Stores snapshot in cache.
   */
  public set(externalExerciseId: string, data: ExternalEvidenceSnapshot, customTtlMs?: number): void {
    const key = this.getDeterministicKey(externalExerciseId);
    this.cache.set(key, {
      key,
      data,
      cachedAt: Date.now(),
      ttlMs: customTtlMs || this.config.defaultTtlMs
    });
  }

  /**
   * Selectively invalidates a single exercise cache.
   */
  public invalidate(externalExerciseId: string): boolean {
    const key = this.getDeterministicKey(externalExerciseId);
    return this.cache.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.cache.clear();
  }
}
