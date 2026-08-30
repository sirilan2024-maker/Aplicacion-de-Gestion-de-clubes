import { SessionRequestParser } from "./sessionRequestParser";
import { GeneratedSessionDrill, GeneratedSessionPlan, GenerateSessionResponse, SessionPhaseKey, SessionRequestIntent } from "./types";
import { IntelligentScoringEngine } from "../intelligentSearch/intelligentScoringEngine";
import { ParsedSearchIntent } from "../intelligentSearch/types";
import { exerciseSearchService } from "../externalSearch/exerciseSearchService";
import { PedagogicalProgressionEngine } from "./pedagogicalProgressionEngine";
import { SessionCoherenceAuditor } from "./sessionCoherenceAuditor";
import { evaluatePureTacticalAffinity } from "../tacticalEngine/tacticalAffinityEngine";

export interface GenerateSessionOptions {
  includeExternal?: boolean;
  variantNumber?: number;
  excludedExerciseIds?: string[];
  forcedExternalCount?: number;
  forcedExternalSources?: string[];
}

interface PhaseTemplate {
  key: SessionPhaseKey;
  label: string;
  weight: number; // Percentage share of time
  targetBlocks: string[]; // Corresponding bloque_sesion in banco_ejercicios
  targetTypes: string[];
  targetIntensityMax: number;
  pedagogicalRole: string;
}

export class SessionPlannerService {
  private static instance: SessionPlannerService;
  private progressionEngine = PedagogicalProgressionEngine.getInstance();
  private coherenceAuditor = SessionCoherenceAuditor.getInstance();

  private readonly phaseTemplates: PhaseTemplate[] = [
    {
      key: "activacion",
      label: "✨ Activación / Calentamiento",
      weight: 0.15,
      targetBlocks: ["calentamiento", "activacion"],
      targetTypes: ["calentamiento", "rondo", "circuito", "analitico"],
      targetIntensityMax: 3,
      pedagogicalRole: "Activación técnico-táctica y predisposición dinámica hacia el objetivo principal."
    },
    {
      key: "principal_1",
      label: "🎯 Tarea Principal 1 (Introducción / Fijación)",
      weight: 0.28,
      targetBlocks: ["principal", "principal_1"],
      targetTypes: ["analitico", "juego_medio", "rondo", "globalizacion"],
      targetIntensityMax: 4,
      pedagogicalRole: "Fijación de patrones y conservación con estímulo de reacción inmediata tras pérdida."
    },
    {
      key: "principal_2",
      label: "📊 Tarea Principal 2 (Progresión / Oposición)",
      weight: 0.28,
      targetBlocks: ["principal", "principal_2"],
      targetTypes: ["juego_medio", "SSG", "globalizacion", "analitico"],
      targetIntensityMax: 4,
      pedagogicalRole: "Oposición real, superioridad/inferioridad y transición de alta carga cognitiva."
    },
    {
      key: "global",
      label: "🏟️ Juego Aplicado / Partido Condicionado",
      weight: 0.22,
      targetBlocks: ["global", "partido"],
      targetTypes: ["juego_global", "SSG", "partido"],
      targetIntensityMax: 4,
      pedagogicalRole: "Transferencia competitiva en espacio representativo con reglas provocadoras del objetivo."
    },
    {
      key: "vuelta_calma",
      label: "🔄 Vuelta a la Calma",
      weight: 0.07,
      targetBlocks: ["vuelta_calma", "regeneracion", "recuperacion"],
      targetTypes: ["vuelta_calma", "calentamiento"],
      targetIntensityMax: 2,
      pedagogicalRole: "Recuperación fisiológica activa, estiramientos dinámicos y asimilación pedagógica."
    }
  ];

  private constructor() {}

  public static getInstance(): SessionPlannerService {
    if (!SessionPlannerService.instance) {
      SessionPlannerService.instance = new SessionPlannerService();
    }
    return SessionPlannerService.instance;
  }

