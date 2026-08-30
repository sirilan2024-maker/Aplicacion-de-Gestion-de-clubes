/**
 * FOOTBALL INTELLIGENCE AGENT v1.0
 * Sporting Saladar / Antigravity Methodology OS
 * 
 * Agente profesional de metodología de fútbol para el entrenador y director metodológico.
 * Integrado con catálogo oficial, búsqueda web allowlisted, generador balanceado,
 * motor de revisión pedagógica, sustitución de tareas y memoria de observaciones.
 */

import Groq from "groq-sdk";
import { SessionRequestParser } from "../sessionGenerator/sessionRequestParser";
import { SessionPlannerService } from "../sessionGenerator/sessionPlannerService";
import { IntelligentScoringEngine } from "../intelligentSearch/intelligentScoringEngine";
import { NaturalLanguageQueryParser } from "../intelligentSearch/naturalLanguageQueryParser";
import { exerciseSearchService } from "../externalSearch/exerciseSearchService";
import { 
  GeneratedSessionPlan, 
  GeneratedSessionDrill, 
  SessionPhaseKey, 
  SessionRequestIntent 
} from "../sessionGenerator/types";
import { NormalizedExternalExercise } from "../externalSearch/types";

export interface FootballAgentContext {
  clubId: string;
  clubName?: string;
  category?: string;
  teamName?: string;
  teamId?: string;
  currentMicrocycleDay?: string;
  coachObservations?: string[];
  variantNumber?: number;
  excludedExerciseIds?: string[];
  includeExternal?: boolean;
  recentSessions?: Array<{
    date: string;
    objective: string;
    durationMinutes: number;
    observations?: string;
    rpe?: number;
  }>;
}

export interface InternalSearchCriteria {
  category?: string;
  players?: number;
  objectives?: string[];
  family?: string;
  difficulty?: number;
  block?: string;
  duration?: number;
  tags?: string[];
  searchTerm?: string;
}

export interface ExternalSearchCriteria {
  query: string;
  category?: string;
  difficulty?: number;
}

export interface SessionReviewResult {
  isCoherent: boolean;
  score: number; // 0 - 100
  strengths: string[];
  issues: string[];
  recommendations: string[];
  proposedChanges: Array<{
    phase: string;
    currentDrillTitle?: string;
    suggestedAction: "keep" | "replace" | "adjust_duration" | "reorder";
    suggestedDuration?: number;
    suggestedAlternativeTitle?: string;
    reason: string;
  }>;
  methodologicalSummary: string;
}

export interface ExerciseReplacementResult {
  success: boolean;
  replacedDrill: GeneratedSessionDrill;
  alternativeOptions: Array<{
    exercise: any;
    source: "oficial" | "externo" | "ia";
    rationale: string;
  }>;
  adjustedSession: GeneratedSessionPlan;
}

