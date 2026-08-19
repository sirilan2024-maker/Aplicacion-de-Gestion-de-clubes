/**
 * Planificador Metodológico de Microciclos Determinista v1.0
 * Antigravity Methodology OS
 * Arquitectura: Diagnóstico -> Prioridades -> Microciclo MD -> Objetivos Diarios -> Generador Asistido
 */

import { MethodologyPriority } from "./methodologyPriorityEngine";
import { GeneratorContext } from "./methodologySessionGenerator";

export type MicrocycleDayCode = 'MD+1' | 'MD-5' | 'MD-4' | 'MD-3' | 'MD-2' | 'MD-1' | 'MD' | 'REST';

export interface MicrocycleDayPlan {
  dayOfWeek: number; // 1 = Lunes, 2 = Martes, ..., 7 = Domingo
  date: string; // YYYY-MM-DD
  dayName: string; // Lunes, Martes...
  microcycleDay: MicrocycleDayCode;
  isTrainingDay: boolean;
  isMatchDay: boolean;
  plannedDurationMin: number;
  targetLoad: 'Baja' | 'Media' | 'Media-Alta' | 'Alta' | 'Competición' | 'Descanso';
  targetLoadPercentage: number; // 1-100
  objective: string;
  secondaryObjectives: string[];
  priorityContext?: string;
  principles: string[];
  dayReasons: string[];
  sessionId?: string; // Si ya existe sesión vinculada
}

export interface MicrocycleProposal {
  teamId: string;
  seasonId?: string;
  mesocycleId?: string;
  weekStartDate: string;
  matchDayDate?: string;
  matchOpponent?: string;
  totalPlannedMinutes: number;
  weeklyLoadIndex: number;
  primaryWeeklyPriority?: string;
  days: MicrocycleDayPlan[];
  microcycleReasons: string[];
  principlesCovered: {
    covered: string[];
    partiallyCovered: string[];
    pending: string[];
  };
}

export interface MicrocycleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalTrainingDays: number;
    totalMinutes: number;
    avgLoadPercentage: number;
    principlesCount: number;
  };
}

export interface MicrocyclePlannerContext {
  teamId: string;
  category: string;
  seasonId?: string;
  mesocycleId?: string;
  weekStartDate: string; // Lunes YYYY-MM-DD
  matchDayDate?: string; // YYYY-MM-DD (normalmente Sábado o Domingo)
  matchOpponent?: string;
  trainingDays?: number[]; // ej. [2, 4, 5] para Martes, Jueves, Viernes
  priorities?: MethodologyPriority[];
  curriculumPrinciples?: { id: string; name: string; game_phase: string }[];
  teamObjectives?: { id: string; description: string; type: string }[];
  recentSessions?: any[];
}

const DAY_NAMES = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/**
 * Calcula el código MD respecto a la fecha del partido
 */
export function calculateMdCode(dayDateStr: string, matchDateStr?: string): MicrocycleDayCode {
  if (!matchDateStr) return 'MD-3';
  
  const dayDate = new Date(dayDateStr);
  const matchDate = new Date(matchDateStr);
  
  const diffTime = dayDate.getTime() - matchDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0) return 'MD';
  if (diffDays === 1) return 'MD+1';
  if (diffDays === -1) return 'MD-1';
  if (diffDays === -2) return 'MD-2';
  if (diffDays === -3) return 'MD-3';
  if (diffDays === -4) return 'MD-4';
  if (diffDays === -5) return 'MD-5';
  
  return diffDays < 0 ? 'MD-4' : 'REST';
}

/**
 * Genera una propuesta completa de microciclo semanal estructurada en 7 días
 */