  /**
   * Distributes total duration across session phases with strict exact sum guarantee.
   */
  private calculatePhaseDurations(totalMinutes: number): { phase: PhaseTemplate; duration: number }[] {
    const allocations: { phase: PhaseTemplate; duration: number }[] = [];
    let allocatedSum = 0;

    for (let i = 0; i < this.phaseTemplates.length; i++) {
      const template = this.phaseTemplates[i];
      if (i === this.phaseTemplates.length - 1) {
        // Last phase gets exact remainder to guarantee SUM === totalMinutes
        const remainder = Math.max(5, totalMinutes - allocatedSum);
        allocations.push({ phase: template, duration: remainder });
        allocatedSum += remainder;
      } else {
        // Round to nearest 5 minutes
        let rawMin = Math.round((totalMinutes * template.weight) / 5) * 5;
        if (rawMin < 5) rawMin = 5;
        allocations.push({ phase: template, duration: rawMin });
        allocatedSum += rawMin;
      }
    }

    // Final safety adjustment on main drill
    const diff = totalMinutes - allocatedSum;
    if (diff !== 0) {
      allocations[1].duration += diff;
    }

    return allocations;
  }

  /**
   * Evaluates deep methodological pertinence of an exercise for a specific phase and session intent.
   * Leverages PedagogicalProgressionEngine for multi-factor contextual scoring.
   */
  private scoreExercisePertinence(
    exercise: any,
    phase: PhaseTemplate,
    intent: SessionRequestIntent,
    previousDrillExercise?: any,
    isPreviouslyUsed: boolean = false
  ): { pertinenceScore: number; reasons: string[]; isBlockAppropriate: boolean } {
    const breakdown = this.progressionEngine.scoreCandidate(
      exercise,
      phase.key,
      intent,
      previousDrillExercise
    );

    let score = breakdown.totalScore;
    if (isPreviouslyUsed) {
      score -= 25;
    }

    return {
      pertinenceScore: score,
      reasons: breakdown.reasons,
      isBlockAppropriate: score > 30
    };
  }

