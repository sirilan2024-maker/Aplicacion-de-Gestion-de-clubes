import { GeneratedSessionDrill, GeneratedSessionPlan, SessionRequestIntent } from "./types";
import { evaluatePureTacticalAffinity } from "../tacticalEngine/tacticalAffinityEngine";

export interface SessionValidationFailure {
  code: 
    | "TACTICAL_NULL_IN_MAIN_PHASE"
    | "EXCLUDED_OBJECTIVE_VIOLATION"
    | "DUPLICATE_DRILL_IN_SESSION"
    | "DURATION_SUM_MISMATCH"
    | "COOLDOWN_LOAD_EXCESSIVE"
    | "OPPOSITION_REGRESSION"
    | "CATEGORY_PEDAGOGICAL_MISMATCH";
  phase?: string;
  drillId?: string;
  drillName?: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface SessionValidationReport {
  isValid: boolean;
  status: "SESSION_VALID" | "SESSION_INVALID" | "SESSION_WARNING";
  score: number; // 0 - 100
  failures: SessionValidationFailure[];
  warnings: string[];
  metrics: {
    totalDuration: number;
    tacticalDirectCount: number;
    tacticalSecondaryCount: number;
    avgPhysicalLoad: number;
    avgCognitiveLoad: number;
    avgOpposition: number;
    avgRepresentativeness: number;
  };
}

export class SessionValidator {
  private static instance: SessionValidator;

  private constructor() {}

  public static getInstance(): SessionValidator {
    if (!SessionValidator.instance) {
      SessionValidator.instance = new SessionValidator();
    }
    return SessionValidator.instance;
  }

