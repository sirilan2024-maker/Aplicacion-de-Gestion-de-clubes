import { NaturalLanguageQueryParser } from "./naturalLanguageQueryParser";
import { IntelligentScoringEngine } from "./intelligentScoringEngine";
import { IntelligentSearchResponse, ScoredExerciseResult } from "./types";
import { exerciseSearchService } from "../externalSearch/exerciseSearchService";

export class IntelligentSearchService {
  private static instance: IntelligentSearchService;

  private constructor() {}

  public static getInstance(): IntelligentSearchService {
    if (!IntelligentSearchService.instance) {
      IntelligentSearchService.instance = new IntelligentSearchService();
    }
    return IntelligentSearchService.instance;
  }

  /**
   * Performs hybrid search combining internal database exercises and allowlisted external sources,
   * parsing natural language query intents and ranking by deterministic relevance scoring.
   */
  public async searchHybrid(
    rawQuery: string,
    internalCatalog: any[],
    options?: {
      includeExternal?: boolean;
      manualFilters?: {
        category?: string;
        family?: string;
        type?: string;
        difficulty?: number;
      };
    }
  ): Promise<IntelligentSearchResponse> {
    const startTime = Date.now();
    const intent = NaturalLanguageQueryParser.parse(rawQuery || "");

    // 1. Score & Rank Internal Exercises
    const scoredInternal: ScoredExerciseResult[] = internalCatalog
      .map((ex) => IntelligentScoringEngine.scoreExercise(ex, intent, options?.manualFilters))
      .filter((res) => {
        // If rawQuery is present, filter for relevant score (> 0); if query is empty, show catalog items
        if (rawQuery.trim()) {
          return res.score > 0;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);

    // 2. Score & Rank External Exercises if requested
    let scoredExternal: ScoredExerciseResult[] = [];
    if (options?.includeExternal) {
      try {
        const extRes = await exerciseSearchService.search(intent.cleanedQuery || rawQuery, {
          ageCategory: options?.manualFilters?.category && options.manualFilters.category !== "all"
            ? options.manualFilters.category
            : intent.extractedAgeCategory,
          difficulty: options?.manualFilters?.difficulty
        });

        if (extRes.success && extRes.results) {
          scoredExternal = extRes.results
            .map((ext) => IntelligentScoringEngine.scoreExercise(ext, intent, options?.manualFilters))
            .sort((a, b) => b.score - a.score);
        }
      } catch (err) {
        console.error("External search service error in hybrid search:", err);
      }
    }

    return {
      success: true,
      intent,
      internalResults: scoredInternal,
      externalResults: scoredExternal,
      totalInternal: scoredInternal.length,
      totalExternal: scoredExternal.length,
      responseTimeMs: Date.now() - startTime
    };
  }
}

export const intelligentSearchService = IntelligentSearchService.getInstance();