export function generateMicrocycleProposal(context: MicrocyclePlannerContext): MicrocycleProposal {
  const {
    teamId,
    category,
    seasonId,
    mesocycleId,
    weekStartDate,
    matchDayDate,
    matchOpponent,
    priorities = [],
    curriculumPrinciples = [],
    teamObjectives = [],
    recentSessions = []
  } = context;

  const defaultTrainingDays = context.trainingDays || [2, 4, 5]; // Default: Martes, Jueves, Viernes
  const baseDate = new Date(weekStartDate);

  const days: MicrocycleDayPlan[] = [];
  const coveredPrinciplesSet = new Set<string>();

  // Prioridad metodológica principal de la semana
  const highPriority = priorities.find(p => p.priorityLevel === 'high') || priorities[0];
  const primaryPriorityTitle = highPriority ? highPriority.title : undefined;

  // Evaluar RPE reciente para alertas de carga
  const recentRpeScores = recentSessions
    .map(s => s.session_evaluations?.[0]?.session_rpe)
    .filter(Boolean)
    .map(Number);
  const avgRecentRpe = recentRpeScores.length > 0 
    ? recentRpeScores.reduce((a, b) => a + b, 0) / recentRpeScores.length 
    : 6;

  // Generar cada uno de los 7 días (Lunes=1 a Domingo=7)
  for (let d = 1; d <= 7; d++) {
    const currentDayDate = new Date(baseDate);
    currentDayDate.setDate(baseDate.getDate() + (d - 1));
    const dateStr = currentDayDate.toISOString().split('T')[0];
    const isMatch = matchDayDate ? dateStr === matchDayDate : (d === 7); // Domingo si no hay fecha
    const mdCode = isMatch ? 'MD' : calculateMdCode(dateStr, matchDayDate);
    const isTraining = !isMatch && defaultTrainingDays.includes(d);

    let duration = 0;
    let targetLoad: MicrocycleDayPlan['targetLoad'] = 'Descanso';
    let targetLoadPercentage = 0;
    let objective = "Descanso / Recuperación activa";
    let secondaryObjectives: string[] = [];
    let dayPriority: string | undefined = undefined;
    let principles: string[] = [];
    const dayReasons: string[] = [];

    if (isMatch) {
      targetLoad = 'Competición';
      targetLoadPercentage = 100;
      duration = 90;
      objective = matchOpponent ? `Partido de Competición vs ${matchOpponent}` : "Partido de Competición";
      dayReasons.push("Día de Partido oficial (MD): Máxima exigencia competitiva y evaluación del modelo");
    } else if (isTraining) {
      if (mdCode === 'MD-3' || mdCode === 'MD-4' || mdCode === 'MD-5') {
        // Día de Tensión / Fuerza / Táctica principal
        targetLoad = 'Alta';
        targetLoadPercentage = 85;
        duration = 90;
        objective = highPriority?.suggestedPrinciple || teamObjectives[0]?.description || "Organización Defensiva y Presión";
        secondaryObjectives = ["Transición Ofensiva", "Duelos"];
        dayPriority = primaryPriorityTitle;
        principles = [objective, ...secondaryObjectives];
        dayReasons.push(`${mdCode}: Día de máxima intensidad metodológica. Foco en ${objective}`);
        if (dayPriority) {
          dayReasons.push(`Alineado con prioridad activa: ${dayPriority}`);
        }
      } else if (mdCode === 'MD-2') {
        // Día de Espacios amplios / Velocidad / Juego de posición
        targetLoad = 'Media-Alta';
        targetLoadPercentage = 70;
        duration = 90;
        objective = "Progresión y Juego de Posición en Amplitud";
        secondaryObjectives = ["Salida de balón", "Circulación"];
        dayPriority = priorities[1]?.title || primaryPriorityTitle;
        principles = [objective, ...secondaryObjectives];
        dayReasons.push("MD-2: Dinámica de espacios amplios y fijación posicional");
      } else if (mdCode === 'MD-1') {
        // Víspera de partido: Activación + ABP
        targetLoad = 'Baja';
        targetLoadPercentage = 45;
        duration = 60;
        objective = "Acciones a Balón Parado y Activación Previa";
        secondaryObjectives = ["Estrategia defensiva", "Velocidad de reacción"];
        principles = [objective, ...secondaryObjectives];
        dayReasons.push("MD-1: Reducción de fatiga neuro-muscular y ajuste de balón parado");
        if (avgRecentRpe >= 7.5) {
          dayReasons.push("Carga modulada a la baja por acumulación reciente de RPE");
        }
      } else if (mdCode === 'MD+1') {
        // Día posterior a partido: Regeneración
        targetLoad = 'Baja';
        targetLoadPercentage = 35;
        duration = 60;
        objective = "Compensación y Recuperación Regenerativa";
        principles = ["Circulación suave", "Rueda de pases"];
        dayReasons.push("MD+1: Tareas de baja carga física para restablecimiento fisiológico");
      }

      principles.forEach(p => coveredPrinciplesSet.add(p));
    } else {
      dayReasons.push("Jornada sin entrenamiento programado (Descanso)");
    }

    days.push({
      dayOfWeek: d,
      date: dateStr,
      dayName: DAY_NAMES[d],
      microcycleDay: mdCode,
      isTrainingDay: isTraining,
      isMatchDay: isMatch,
      plannedDurationMin: duration,
      targetLoad,
      targetLoadPercentage,
      objective,
      secondaryObjectives,
      priorityContext: dayPriority,
      principles,
      dayReasons
    });
  }

  const totalPlannedMinutes = days.reduce((sum, day) => sum + day.plannedDurationMin, 0);
  const trainingDaysCount = days.filter(d => d.isTrainingDay).length;
  const weeklyLoadIndex = Math.round(days.reduce((sum, d) => sum + d.targetLoadPercentage, 0) / 7);

  // Explicabilidad del microciclo
  const microcycleReasons: string[] = [];
  if (primaryPriorityTitle) {
    microcycleReasons.push(`Prioridad semanal de mayor impacto: "${primaryPriorityTitle}" asignada a días de máxima carga (MD-3/MD-4).`);
  }
  microcycleReasons.push(`Estructura semanal distribuida en ${trainingDaysCount} sesiones de entrenamiento + día de partido.`);
  if (avgRecentRpe >= 7.5) {
    microcycleReasons.push(`Modulación preventiva de carga aplicada: RPE histórico reciente elevado (${avgRecentRpe.toFixed(1)}/10).`);
  }

  // Cobertura de principios del currículo
  const allCurriculumNames = curriculumPrinciples.map(p => p.name);
  const covered = allCurriculumNames.filter(name => coveredPrinciplesSet.has(name));
  const pending = allCurriculumNames.filter(name => !coveredPrinciplesSet.has(name));

  return {
    teamId,
    seasonId,
    mesocycleId,
    weekStartDate,
    matchDayDate,
    matchOpponent,
    totalPlannedMinutes,
    weeklyLoadIndex,
    primaryWeeklyPriority: primaryPriorityTitle,
    days,
    microcycleReasons,
    principlesCovered: {
      covered,
      partiallyCovered: covered.length > 0 ? [covered[0]] : [],
      pending
    }
  };
}