  /**
   * Performs an adversarial, multi-layer validation of a proposed training session.
   */
  public validateSession(
    drills: GeneratedSessionDrill[],
    intent: SessionRequestIntent
  ): SessionValidationReport {
    const failures: SessionValidationFailure[] = [];
    const warnings: string[] = [];

    // 1. Validar Suma Exacta de Duración
    const durationSum = drills.reduce((sum, d) => sum + (d.allocatedDurationMin || 0), 0);
    if (durationSum !== intent.durationMinutes) {
      failures.push({
        code: "DURATION_SUM_MISMATCH",
        message: `La suma de duración (${durationSum} min) no coincide con la duración solicitada (${intent.durationMinutes} min)`,
        severity: "ERROR"
      });
    }

    // 2. Validar Deduplicación de Ejercicios en la Sesión
    const seenIds = new Set<string>();
    for (const drill of drills) {
      const exId = drill.exercise?.id;
      if (exId) {
        if (seenIds.has(exId)) {
          failures.push({
            code: "DUPLICATE_DRILL_IN_SESSION",
            drillId: exId,
            drillName: drill.exercise?.nombre,
            message: `Ejercicio duplicado detectado en la misma sesión: "${drill.exercise?.nombre}" (ID: ${exId})`,
            severity: "ERROR"
          });
        }
        seenIds.add(exId);
      }
    }

    // 3. Validar Afinidad Táctica en Fases Principales y Global
    let tacticalDirectCount = 0;
    let tacticalSecondaryCount = 0;

    for (const drill of drills) {
      const ex = drill.exercise;
      if (!ex) {
        failures.push({
          code: "TACTICAL_NULL_IN_MAIN_PHASE",
          phase: drill.phase,
          drillId: drill.id,
          drillName: "Sin ejercicio asignado",
          message: `Fase ${drill.phaseLabel || drill.phase} no tiene ejercicio asignado (null o indefinido)`,
          severity: "ERROR"
        });
        continue;
      }

      if (drill.phase === "principal_1" || drill.phase === "principal_2" || drill.phase === "global") {
        const tacEval = evaluatePureTacticalAffinity(ex, {
          name: intent.primaryObjective,
          game_phase: intent.primaryObjective
        });

        if (!tacEval || !tacEval.hasMeaningfulAffinity) {
          // Comprobar si coincide con objetivos secundarios explícitos
          let secondaryMatch = false;
          if (intent.secondaryObjectives && intent.secondaryObjectives.length > 0) {
            for (const sec of intent.secondaryObjectives) {
              const secEval = evaluatePureTacticalAffinity(ex, { name: sec, game_phase: sec });
              if (secEval && secEval.hasMeaningfulAffinity) {
                secondaryMatch = true;
                tacticalSecondaryCount++;
                break;
              }
            }
          }

          if (!secondaryMatch && !ex.is_external) {
            failures.push({
              code: "TACTICAL_NULL_IN_MAIN_PHASE",
              phase: drill.phase,
              drillId: ex.id,
              drillName: ex.nombre,
              message: `Fase ${drill.phaseLabel} contiene ejercicio "${ex.nombre}" sin afinidad táctica con "${intent.primaryObjective}"`,
              severity: "ERROR"
            });
          }
        } else {
          if (tacEval.affinityType === "DIRECT") {
            tacticalDirectCount++;
          } else {
            tacticalSecondaryCount++;
          }
        }
      }

      // 4. Validar Exclusiones Semánticas
      if (intent.excludedObjectives && intent.excludedObjectives.length > 0) {
        const name = (ex.nombre || ex.title || "").toLowerCase();
        const tacObj = (ex.objetivo_tactico || []).map((t: string) => t.toLowerCase()).join(" ");
        const tags = (ex.tags || []).map((t: string) => t.toLowerCase()).join(" ");

        for (const excl of intent.excludedObjectives) {
          const e = excl.toLowerCase();
          if (name.includes(e) || tacObj.includes(e) || tags.includes(e)) {
            failures.push({
              code: "EXCLUDED_OBJECTIVE_VIOLATION",
              phase: drill.phase,
              drillId: ex.id,
              drillName: ex.nombre,
              message: `Ejercicio "${ex.nombre}" contiene el concepto explícitamente excluido "${excl}"`,
              severity: "ERROR"
            });
          }
        }
      }

      // 5. Validar Vuelta a la Calma
      if (drill.phase === "vuelta_calma") {
        const cargaFisica = ex.carga_fisica ?? 1;
        const oposicion = ex.oposicion ?? 1;
        if (cargaFisica > 2 || oposicion > 1) {
          failures.push({
            code: "COOLDOWN_LOAD_EXCESSIVE",
            phase: "vuelta_calma",
            drillId: ex.id,
            drillName: ex.nombre,
            message: `Vuelta a la calma con sobrecarga física (${cargaFisica}/4) u oposición activa (${oposicion}/4)`,
            severity: "ERROR"
          });
        }
      }
    }

    // 6. Validar Progresión Didáctica de Oposición (P1 <= P2 <= Global)
    const p1 = drills.find(d => d.phase === "principal_1");
    const p2 = drills.find(d => d.phase === "principal_2");
    const globalDrill = drills.find(d => d.phase === "global");

    if (p1 && p2) {
      const opo1 = p1.exercise?.oposicion ?? 2;
      const opo2 = p2.exercise?.oposicion ?? 2;
      if (opo1 > opo2 + 1) {
        warnings.push("Aviso pedagógico: Oposición de Principal 1 supera notablemente a Principal 2.");
      }
    }

    if (p2 && globalDrill) {
      const rep2 = p2.exercise?.representatividad ?? 2;
      const repGlob = globalDrill.exercise?.representatividad ?? 3;
      if (repGlob < rep2) {
        warnings.push("Aviso pedagógico: El juego global tiene menor representatividad que la tarea principal.");
      }
    }

    // Cálculo de Métricas Finales
    const count = drills.length || 1;
    const avgPhysicalLoad = Math.round((drills.reduce((acc, d) => acc + (d.exercise?.carga_fisica ?? 2), 0) / count) * 10) / 10;
    const avgCognitiveLoad = Math.round((drills.reduce((acc, d) => acc + (d.exercise?.carga_cognitiva ?? 2), 0) / count) * 10) / 10;
    const avgOpposition = Math.round((drills.reduce((acc, d) => acc + (d.exercise?.oposicion ?? 2), 0) / count) * 10) / 10;
    const avgRepresentativeness = Math.round((drills.reduce((acc, d) => acc + (d.exercise?.representatividad ?? 2), 0) / count) * 10) / 10;

    const errorCount = failures.filter(f => f.severity === "ERROR").length;
    const isValid = errorCount === 0;
    const score = Math.max(0, 100 - (errorCount * 25) - (warnings.length * 5));

    return {
      isValid,
      status: isValid ? (warnings.length > 0 ? "SESSION_WARNING" : "SESSION_VALID") : "SESSION_INVALID",
      score,
      failures,
      warnings,
      metrics: {
        totalDuration: durationSum,
        tacticalDirectCount,
        tacticalSecondaryCount,
        avgPhysicalLoad,
        avgCognitiveLoad,
        avgOpposition,
        avgRepresentativeness
      }
    };
  }
}

export const sessionValidator = SessionValidator.getInstance();