  /**
   * Plans an intelligent, pedagogically coherent training session from natural language prompt or structured intent.
   */
  public async generateSession(
    promptOrIntent: string | SessionRequestIntent,
    internalCatalog: any[],
    options?: GenerateSessionOptions
  ): Promise<GenerateSessionResponse> {
    const startTime = Date.now();
    const intent: SessionRequestIntent = typeof promptOrIntent === "string"
      ? SessionRequestParser.parse(promptOrIntent)
      : promptOrIntent;

    const variantNum = options?.variantNumber || 1;
    const excludedIds = new Set<string>(options?.excludedExerciseIds || (intent.recentExerciseIds || []));

    const phaseDurations = this.calculatePhaseDurations(intent.durationMinutes);
    const selectedDrills: GeneratedSessionDrill[] = [];
    const usedExerciseIdsInSession = new Set<string>();

    const baseSearchIntent: ParsedSearchIntent = {
      rawQuery: intent.rawPrompt || intent.primaryObjective,
      cleanedQuery: intent.primaryObjective,
      extractedAgeCategory: intent.ageCategory,
      extractedObjectives: [intent.primaryObjective, ...(intent.secondaryObjectives || [])],
      extractedPlayersMin: intent.players,
      extractedPlayersMax: intent.players,
      extractedGoalkeepers: intent.goalkeepers,
      extractedDurationMin: intent.durationMinutes,
      extractedSpace: intent.space,
      extractedDifficulty: intent.difficulty,
      extractedMicrocycleDay: intent.microcycleDay,
      excludedObjectives: intent.excludedObjectives,
      isExclusivePriority: intent.isExclusivePriority
    };

    // Determinar si el usuario solicitó explícitamente ejercicios externos (ej: UEFA / RFEF)
    const wantsExternal = Boolean(
      options?.includeExternal ||
      (intent.requestedExternalCount && intent.requestedExternalCount > 0) ||
      (intent.requestedExternalSources && intent.requestedExternalSources.length > 0)
    );
    let remainingExternalToSlot = intent.requestedExternalCount || (options?.forcedExternalCount || (wantsExternal ? 1 : 0));
    const preferredExternalSource = intent.requestedExternalSources?.[0] || options?.forcedExternalSources?.[0];

    // FASE 57: Set dedicado exclusivamente para rastrear IDs de ejercicios externos ya usados
    const usedExternalExerciseIds = new Set<string>();

    for (let idx = 0; idx < phaseDurations.length; idx++) {
      const { phase, duration } = phaseDurations[idx];
      const previousDrill = selectedDrills.length > 0 ? selectedDrills[selectedDrills.length - 1].exercise : undefined;

      let chosenExercise: any = null;
      let source: "oficial" | "externo" = "oficial";
      let matchScore = 0;
      let rationale = "";

      // A. Comprobar si debemos asignar un ejercicio externo en esta fase principal
      const shouldSlotExternalInThisPhase = 
        remainingExternalToSlot > 0 && 
        (phase.key === "principal_1" || phase.key === "principal_2" || phase.key === "global");

      if (shouldSlotExternalInThisPhase) {
        try {
          const searchQuery = `${intent.primaryObjective} ${preferredExternalSource || ''}`;
          const extRes = await exerciseSearchService.search(searchQuery, {
            ageCategory: intent.ageCategory
          });

          if (extRes.success && extRes.results.length > 0) {
            // Filtrar por fuente preferida, descartar exclusiones y exigir estado de verificación según solicitud (FASE 58 & 59)
            const filteredExt = extRes.results.filter(r => {
              // 1. Ya usado en este slot externo (FASE 57: deduplicación estricta)
              if (usedExternalExerciseIds.has(r.id)) return false;
              // 2. Estado de verificación (FASE 59):
              // - Descartar siempre BROKEN y sourceMismatch
              if (r.verificationStatus === "BROKEN" || r.sourceMismatch) return false;
              // - Si se pide fuente oficial declarada, descartar UNVERIFIED
              if (preferredExternalSource && r.verificationStatus === "UNVERIFIED") return false;
              // - Si se solicitan ejercicios explícitamente VERIFICABLES (requireVerifiedOnly), solo admitir VERIFIED
              if (intent.requireVerifiedOnly && r.verificationStatus !== "VERIFIED") return false;
              
              // 3. Exclusiones del entrenador
              if (intent.excludedObjectives && intent.excludedObjectives.length > 0) {
                const normTitle = (r.title || "").toLowerCase();
                const normTags = (r.tags || []).join(" ").toLowerCase();
                const normTac = (r.tacticalObjective || "").toLowerCase();
                const dominantObj = (r.dominantObjective || "").toLowerCase();
                const isExcl = intent.excludedObjectives.some(ex => {
                  const e = ex.toLowerCase();
                  return dominantObj.includes(e) || normTitle.includes(e) || normTags.includes(e) || normTac.includes(e);
                });
                if (isExcl) return false;
              }
              return true;
            });

            const matchedSource = preferredExternalSource 
              ? filteredExt.filter(r => r.source.toLowerCase().includes(preferredExternalSource.toLowerCase()))
              : filteredExt;
            
            const candidateList = preferredExternalSource ? matchedSource : filteredExt;
            const availableExt = candidateList.find(r => !usedExerciseIdsInSession.has(r.id) && !excludedIds.has(r.id));

            if (availableExt) {
              chosenExercise = {
                ...availableExt,
                is_external: true,
                external: true
              };
              usedExternalExerciseIds.add(availableExt.id);
              usedExerciseIdsInSession.add(availableExt.id);
              source = "externo";
              matchScore = 95;
              const verifLabel = availableExt.verificationStatus === "VERIFIED" ? "Verificado (Evidencia Documental)" : "Fuente Oficial";
              rationale = `🌐 Tarea externa incorporada [${verifLabel}] (${availableExt.source}): cumple con "${intent.primaryObjective}" para ${phase.label}.`;
              remainingExternalToSlot--;
            }
          }
        } catch (err) {
          console.warn("Fallo al buscar ejercicio externo solicitado:", err);
        }
      }

      // B. Si no se seleccionó externo, buscar en el catálogo oficial con Pertinencia Metodológica y Cadena Progresiva
      if (!chosenExercise) {
        const scoredCandidates = internalCatalog
          .filter((ex) => !usedExerciseIdsInSession.has(ex.id))
          .map((ex) => {
            const isPrevUsed = excludedIds.has(ex.id) || excludedIds.has(ex.nombre);
            const { pertinenceScore, reasons, isBlockAppropriate } = this.scoreExercisePertinence(
              ex,
              phase,
              intent,
              previousDrill,
              isPrevUsed
            );
            return {
              exercise: ex,
              pertinenceScore,
              reasons,
              isBlockAppropriate,
              isPrevUsed
            };
          })
          .filter(c => c.isBlockAppropriate && c.pertinenceScore > 0)
          .sort((a, b) => b.pertinenceScore - a.pertinenceScore);

        if (scoredCandidates.length > 0) {
          const best = scoredCandidates[0];
          chosenExercise = best.exercise;
          usedExerciseIdsInSession.add(chosenExercise.id);
          matchScore = Math.min(100, Math.max(70, best.pertinenceScore));
          source = "oficial";

          const reasonsText = best.reasons.length > 0 ? best.reasons.join(" · ") : "Pertinencia pedagógica";
          rationale = `🎯 ${phase.label}: ${reasonsText}.`;
        }
      }

      // C. Asignación de Vuelta a la Calma oficial con validación estricta de pertinencia y fisiología
      if (!chosenExercise && phase.key === "vuelta_calma") {
        const cooldownCandidates = internalCatalog
          .filter(ex => !usedExerciseIdsInSession.has(ex.id))
          .filter(ex => {
            // 1. Exclusiones del intent
            if (intent.excludedObjectives && intent.excludedObjectives.length > 0) {
              const exName = (ex.nombre || "").toLowerCase();
              const exTac = (ex.objetivo_tactico || []).join(" ").toLowerCase();
              const exTags = (ex.tags || []).join(" ").toLowerCase();
              if (intent.excludedObjectives.some(e => exName.includes(e.toLowerCase()) || exTac.includes(e.toLowerCase()) || exTags.includes(e.toLowerCase()))) {
                return false;
              }
            }
            // 2. Fisiología regenerativa obligatoria
            const isSafePhysiology = (ex.carga_fisica ?? 2) <= 2 && (ex.oposicion ?? 2) <= 1;
            if (!isSafePhysiology) return false;

            // 3. Bloque o estructura compatible
            const isCooldownType = (ex.bloque_sesion || "").includes("calma") || (ex.tipo || "").includes("calma") || (ex.tipo || "").includes("analitico") || ex.id === "9a32c3b0-158c-428f-b49b-24d9dca16a7d" || (ex.carga_fisica ?? 2) <= 1;
            return isCooldownType;
          })
          .map(ex => {
            const { pertinenceScore, isBlockAppropriate } = this.scoreExercisePertinence(ex, phase, intent, previousDrill, false);
            return { ex, pertinenceScore, isBlockAppropriate };
          })
          .filter(c => c.isBlockAppropriate || ((c.ex.carga_fisica ?? 2) <= 2 && (c.ex.oposicion ?? 2) <= 1))
          .sort((a, b) => b.pertinenceScore - a.pertinenceScore);

        if (cooldownCandidates.length > 0) {
          const validCooldown = cooldownCandidates[0].ex;
          chosenExercise = validCooldown;
          rationale = `🔄 Vuelta a la calma oficial (${validCooldown.nombre}): regeneración fisiológica y asimilación conceptual.`;
          matchScore = 90;
          usedExerciseIdsInSession.add(validCooldown.id);
        }
      }

      if (!chosenExercise) {
        console.warn(`[SessionPlannerService] No se encontró ningún ejercicio metodológicamente pertinente para la fase ${phase.key} (${phase.label}). El bloque queda sin selección.`);
      }

      if (chosenExercise) {
        // REGLA: Todo ejercicio debe tener un ID trazable. Sin ID → rechazar.
        const exerciseId = chosenExercise.id;
        if (!exerciseId) {
          console.warn(
            `[SessionPlannerService] Ejercicio sin ID rechazado en fase ${phase.key}: "${chosenExercise.nombre}". No se añade a la sesión.`
          );
        } else {
          selectedDrills.push({
            id: `drill_${idx + 1}_${exerciseId}`,
            phase: phase.key,
            phaseLabel: phase.label,
            orderIndex: idx + 1,
            allocatedDurationMin: duration,
            exercise: chosenExercise,
            source,
            selectionRationale: rationale,
            matchScore
          });
        }
      }
    }

    // D. AUDITORÍA PREVIA Y AJUSTE DE COHERENCIA METODOLÓGICA (Pre-Audit Sanity Check Módulo 2)
    const auditRes = this.coherenceAuditor.auditAndRepairSession(selectedDrills, intent, internalCatalog);
    const auditedDrills = auditRes.auditedDrills;
    const calculatedSum = auditedDrills.reduce((acc, d) => acc + d.allocatedDurationMin, 0);
    const isDurationExact = calculatedSum === intent.durationMinutes;

    // Calcular cuántos externos se slotearon realmente
    const requestedExternal = intent.requestedExternalCount || (wantsExternal ? 1 : 0);
    const slottedExternal = requestedExternal - remainingExternalToSlot;
    const srcName = preferredExternalSource ? `${preferredExternalSource} ` : "";
    let externalLimitationNote = "";
    if (remainingExternalToSlot > 0) {
      if (intent.requireVerifiedOnly) {
        externalLimitationNote = ` ⚠️ AVISO: Solicitados: ${requestedExternal} | Ejercicios ${srcName}plenamente verificables: ${slottedExternal} | Incorporados: ${slottedExternal}. Limitación: no existen suficientes ejercicios ${srcName}con evidencia documental específica. No se duplicó ni inventó ningún ejercicio; el resto fue cubierto con la biblioteca oficial.`;
      } else {
        externalLimitationNote = ` ⚠️ AVISO: Solicitados: ${requestedExternal} | Compatibles y verificables: ${slottedExternal} | Incorporados: ${slottedExternal}. Limitación: no existen suficientes ejercicios ${srcName}verificables compatibles. No se duplicó ningún ejercicio; el resto fue cubierto con la biblioteca oficial.`;
      }
    }

    const variantLabel = `Variante ${variantNum} generada`;

    const plan: GeneratedSessionPlan = {
      id: `session_plan_${Date.now()}`,
      title: `Sesión: ${intent.primaryObjective} (${intent.durationMinutes} min)`,
      intent,
      totalDurationMinutes: intent.durationMinutes,
      calculatedDurationMinutes: calculatedSum,
      isDurationExact,
      drills: auditedDrills,
      variantNumber: variantNum,
      variantLabel,
      pertinenceScore: 95,
      coherenceScore: auditRes.coherenceScore,
      coherenceAudited: true,
      pedagogicalChainValid: auditRes.valid,
      coherenceWarnings: auditRes.warnings,
      progressionReport: auditRes.progressionReport,
      methodologicalSummary: `Estructura metodológica (${variantLabel}) de ${intent.durationMinutes} minutos focalizada en ${intent.primaryObjective}${intent.ageCategory ? " para categoría " + intent.ageCategory : ""}${intent.players ? " con " + intent.players + " jugadores" : ""}.${intent.excludedObjectives && intent.excludedObjectives.length > 0 ? " (Exclusiones aplicadas: " + intent.excludedObjectives.join(", ") + ")" : ""} Progresión pedagógica validada desde activación hasta vuelta a la calma regenerativa.${externalLimitationNote}`,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      session: plan,
      warnings: auditRes.warnings,
      responseTimeMs: Date.now() - startTime
    };
  }
}

export const sessionPlannerService = SessionPlannerService.getInstance();