/**
 * Regenera deterministamente un único día del microciclo preservando intactos los otros 6 días
 */
export function regenerateMicrocycleDay(
  proposal: MicrocycleProposal,
  dayOfWeek: number, // 1-7
  context: MicrocyclePlannerContext
): MicrocycleProposal {
  const currentDay = proposal.days.find(d => d.dayOfWeek === dayOfWeek);
  if (!currentDay) return proposal;

  const targetDateStr = currentDay.date;
  const isMatch = proposal.matchDayDate ? targetDateStr === proposal.matchDayDate : (dayOfWeek === 7);
  const mdCode = isMatch ? 'MD' : calculateMdCode(targetDateStr, proposal.matchDayDate);

  // Seleccionar objetivo y principio alternativo determinista
  const allPrinciples = (context.curriculumPrinciples || []).map(p => p.name);
  const usedInOtherDays = new Set<string>();
  proposal.days.forEach(d => {
    if (d.dayOfWeek !== dayOfWeek) {
      d.principles.forEach(p => usedInOtherDays.add(p));
    }
  });

  const availablePrinciples = allPrinciples.filter(p => !usedInOtherDays.has(p));
  const newObjective = availablePrinciples.length > 0 ? availablePrinciples[0] : (context.priorities?.[1]?.suggestedPrinciple || "Juego Asociativo");

  const newDayPlan: MicrocycleDayPlan = {
    ...currentDay,
    objective: currentDay.isTrainingDay ? newObjective : currentDay.objective,
    secondaryObjectives: ["Conservación", "Circulación"],
    principles: currentDay.isTrainingDay ? [newObjective, "Conservación"] : currentDay.principles,
    dayReasons: [
      `Regeneración determinista para ${currentDay.dayName} (${mdCode})`,
      `Nuevo objetivo asignado: ${newObjective}`
    ]
  };

  const newDays = proposal.days.map(d => d.dayOfWeek === dayOfWeek ? newDayPlan : d);
  const totalPlannedMinutes = newDays.reduce((sum, d) => sum + d.plannedDurationMin, 0);

  return {
    ...proposal,
    days: newDays,
    totalPlannedMinutes
  };
}

