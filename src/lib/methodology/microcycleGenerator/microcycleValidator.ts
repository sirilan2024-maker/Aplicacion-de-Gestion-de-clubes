import { MicrocycleProposal, MicrocycleDayPlan } from "../methodologyMicrocyclePlanner";

export interface MicrocycleValidationFailure {
  code:
    | "STRUCTURE_DAYS_COUNT_INVALID"
    | "MD1_HIGH_LOAD_FATIGUE_RISK"
    | "CONSECUTIVE_HIGH_LOAD_DAYS"
    | "MISSING_WEEKLY_PRIORITY_IN_PEAK_DAYS"
    | "DUPLICATE_SESSIONS_ACROSS_DAYS"
    | "CONTRADICTORY_DAILY_OBJECTIVES"
    | "WEEKLY_LOAD_EXCESSIVE";
  dayOfWeek?: number;
  dayName?: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface MicrocycleValidationReport {
  isValid: boolean;
  status: "MICROCYCLE_VALID" | "MICROCYCLE_INVALID" | "MICROCYCLE_WARNING";
  score: number; // 0-100
  failures: MicrocycleValidationFailure[];
  warnings: string[];
  metrics: {
    totalDays: number;
    trainingDaysCount: number;
    totalMinutes: number;
    weeklyLoadIndex: number;
    principlesCoveredCount: number;
    hasMatchDay: boolean;
  };
}

export class MicrocycleValidator {
  private static instance: MicrocycleValidator;

  private constructor() {}

  public static getInstance(): MicrocycleValidator {
    if (!MicrocycleValidator.instance) {
      MicrocycleValidator.instance = new MicrocycleValidator();
    }
    return MicrocycleValidator.instance;
  }

  /**
   * Performs deep adversarial validation on a complete microcycle proposal.
   */
  public validateMicrocycle(proposal: MicrocycleProposal): MicrocycleValidationReport {
    const failures: MicrocycleValidationFailure[] = [];
    const warnings: string[] = [];

    // 1. Validar 7 días exactos
    if (!proposal.days || proposal.days.length !== 7) {
      failures.push({
        code: "STRUCTURE_DAYS_COUNT_INVALID",
        message: `El microciclo debe contener exactamente 7 días (encontrados: ${proposal.days?.length || 0})`,
        severity: "ERROR"
      });
    }

    const trainingDays = (proposal.days || []).filter(d => d.isTrainingDay);
    const matchDay = (proposal.days || []).find(d => d.isMatchDay);

    // 2. Validar que MD-1 no tenga carga 'Alta'
    const md1 = (proposal.days || []).find(d => d.microcycleDay === "MD-1");
    if (md1 && md1.isTrainingDay && (md1.targetLoad === "Alta" || md1.targetLoadPercentage > 60)) {
      failures.push({
        code: "MD1_HIGH_LOAD_FATIGUE_RISK",
        dayOfWeek: md1.dayOfWeek,
        dayName: md1.dayName,
        message: `Riesgo crítico de fatiga competitiva: MD-1 (${md1.dayName}) programado con carga '${md1.targetLoad}' (${md1.targetLoadPercentage}%) antes del partido`,
        severity: "ERROR"
      });
    }

    // 3. Validar que no haya 2 días consecutivos de carga Alta
    for (let i = 0; i < (proposal.days || []).length - 1; i++) {
      const d1 = proposal.days[i];
      const d2 = proposal.days[i + 1];
      if (d1.isTrainingDay && d2.isTrainingDay && d1.targetLoad === "Alta" && d2.targetLoad === "Alta") {
        failures.push({
          code: "CONSECUTIVE_HIGH_LOAD_DAYS",
          dayOfWeek: d2.dayOfWeek,
          dayName: d2.dayName,
          message: `Acumulación excesiva de estrés fisiológico: días consecutivos de carga 'Alta' (${d1.dayName} y ${d2.dayName})`,
          severity: "ERROR"
        });
      }
    }

    // 4. Validar presencia de la prioridad semanal en días pico (MD-4 o MD-3)
    if (proposal.primaryWeeklyPriority) {
      const peakDays = (proposal.days || []).filter(d => d.isTrainingDay && (d.microcycleDay === "MD-4" || d.microcycleDay === "MD-3"));
      const isPriorityPresentInPeak = peakDays.some(d => 
        (d.objective || "").toLowerCase().includes(proposal.primaryWeeklyPriority!.toLowerCase()) ||
        (d.principles || []).some(p => p.toLowerCase().includes(proposal.primaryWeeklyPriority!.toLowerCase())) ||
        (d.priorityContext || "").toLowerCase().includes(proposal.primaryWeeklyPriority!.toLowerCase())
      );

      if (peakDays.length > 0 && !isPriorityPresentInPeak) {
        warnings.push(`La prioridad semanal "${proposal.primaryWeeklyPriority}" no está explícitamente programada en los días pico de entrenamiento.`);
      }
    }

    // 5. Validar que no haya objetivos contradictorios absurdos entre días
    const dailyObjectives = (proposal.days || []).filter(d => d.isTrainingDay).map(d => d.objective.toLowerCase());
    const hasDef = dailyObjectives.some(o => o.includes("bloque bajo") || o.includes("repliegue"));
    const hasHighPress = dailyObjectives.some(o => o.includes("presión alta"));
    if (hasDef && hasHighPress) {
      warnings.push("Microciclo bipolar: Se combinan modelos de bloque bajo y presión alta en la misma semana sin fase de transición definida.");
    }

    // 6. Métricas
    const totalMinutes = (proposal.days || []).reduce((sum, d) => sum + (d.plannedDurationMin || 0), 0);
    const weeklyLoadIndex = proposal.weeklyLoadIndex || Math.round((proposal.days || []).reduce((sum, d) => sum + d.targetLoadPercentage, 0) / 7);
    const coveredPrinciplesCount = proposal.principlesCovered?.covered?.length || 0;

    const errorCount = failures.filter(f => f.severity === "ERROR").length;
    const isValid = errorCount === 0;
    const score = Math.max(0, 100 - (errorCount * 30) - (warnings.length * 5));

    return {
      isValid,
      status: isValid ? (warnings.length > 0 ? "MICROCYCLE_WARNING" : "MICROCYCLE_VALID") : "MICROCYCLE_INVALID",
      score,
      failures,
      warnings,
      metrics: {
        totalDays: proposal.days?.length || 0,
        trainingDaysCount: trainingDays.length,
        totalMinutes,
        weeklyLoadIndex,
        principlesCoveredCount: coveredPrinciplesCount,
        hasMatchDay: Boolean(matchDay)
      }
    };
  }
}

export const microcycleValidator = MicrocycleValidator.getInstance();
