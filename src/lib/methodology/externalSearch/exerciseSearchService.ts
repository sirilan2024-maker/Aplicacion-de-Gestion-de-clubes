import { ExerciseSearchProvider } from "./providers/providerInterface";
import { CuratedWebFootballProvider } from "./providers/curatedWebFootballProvider";
import { ExternalSearchFilters, ExternalSearchResponse, NormalizedExternalExercise } from "./types";

interface CacheEntry {
  timestamp: number;
  data: NormalizedExternalExercise[];
}

export class ExerciseSearchService {
  private static instance: ExerciseSearchService;
  private providers: ExerciseSearchProvider[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private readonly defaultTimeoutMs = 4000; // 4 seconds

  private constructor() {
    // Register default safe web providers
    this.providers.push(new CuratedWebFootballProvider());
  }

  public static getInstance(): ExerciseSearchService {
    if (!ExerciseSearchService.instance) {
      ExerciseSearchService.instance = new ExerciseSearchService();
    }
    return ExerciseSearchService.instance;
  }

  /**
   * Search across registered external providers with timeout, caching, and SSRF allowlisting.
   */
  public async search(
    query: string,
    filters?: ExternalSearchFilters,
    options?: { timeoutMs?: number }
  ): Promise<ExternalSearchResponse> {
    const startTime = Date.now();
    const sanitizedQuery = (query || "").trim().slice(0, 100); // Sanitize and cap query length

    // 1. Generate cache key
    const cacheKey = JSON.stringify({ q: sanitizedQuery.toLowerCase(), f: filters || {} });
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return {
        success: true,
        provider: "cache",
        query: sanitizedQuery,
        totalResults: cached.data.length,
        results: cached.data,
        cached: true,
        responseTimeMs: Date.now() - startTime
      };
    }

    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    try {
      // 2. Query provider with timeout protection
      const searchPromise = async (): Promise<NormalizedExternalExercise[]> => {
        const allResults: NormalizedExternalExercise[] = [];
        for (const provider of this.providers) {
          const res = await provider.search(sanitizedQuery, filters);
          // Verify each result strictly belongs to allowlisted domains (Anti-SSRF)
          for (const item of res) {
            const isDomainSafe = provider.allowlistedDomains.some((d) =>
              item.sourceUrl.toLowerCase().includes(d.toLowerCase())
            );
            if (isDomainSafe) {
              allResults.push(item);
            }
          }
        }
        return allResults;
      };

      const timeoutPromise = new Promise<NormalizedExternalExercise[]>((_, reject) =>
        setTimeout(() => reject(new Error("External search timeout exceeded")), timeoutMs)
      );

      const results = await Promise.race([searchPromise(), timeoutPromise]);

      // 3. Save to cache
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: results
      });

      return {
        success: true,
        provider: this.providers.map((p) => p.name).join(", "),
        query: sanitizedQuery,
        totalResults: results.length,
        results,
        cached: false,
        responseTimeMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "error",
        query: sanitizedQuery,
        totalResults: 0,
        results: [],
        error: err.message || "Error communicating with external providers",
        responseTimeMs: Date.now() - startTime
      };
    }
  }
}

export const exerciseSearchService = ExerciseSearchService.getInstance();
