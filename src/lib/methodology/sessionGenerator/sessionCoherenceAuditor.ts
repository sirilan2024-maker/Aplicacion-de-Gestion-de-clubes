import { GeneratedSessionDrill, SessionRequestIntent, ProgressionReport } from "./types";
import { PedagogicalProgressionEngine } from "./pedagogicalProgressionEngine";
import { evaluatePureTacticalAffinity } from "../tacticalEngine/tacticalAffinityEngine";

export interface CoherenceAuditResult {
  valid: boolean;
  coherenceScore: number;
  warnings: string[];
  auditedDrills: GeneratedSessionDrill[];
  progressionReport: ProgressionReport;
}

export class SessionCoherenceAuditor {
  private static instance: SessionCoherenceAuditor;
  private progressionEngine = PedagogicalProgressionEngine.getInstance();

  private constructor() {}

  public static getInstance(): SessionCoherenceAuditor {
    if (!SessionCoherenceAuditor.instance) {
      SessionCoherenceAuditor.instance = new SessionCoherenceAuditor();
    }
    return SessionCoherenceAuditor.instance;
  }

  /**
   * Performs deep sanity audit and automatic repair on the candidate session drills.
   * REGLA ABSOLUTA: Nunca devuelve un ejercicio que viole exclusiones o restricciones.
   * Si no hay sustituto válido → repairFailed = true → valid = false.
   */
  public auditAndRepairSession(
    drills: GeneratedSessionDrill[],
    intent: SessionRequestIntent,
    catalog: any[]
  ): CoherenceAuditResult {
    const warnings: string[] = [];
    let coherenceScore = 100;
    let repairFailed = false;

    // 1. Audit Vuelta a la Calma (Must be strictly regenerative)
    const repairedDrills = drills.map((drill) => {
      const ex = drill.exercise || {};
      const name = (ex.nombre || ex.title || "").toLowerCase();
      const cargaFisica = ex.carga_fisica ?? 2;
      const oposicion = ex.oposicion ?? 2;

      if (drill.phase === "vuelta_calma") {
        const needsRepair =
          cargaFisica > 2 ||
          oposicion > 1 ||
          name.includes("presión alta") ||
          name.includes("salida de balón") ||
          name.includes("contraataque") ||
          name.includes("partido");

        if (needsRepair) {
          warnings.push("Vuelta a la calma ajustada automáticamente a baja intensidad regenerativa.");
          coherenceScore -= 5;

          // Buscar sustituto oficial estrictamente regenerativo del catálogo
          const officialCooldown =
            catalog.find(c => c.id === "9a32c3b0-158c-428f-b49b-24d9dca16a7d") ||
            catalog.find(c =>
              (c.bloque_sesion || "").includes("calma") ||
              (c.tipo || "").includes("calma")
            ) ||
            catalog.find(c =>
              (c.carga_fisica ?? 2) <= 1 && (c.oposicion ?? 2) <= 1
            ) ||
            catalog.find(c =>
              (c.carga_fisica ?? 2) <= 2 && (c.oposicion ?? 2) <= 1
            );

          if (!officialCooldown) {
            // No existe sustituto válido en el catálogo → marcar fallo de reparación
            warnings.push(
              "REPAIR_FAILED: No existe ejercicio de vuelta a la calma válido en el catálogo oficial. Sesión inválida."
            );
            repairFailed = true;
            coherenceScore -= 40;
            return drill; // Devolvemos el drill original SIN modificar para que el validator lo detecte
          }

          return {
            ...drill,
            exercise: officialCooldown,
            source: "oficial" as const,
            selectionRationale: `🔄 Vuelta a la calma oficial (${officialCooldown.nombre}) validada por el auditor de coherencia.`
          };
        }
      }

      // 2. Audit Exclusiones Semánticas
      if (intent.excludedObjectives && intent.excludedObjectives.length > 0) {
        const exTac = (ex.objetivo_tactico || (ex.tacticalObjective ? [ex.tacticalObjective] : [])).join(" ").toLowerCase();
        const exTags = (ex.tags || []).join(" ").toLowerCase();

        const hasViolation = intent.excludedObjectives.some((excl) => {
          const e = excl.toLowerCase();
          return name.includes(e) || exTac.includes(e) || exTags.includes(e);
        });

        if (hasViolation) {
          warnings.push(`Tarea con objetivo excluido "${intent.excludedObjectives.join(", ")}" sustituida automáticamente.`);
          coherenceScore -= 10;

          // Buscar sustituto compatible en catálogo con afinidad táctica real
          const safeCandidates = catalog.filter((c) => {
            const cName = (c.nombre || "").toLowerCase();
            const cTac = (c.objetivo_tactico || []).join(" ").toLowerCase();
            const cTags = (c.tags || []).join(" ").toLowerCase();
            // Descartar si contiene cualquier objetivo excluido
            const hasExcl = intent.excludedObjectives!.some((e) =>
              cName.includes(e.toLowerCase()) ||
              cTac.includes(e.toLowerCase()) ||
              cTags.includes(e.toLowerCase())
            );
            if (hasExcl) return false;
            // Exigir afinidad táctica real con el objetivo principal
            const tacEval = evaluatePureTacticalAffinity(c, {
              name: intent.primaryObjective,
              game_phase: intent.primaryObjective
            });
            return tacEval && tacEval.hasMeaningfulAffinity;
          });

          // Preferir candidato de la misma categoría de edad
          const replacement =
            safeCandidates.find(c => c.age_category === intent.ageCategory) ||
            safeCandidates[0];

          if (!replacement) {
            // No existe sustituto válido → fallo de reparación, NO reusar el ejercicio violador
            warnings.push(
              `REPAIR_FAILED: Sin sustituto válido para la exclusión "${intent.excludedObjectives.join(", ")}". Sesión inválida.`
            );
            repairFailed = true;
            coherenceScore -= 40;
            return drill; // Devolvemos el drill original SIN modificar para que el validator lo detecte
          }

          return {
            ...drill,
            exercise: replacement,
            source: "oficial" as const,
            selectionRationale: `🎯 Sustitución automática: garantiza exclusión estricta de "${intent.excludedObjectives.join(", ")}" manteniendo el foco táctico.`
          };
        }
      }

      return drill;
    });

    // 3. Evaluar Progresión Didáctica Inter-Tareas
    const progressionReport = this.progressionEngine.evaluateSessionProgression(repairedDrills, intent);

    if (progressionReport.affinityScoreP1P2 < 70) {
      warnings.push("Afinidad conceptual moderada entre Principal 1 y Principal 2.");
      coherenceScore -= 5;
    }

    if (intent.microcycleDay === "MD-1") {
      const highLoadDrills = repairedDrills.filter(d => (d.exercise?.carga_fisica ?? 2) >= 3);
      if (highLoadDrills.length > 0) {
        warnings.push("Sesión MD-1: se recomienda moderar la carga neuromuscular antes del partido.");
        coherenceScore -= 5;
      }
    }

    // 4. Asegurar campos de métricas en drills
    const validAssignedDrills = repairedDrills.filter(d => d.exercise && d.exercise.id);
    const missingCount = 5 - validAssignedDrills.length;

    if (missingCount > 0) {
      warnings.push(`INCOMPLETE_SESSION: Faltan ${missingCount} bloque(s) obligatorio(s) en la sesión.`);
      repairFailed = true;
      coherenceScore = Math.max(0, Math.min(60, Math.round((validAssignedDrills.length / 5) * 100) - (missingCount * 10)));
    }

    const finalDrills: GeneratedSessionDrill[] = repairedDrills.map((d, index) => {
      const ex = d.exercise || {};
      return {
        ...d,
        oppositionLevel: ex.oposicion ?? 2,
        representativeness: ex.representatividad ?? 2,
        cognitiveLoad: ex.carga_cognitiva ?? 2,
        physicalLoad: ex.carga_fisica ?? 2,
        affinityWithPrevious: index > 0 ? 85 : undefined,
        goalkeeperRole: intent.goalkeepers === 0 ? "none" : (intent.goalkeepers === 1 ? "active" : "dual")
      };
    });

    return {
      valid: !repairFailed && missingCount === 0,
      coherenceScore: repairFailed ? coherenceScore : Math.max(75, coherenceScore),
      warnings,
      auditedDrills: finalDrills,
      progressionReport
    };
  }
}
