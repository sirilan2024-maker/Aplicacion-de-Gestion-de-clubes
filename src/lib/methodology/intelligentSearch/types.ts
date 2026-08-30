export interface ParsedSearchIntent {
  rawQuery: string;
  cleanedQuery: string;
  extractedAgeCategory?: string;
  extractedObjectives: string[];
  extractedPlayersMin?: number;
  extractedPlayersMax?: number;
  extractedGoalkeepers?: number;
  extractedDurationMin?: number;
  extractedDurationMax?: number;
  extractedSpace?: string;
  extractedDifficulty?: number;
  extractedTrainingType?: string;
  extractedGamePhase?: string;
  extractedIntensity?: 'baja' | 'media' | 'alta';
  extractedMicrocycleDay?: 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD+1' | 'MD' | string;
  requestedExternalSources?: string[];
  requestedExternalCount?: number;
  excludedObjectives?: string[];
  isExclusivePriority?: boolean;
  requireVerifiedOnly?: boolean;
}

export interface ScoredExerciseResult<T = any> {
  exercise: T;
  score: number;
  relevanceExplanation: string;
  matchHighlights: string[];
}

export interface IntelligentSearchResponse {
  success: boolean;
  intent: ParsedSearchIntent;
  internalResults: ScoredExerciseResult[];
  externalResults: ScoredExerciseResult[];
  totalInternal: number;
  totalExternal: number;
  responseTimeMs: number;
  error?: string;
}
