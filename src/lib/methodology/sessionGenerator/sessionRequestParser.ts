import { SessionRequestIntent } from "./types";
import { NaturalLanguageQueryParser } from "../intelligentSearch/naturalLanguageQueryParser";
import { getPrincipleTaxonomyKey } from "../tacticalEngine/tacticalAffinityEngine";

function resolveCanonicalObjective(rawPrompt: string, extractedObjectives: string[], cleanedQuery?: string): string {
  // 1. Si existe objetivo extraído explícito, resolverlo mediante la taxonomía canónica
  if (extractedObjectives && extractedObjectives.length > 0) {
    const rawObj = extractedObjectives[0];
    const taxKey = getPrincipleTaxonomyKey(rawObj);
    if (taxKey && taxKey !== "general") {
      return taxKey;
    }
    return rawObj;
  }

  // 2. Resolver la petición completa contra la taxonomía canónica del modelo
  const promptTaxKey = getPrincipleTaxonomyKey(rawPrompt);
  if (promptTaxKey && promptTaxKey !== "general") {
    return promptTaxKey;
  }

  // 3. Evaluar el texto limpio residual descartando palabras conectoras (evitar "para", "sesion de", etc.)
  if (cleanedQuery) {
    const clean = cleanedQuery
      .replace(/\b(sesion|sesi[oó]n|de|para|con|minutos|min|m)\b/gi, " ")
      .replace(/[.,\-_/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (clean.length >= 3) {
      const cleanTaxKey = getPrincipleTaxonomyKey(clean);
      if (cleanTaxKey && cleanTaxKey !== "general") {
        return cleanTaxKey;
      }
      return clean;
    }
  }

  return "circulacion";
}

export class SessionRequestParser {
  public static parse(prompt: string): SessionRequestIntent {
    const raw = (prompt || "").trim();
    const baseIntent = NaturalLanguageQueryParser.parse(raw);

    // 1. Calcular duración (default 75 minutos si no se especifica)
    let durationMinutes = 75;
    if (baseIntent.extractedDurationMin !== undefined) {
      durationMinutes = baseIntent.extractedDurationMin;
    }

    // 2. Calcular jugadores (solo si se solicita explícitamente como tamaño de plantilla, nunca por '1v1')
    const players = baseIntent.extractedPlayersMin !== undefined ? baseIntent.extractedPlayersMin : undefined;

    // 3. Resolución canónica del objetivo principal
    const primaryObjective = resolveCanonicalObjective(
      raw, 
      baseIntent.extractedObjectives, 
      baseIntent.cleanedQuery
    );

    const secondaryObjectives = baseIntent.extractedObjectives.slice(1).map(obj => {
      const taxKey = getPrincipleTaxonomyKey(obj);
      return taxKey && taxKey !== "general" ? taxKey : obj;
    });

    return {
      rawPrompt: raw,
      ageCategory: baseIntent.extractedAgeCategory,
      players,
      goalkeepers: baseIntent.extractedGoalkeepers,
      durationMinutes,
      primaryObjective,
      secondaryObjectives,
      space: baseIntent.extractedSpace,
      difficulty: baseIntent.extractedDifficulty,
      intensity: baseIntent.extractedIntensity,
      microcycleDay: baseIntent.extractedMicrocycleDay,
      requestedExternalSources: baseIntent.requestedExternalSources,
      requestedExternalCount: baseIntent.requestedExternalCount,
      excludedObjectives: baseIntent.excludedObjectives,
      isExclusivePriority: baseIntent.isExclusivePriority,
      requireVerifiedOnly: baseIntent.requireVerifiedOnly
    };
  }
}