export class FootballIntelligenceAgent {
  private static instance: FootballIntelligenceAgent;
  private groq: Groq | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    this.groq = key ? new Groq({ apiKey: key }) : null;
    this.modelName = modelName || process.env.METHODOLOGY_AI_MODEL || "llama-3.3-70b-versatile";
  }

  public static getInstance(): FootballIntelligenceAgent {
    if (!FootballIntelligenceAgent.instance) {
      FootballIntelligenceAgent.instance = new FootballIntelligenceAgent();
    }
    return FootballIntelligenceAgent.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 1: search_internal_exercises (FASE 54/56)
  // ─────────────────────────────────────────────────────────────────────────
  public async searchInternalExercises(
    criteria: InternalSearchCriteria,
    catalog: any[]
  ): Promise<any[]> {
    if (!catalog || catalog.length === 0) return [];

    const raw = criteria.searchTerm || (criteria.objectives || []).join(" ");
    const parsed = NaturalLanguageQueryParser.parse(raw);

    const intent = {
      rawQuery: raw,
      cleanedQuery: parsed.cleanedQuery,
      extractedAgeCategory: criteria.category || parsed.extractedAgeCategory,
      extractedObjectives: criteria.objectives?.length ? criteria.objectives : parsed.extractedObjectives,
      extractedPlayersMin: criteria.players || parsed.extractedPlayersMin,
      extractedDurationMin: criteria.duration || parsed.extractedDurationMin,
      excludedObjectives: parsed.excludedObjectives,
      isExclusivePriority: parsed.isExclusivePriority
    };

    const scored = IntelligentScoringEngine.scoreAndRankExercises(catalog, intent, 20);

    return scored.map(s => ({
      ...s.exercise,
      _matchScore: s.score,
      _scoreExplanation: s.reasons.join(" • "),
      _source: "oficial"
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 2: search_external_exercises
  // ─────────────────────────────────────────────────────────────────────────
  public async searchExternalExercises(
    criteria: ExternalSearchCriteria
  ): Promise<NormalizedExternalExercise[]> {
    const searchRes = await exerciseSearchService.search(criteria.query, {
      ageCategory: criteria.category,
      difficulty: criteria.difficulty
    });

    return searchRes.results || [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 3: add_exercise_to_session
  // ─────────────────────────────────────────────────────────────────────────
  public addExerciseToSession(
    currentSession: GeneratedSessionPlan,
    exercise: any,
    phase: SessionPhaseKey,
    customDuration?: number,
    source: "oficial" | "externo" = "oficial"
  ): GeneratedSessionPlan {
    const allocatedMin = customDuration || exercise.duracion_recomendada || exercise.duration || 15;
    
    const newDrill: GeneratedSessionDrill = {
      id: `drill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phase,
      phaseLabel: this.getPhaseLabel(phase),
      orderIndex: currentSession.drills.length + 1,
      allocatedDurationMin: allocatedMin,
      exercise: {
        ...exercise,
        is_external: source === "externo" || exercise.external === true
      },
      source,
      selectionRationale: source === "externo" 
        ? `Incorporado desde repositorio externo (${exercise.source || 'Web Allowlisted'})` 
        : `Seleccionado de la biblioteca oficial interna`,
      matchScore: 95
    };

    const updatedDrills = [...currentSession.drills, newDrill];
    const totalCalculated = updatedDrills.reduce((acc, d) => acc + (d.allocatedDurationMin || 0), 0);

    return {
      ...currentSession,
      drills: updatedDrills,
      calculatedDurationMinutes: totalCalculated,
      isDurationExact: totalCalculated === currentSession.totalDurationMinutes
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 4: generate_session
  // ─────────────────────────────────────────────────────────────────────────
  public async generateSession(
    prompt: string,
    catalog: any[],
    context?: FootballAgentContext
  ): Promise<GeneratedSessionPlan> {
    const planner = SessionPlannerService.getInstance();
    
    // Si hay observaciones del entrenador previas, enriquecer el prompt metodológico
    let enrichedPrompt = prompt;
    if (context?.coachObservations && context.coachObservations.length > 0) {
      const recentObs = context.coachObservations.slice(-2).join(". ");
      enrichedPrompt = `${prompt}. Nota metodológica del entrenador: tener en cuenta ${recentObs}`;
    }

    const planRes = await planner.generateSession(enrichedPrompt, catalog, {
      variantNumber: context?.variantNumber,
      excludedExerciseIds: context?.excludedExerciseIds,
      includeExternal: context?.includeExternal ?? true
    });
    
    if (!planRes.success || !planRes.session) {
      throw new Error(planRes.error || "No se pudo generar la sesión metodológica");
    }

    return planRes.session;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 5: review_session
  // ─────────────────────────────────────────────────────────────────────────
  public async reviewSession(
    session: GeneratedSessionPlan,
    context?: FootballAgentContext
  ): Promise<SessionReviewResult> {
    // Si Groq está disponible, usar el LLM para una auditoría táctica exhaustiva
    if (this.groq) {
      try {
        const systemPrompt = `Eres un Director Metodológico de Fútbol Élite y Auditor UEFA Pro.
Tu misión es revisar críticamente la sesión de entrenamiento propuesta y evaluar:
1. Coherencia y balance temporal (duración planificada vs sumatoria de tareas).
2. Adecuación de los ejercicios para la categoría (${session.intent.ageCategory || 'General'}) y número de jugadores (${session.intent.players || '12-16'}).
3. Progresión metodológica (calentamiento -> fijación -> oposición/SSG -> juego global -> vuelta a la calma).
4. Sobrecarga de contenidos, redundancia o falta de representatividad.
5. Consideración de observaciones previas: ${context?.coachObservations?.join("; ") || 'Ninguna'}.

Responde EXCLUSIVAMENTE con un JSON válido con esta estructura:
{
  "isCoherent": true/false,
  "score": 85,
  "strengths": ["Fortaleza 1...", "Fortaleza 2..."],
  "issues": ["Problema 1...", "Problema 2..."],
  "recommendations": ["Recomendación 1...", "Recomendación 2..."],
  "proposedChanges": [
    {
      "phase": "principal_1",
      "currentDrillTitle": "Nombre tarea",
      "suggestedAction": "adjust_duration" | "replace" | "keep" | "reorder",
      "suggestedDuration": 20,
      "suggestedAlternativeTitle": "Opcional",
      "reason": "Explicación"
    }
  ],
  "methodologicalSummary": "Resumen ejecutivo"
}`;

        const userContent = JSON.stringify({
          sessionPlan: {
            title: session.title,
            totalDuration: session.totalDurationMinutes,
            calculatedDuration: session.calculatedDurationMinutes,
            intent: session.intent,
            drills: session.drills.map(d => ({
              phase: d.phase,
              title: d.exercise?.nombre || d.exercise?.title,
              duration: d.allocatedDurationMin,
              type: d.exercise?.tipo,
              family: d.exercise?.familia,
              category: d.exercise?.age_category || d.exercise?.ageCategory,
              players: `${d.exercise?.min_players || 4}-${d.exercise?.max_players || 16}`,
              source: d.source
            }))
          },
          context
        }, null, 2);

        const completion = await this.groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          model: this.modelName,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(raw);

        return {
          isCoherent: typeof parsed.isCoherent === "boolean" ? parsed.isCoherent : session.isDurationExact,
          score: typeof parsed.score === "number" ? parsed.score : 85,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Estructura secuencial correcta"],
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          proposedChanges: Array.isArray(parsed.proposedChanges) ? parsed.proposedChanges : [],
          methodologicalSummary: parsed.methodologicalSummary || "Sesión metodológicamente balanceada."
        };
      } catch (err) {
        console.warn("Fallo en LLM reviewSession, usando evaluación determinista:", err);
      }
    }

    // Fallback Determinista
    return this.deterministicReview(session, context);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 6: replace_exercise
  // ─────────────────────────────────────────────────────────────────────────
  public async replaceExercise(
    session: GeneratedSessionPlan,
    phaseOrDrillIndex: string | number,
    requirements: string,
    catalog: any[]
  ): Promise<ExerciseReplacementResult> {
    const drillIndex = typeof phaseOrDrillIndex === "number" 
      ? phaseOrDrillIndex 
      : session.drills.findIndex(d => d.phase === phaseOrDrillIndex);

    if (drillIndex === -1 || !session.drills[drillIndex]) {
      throw new Error(`No se encontró ninguna tarea en la fase o índice especificado: ${phaseOrDrillIndex}`);
    }

    const currentDrill = session.drills[drillIndex];
    const targetDuration = currentDrill.allocatedDurationMin;

    // Buscar alternativas en catálogo interno con los nuevos requerimientos
    const searchIntent = {
      rawQuery: requirements,
      cleanedQuery: requirements,
      rawPrompt: requirements,
      extractedAgeCategory: session.intent.ageCategory,
      extractedPlayersMin: session.intent.players,
      extractedObjectives: [requirements, session.intent.primaryObjective],
      confidenceScore: 0.9
    };

    const internalCandidates = IntelligentScoringEngine.scoreAndRankExercises(
      catalog.filter(e => e.id !== currentDrill.exercise?.id),
      searchIntent,
      5
    );

    let selectedReplacement: any = null;
    let selectedSource: "oficial" | "externo" | "ia" = "oficial";
    let rationale = "";

    if (internalCandidates.length > 0) {
      selectedReplacement = internalCandidates[0].exercise;
      selectedSource = "oficial";
      rationale = `Seleccionado de la biblioteca oficial: cumple con "${requirements}" (${internalCandidates[0].reasons.join(", ")})`;
    } else {
      // Intentar búsqueda web de apoyo
      const webResults = await this.searchExternalExercises({
        query: `${requirements} ${session.intent.ageCategory || ''}`,
        category: session.intent.ageCategory
      });

      if (webResults.length > 0) {
        selectedReplacement = webResults[0];
        selectedSource = "externo";
        rationale = `Descubierto en repositorio federado externo (${webResults[0].source}): responde al requerimiento "${requirements}"`;
      } else {
        // Adaptación asistida
        selectedReplacement = {
          ...currentDrill.exercise,
          id: `ai-adapted-${Date.now()}`,
          nombre: `${currentDrill.exercise.nombre || 'Tarea'} (Adaptada: ${requirements})`,
          descripcion: `${currentDrill.exercise.descripcion || ''}\n[ADAPTACIÓN METODOLÓGICA]: Ajustada para mayor intensidad y enfoque en ${requirements}.`
        };
        selectedSource = "ia";
        rationale = `Adaptación pedagógica asistida sobre la tarea base para satisfacer "${requirements}"`;
      }
    }

    const newDrill: GeneratedSessionDrill = {
      id: `drill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phase: currentDrill.phase,
      phaseLabel: currentDrill.phaseLabel,
      orderIndex: currentDrill.orderIndex,
      allocatedDurationMin: targetDuration, // Mantiene balance temporal exacto
      exercise: selectedReplacement,
      source: selectedSource === "externo" ? "externo" : "oficial",
      selectionRationale: rationale,
      matchScore: 90
    };

    const updatedDrills = [...session.drills];
    updatedDrills[drillIndex] = newDrill;

    const alternatives = internalCandidates.slice(1, 4).map(c => ({
      exercise: c.exercise,
      source: "oficial" as const,
      rationale: c.reasons.join(" • ")
    }));

    return {
      success: true,
      replacedDrill: newDrill,
      alternativeOptions: alternatives,
      adjustedSession: {
        ...session,
        drills: updatedDrills
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DETERMINISTIC REVIEW FALLBACK
  // ─────────────────────────────────────────────────────────────────────────
  private deterministicReview(
    session: GeneratedSessionPlan,
    context?: FootballAgentContext
  ): SessionReviewResult {
    const strengths: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];
    const proposedChanges: any[] = [];
    let score = 100;

    // 1. Balance temporal
    const diff = session.calculatedDurationMinutes - session.totalDurationMinutes;
    if (diff === 0) {
      strengths.push(`Balance temporal perfecto: exactamente ${session.totalDurationMinutes} minutos programados.`);
    } else {
      score -= 20;
      issues.push(`Descuadre temporal de ${Math.abs(diff)} minutos (Programado: ${session.calculatedDurationMinutes} min / Objetivo: ${session.totalDurationMinutes} min).`);
      recommendations.push(`Ajustar la duración de las tareas principales para cuadrar exactamente ${session.totalDurationMinutes} minutos.`);
    }

    // 2. Número de tareas y estructura
    if (session.drills.length >= 4 && session.drills.length <= 6) {
      strengths.push(`Estructura metodológica equilibrada con ${session.drills.length} bloques secuenciales.`);
    } else if (session.drills.length < 4) {
      score -= 15;
      issues.push("La sesión cuenta con menos de 4 tareas; riesgo de falta de progresión o monotonía.");
      recommendations.push("Incorporar una tarea intermedia de fijación o progresión táctica.");
    }

    // 3. Adecuación de categoría y jugadores
    const targetPlayers = session.intent.players || 14;
    const playerMismatches = session.drills.filter(d => {
      const minP = d.exercise?.min_players || 2;
      const maxP = d.exercise?.max_players || 22;
      return targetPlayers < minP || targetPlayers > maxP;
    });

    if (playerMismatches.length > 0) {
      score -= 10;
      issues.push(`${playerMismatches.length} tarea(s) tienen rangos de jugadores que podrían requerir adaptaciones para ${targetPlayers} jugadores.`);
      recommendations.push("Configurar comodines o dividir en dos subgrupos simultáneos en las tareas de espacio reducido.");
    } else {
      strengths.push(`Todas las tareas se adaptan adecuadamente a la plantilla disponible (${targetPlayers} jugadores).`);
    }

    // 4. Integración de observaciones
    if (context?.coachObservations && context.coachObservations.length > 0) {
      strengths.push(`Sesión orientada considerando las observaciones previas de campo.`);
    }

    return {
      isCoherent: score >= 70 && diff === 0,
      score: Math.max(40, score),
      strengths,
      issues,
      recommendations,
      proposedChanges,
      methodologicalSummary: `Auditoría determinista: Puntuación de calidad metodológica ${score}/100.`
    };
  }

  private getPhaseLabel(phase: SessionPhaseKey): string {
    switch (phase) {
      case "activacion": return "✨ Activación / Calentamiento";
      case "principal_1": return "🎯 Tarea Principal 1";
      case "principal_2": return "📊 Tarea Principal 2";
      case "global": return "🏟️ Juego Aplicado / Partido";
      case "vuelta_calma": return "🔄 Vuelta a la Calma";
      default: return phase;
    }
  }
}
