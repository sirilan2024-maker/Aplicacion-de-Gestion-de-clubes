import { ExternalSearchFilters, NormalizedExternalExercise } from "../types";

export interface ExerciseSearchProvider {
  readonly name: string;
  readonly allowlistedDomains: string[];
  search(query: string, filters?: ExternalSearchFilters): Promise<NormalizedExternalExercise[]>;
}