/**
 * Valida globalmente la coherencia temporal, metodológica y de carga del microciclo
 */
export function validateMicrocycleProposal(proposal: MicrocycleProposal): MicrocycleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validaciones Temporales y de Estructura
  if (!proposal.weekStartDate) {
    errors.push("Error temporal: Falta la fecha de inicio del microciclo.");
  }

  if (!proposal.days || proposal.days.length !== 7) {
    errors.push("Error de estructura: El microciclo debe contener exactamente 7 días.");
  }

  const trainingDays = proposal.days.filter(d => d.isTrainingDay);
  if (trainingDays.length === 0) {
    warnings.push("Aviso de planificación: No se ha programado ningún día de entrenamiento en el microciclo.");
  }

  // 2. Validaciones de Carga
  if (proposal.totalPlannedMinutes > 400) {
    warnings.push(`Aviso de Carga: La duración acumulada semanal (${proposal.totalPlannedMinutes} min) es elevada.`);
  }

  // Comprobar si hay dos días de carga alta consecutivos
  for (let i = 0; i < proposal.days.length - 1; i++) {
    if (proposal.days[i].targetLoad === 'Alta' && proposal.days[i + 1].targetLoad === 'Alta') {
      warnings.push(`Alerta de Fatiga: Carga 'Alta' programada en días consecutivos (${proposal.days[i].dayName} y ${proposal.days[i + 1].dayName}).`);
    }
  }

  // Comprobar MD-1 con carga alta
  const md1Day = proposal.days.find(d => d.microcycleDay === 'MD-1');
  if (md1Day && md1Day.targetLoad === 'Alta') {
    warnings.push("Alerta de Carga: Se ha programado carga 'Alta' en el día previo a partido (MD-1).");
  }

  const metrics = {
    totalTrainingDays: trainingDays.length,
    totalMinutes: proposal.totalPlannedMinutes,
    avgLoadPercentage: proposal.weeklyLoadIndex,
    principlesCount: proposal.principlesCovered?.covered?.length || 0
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics
  };
}

/**
 * Convierte un día del microciclo al contexto requerido por el Generador Asistido de Sesiones
 */
export function convertMicrocycleDayToSessionContext(
  day: MicrocycleDayPlan,
  team: { id: string; category: string },
  allExercises: any[],
  recentExerciseIds: string[] = []
): GeneratorContext {
  return {
    teamId: team.id,
    category: team.category,
    objective: day.objective,
    secondaryObjectives: day.secondaryObjectives,
    durationMinutes: day.plannedDurationMin || 90,
    microcycleDay: day.microcycleDay,
    intensityLoad: day.targetLoad === 'Alta' ? 4 : day.targetLoad === 'Media-Alta' ? 3 : 2,
    numPlayers: 16,
    priorityContext: day.priorityContext,
    recentExerciseIds,
    allExercises
  };
}
