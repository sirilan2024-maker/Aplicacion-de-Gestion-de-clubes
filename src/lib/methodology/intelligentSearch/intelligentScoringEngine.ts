import { ParsedSearchIntent, ScoredExerciseResult } from "./types";

export class IntelligentScoringEngine {
  public static scoreExercise(
    exercise: any,
    intent: ParsedSearchIntent,
    manualFilters?: {
      category?: string;
      family?: string;
      type?: string;
      difficulty?: number;
    }
  ): ScoredExerciseResult {
    let score = 0;
    const highlights: string[] = [];
    const reasons: string[] = [];

    const name = (exercise.nombre || exercise.title || "").toLowerCase();
    const desc = (exercise.descripcion || exercise.description || "").toLowerCase();
    const cat = (exercise.age_category || exercise.ageCategory || (exercise.categoria_edad && exercise.categoria_edad[0]) || "").toLowerCase();
    const tacObj = (exercise.objetivo_tactico || (exercise.tacticalObjective ? [exercise.tacticalObjective] : [])).map((t: string) => t.toLowerCase());
    const tecObj = (exercise.objetivo_tecnico || (exercise.technicalObjective ? [exercise.technicalObjective] : [])).map((t: string) => t.toLowerCase());
    const tags = (exercise.tags || []).map((t: string) => t.toLowerCase());

    const minP = exercise.min_players ?? (exercise.players ? parseInt(String(exercise.players).split("-")[0], 10) : undefined);
    const maxP = exercise.max_players ?? (exercise.players ? parseInt(String(exercise.players).split("-")[1] || exercise.players, 10) : undefined);
    const duration = exercise.duracion_recomendada ?? exercise.duration;
    const diff = exercise.dificultad ?? exercise.difficulty;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. REGLA CRÍTICA: EXCLUSIONES EXPLÍCITAS DEL ENTRENADOR (FASE 56)
    // ─────────────────────────────────────────────────────────────────────────
    const excluded = intent.excludedObjectives || [];
    let isExplicitlyExcluded = false;
    let excludedReason = "";

    for (const excl of excluded) {
      const e = excl.toLowerCase();
      const matchInTac = tacObj.some((t: string) => t.includes(e) || e.includes(t));
      const matchInTags = tags.some((t: string) => t.includes(e));
      const matchInName = name.includes(e);

      // Comprobar si el concepto excluido es el foco dominante de la tarea
      if (matchInTac || matchInTags || matchInName) {
        // Si el objetivo excluido es repliegue y el ejercicio es "Repliegue intensivo", penalizar masivamente
        isExplicitlyExcluded = true;
        excludedReason = excl;
        break;
      }
    }

    if (isExplicitlyExcluded) {
      score -= 200; // Descalificación / Penalización máxima
      reasons.push(`⚠️ Excluido explícitamente: ${excludedReason}`);
      return {
        exercise,
        score: Math.max(0, score),
        relevanceExplanation: `Tarea desaconsejada: contiene "${excludedReason}", materia explícitamente excluida por el entrenador.`,
        matchHighlights: highlights
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. OBJETIVO PRINCIPAL SOLICITADO (+50 pts)
    // ─────────────────────────────────────────────────────────────────────────
    const primaryObj = intent.extractedObjectives.length > 0 
      ? intent.extractedObjectives[0].toLowerCase() 
      : (intent.cleanedQuery || "").toLowerCase();

    let matchesPrimary = false;

    if (primaryObj) {
      const matchInTac = tacObj.some((t: string) => t.includes(primaryObj) || primaryObj.includes(t));
      const matchInTags = tags.some((t: string) => t.includes(primaryObj) || primaryObj.includes(t));
      const matchInName = name.includes(primaryObj);
      const matchInDesc = desc.includes(primaryObj);

      if (matchInTac || matchInTags) {
        score += 50;
        matchesPrimary = true;
        highlights.push(primaryObj);
        reasons.push(`objetivo principal (${primaryObj})`);
      } else if (matchInName) {
        score += 35;
        matchesPrimary = true;
        highlights.push(primaryObj);
        reasons.push(`enfoque principal en título`);
      } else if (matchInDesc) {
        score += 20;
        matchesPrimary = true;
        highlights.push(primaryObj);
        reasons.push(`mención en descripción`);
      }
    }

    // Si el entrenador especificó "exclusivamente" o "solo", penalizar tareas no afines al objetivo principal
    if (intent.isExclusivePriority) {
      if (matchesPrimary) {
        score += 25; // Bonus por foco exclusivo
        reasons.push("foco exclusivo demandado");
      } else {
        score -= 80; // Penalización por dispersión del objetivo exclusivo
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. OBJETIVOS SECUNDARIOS / TÉCNICOS (+20 pts)
    // ─────────────────────────────────────────────────────────────────────────
    const secondaryObjs = intent.extractedObjectives.slice(1);
    for (const sec of secondaryObjs) {
      const s = sec.toLowerCase();
      const matchTac = tacObj.some((t: string) => t.includes(s) || s.includes(t));
      const matchTec = tecObj.some((t: string) => t.includes(s) || s.includes(t));
      if (matchTac || matchTec) {
        score += 20;
        highlights.push(sec);
        reasons.push(`objetivo secundario (${sec})`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ADECUACIÓN DE CATEGORÍA Y EDAD (+20 pts)
    // ─────────────────────────────────────────────────────────────────────────
    const targetAge = manualFilters?.category && manualFilters.category !== "all" 
      ? manualFilters.category.toLowerCase() 
      : intent.extractedAgeCategory?.toLowerCase();

    if (targetAge && targetAge !== "all") {
      if (cat === targetAge || cat.includes(targetAge)) {
        score += 20;
        highlights.push(targetAge);
        reasons.push(`categoría (${targetAge})`);
      } else if (cat === "general" || cat === "all" || cat === "futbol-base") {
        score += 10;
      } else {
        score -= 15; // Penalización por categoría inadecuada
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. NÚMERO DE JUGADORES (+15 pts)
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.extractedPlayersMin !== undefined) {
      const p = intent.extractedPlayersMin;
      if (minP !== undefined && maxP !== undefined) {
        if (p >= minP && p <= maxP) {
          score += 15;
          highlights.push(`${p} jugadores`);
          reasons.push(`${p} jugadores ideal`);
        } else if (p >= minP - 2 && p <= maxP + 3) {
          score += 8;
        } else {
          score -= 10;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DURACIÓN (+10 pts)
    // ─────────────────────────────────────────────────────────────────────────
    if (intent.extractedDurationMin !== undefined && duration !== undefined) {
      const d = intent.extractedDurationMin;
      if (Math.abs(duration - d) <= 5) {
        score += 10;
        highlights.push(`${duration} min`);
        reasons.push(`duración (${duration} min)`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. DIFICULTAD (+10 pts)
    // ─────────────────────────────────────────────────────────────────────────
    if (manualFilters?.difficulty && diff !== undefined) {
      if (diff === manualFilters.difficulty) {
        score += 10;
        reasons.push(`dificultad nivel ${diff}`);
      }
    }

    let explanation = "Coincidencia general de búsqueda";
    if (reasons.length > 0) {
      explanation = `Coincide por: ${reasons.join(", ")}.`;
    }

    return {
      exercise,
      score: Math.max(0, score),
      relevanceExplanation: explanation,
      matchHighlights: Array.from(new Set(highlights))
    };
  }

  public static scoreAndRankExercises(
    exercises: any[],
    intent: ParsedSearchIntent,
    limit: number = 20,
    manualFilters?: {
      category?: string;
      family?: string;
      type?: string;
      difficulty?: number;
    }
  ): Array<{ exercise: any; score: number; reasons: string[] }> {
    return exercises
      .map(ex => {
        const res = IntelligentScoringEngine.scoreExercise(ex, intent, manualFilters);
        return {
          exercise: ex,
          score: res.score,
          reasons: res.matchHighlights
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
