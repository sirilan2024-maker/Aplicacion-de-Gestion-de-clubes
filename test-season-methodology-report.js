/**
 * Tests Unitarios: Memoria Metodológica de Temporada v1.0
 * Antigravity Methodology OS - Fase 4.6
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: MEMORIA METODOLÓGICA DE TEMPORADA v1.0");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

const { 
  buildSeasonMethodologyReportFromData,
  getTeamsMethodologyComparisonFromData 
} = require("./src/lib/methodology/seasonMethodologyReportService");

// Principios del Currículo Demo
const mockCurriculumPrinciples = [
  { id: "p-1", name: "Salida de balón", game_phase: "Ataque", sort_order: 1 },
  { id: "p-2", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa", sort_order: 2 },
  { id: "p-3", name: "Repliegue intensivo", game_phase: "Defensa", sort_order: 3 },
  { id: "p-4", name: "Balón parado ofensivo", game_phase: "Balón Parado", sort_order: 4 }
];

// Objetivos del Equipo Demo
const mockTeamObjectives = [
  { id: "obj-1", description: "Salida de balón organizada", objective_type: "táctico", status: "en_progreso" },
  { id: "obj-2", description: "Presión tras pérdida inmediata", objective_type: "táctico", status: "en_progreso" },
  { id: "obj-3", description: "Balón parado defensivo", objective_type: "táctico", status: "pendiente" }
];

console.log("--- 1. Test de Temporada Vacía (0 Sesiones) ---");
const emptyReport = buildSeasonMethodologyReportFromData({
  team: { id: "team-1", name: "Cadete A", category: "cadete" },
  season: { id: "season-2627", name: "Temporada 2026/2027" },
  sessions: [],
  curriculumPrinciples: mockCurriculumPrinciples,
  teamObjectives: mockTeamObjectives
});

assert(emptyReport.summary.plannedSessions === 0, "Temporada vacía: 0 sesiones planificadas");
assert(emptyReport.summary.evaluationPercentage === 0, "Temporada vacía: 0% evaluadas");
assert(emptyReport.summary.trainedPrinciplesCount === 0, "Temporada vacía: 0 principios trabajados");
assert(emptyReport.summary.neverTrainedPrinciplesCount === 4, "Temporada vacía: 4 principios nunca trabajados");
assert(emptyReport.dataQuality.notes.length > 0, "Temporada vacía: registra notas de calidad de datos");

console.log("\n--- 2. Test de Temporada Sin Evaluaciones (Solo Planificación) ---");
const unEvaluatedSessions = [
  { id: "s-1", date_time: "2026-09-01", duration_minutes: 90, objective: "Salida de balón", session_evaluations: [] },
  { id: "s-2", date_time: "2026-09-03", duration_minutes: 90, objective: "Presión tras pérdida", session_evaluations: [] }
];

const unEvaluatedReport = buildSeasonMethodologyReportFromData({
  team: { id: "team-1", name: "Cadete A" },
  season: { id: "season-2627", name: "Temporada 2026/2027" },
  sessions: unEvaluatedSessions,
  curriculumPrinciples: mockCurriculumPrinciples,
  teamObjectives: mockTeamObjectives
});

assert(unEvaluatedReport.summary.plannedSessions === 2, "2 sesiones planificadas");
assert(unEvaluatedReport.summary.evaluatedSessions === 0, "0 sesiones evaluadas");
assert(unEvaluatedReport.summary.evaluationPercentage === 0, "0% de evaluación");
assert(unEvaluatedReport.dataQuality.unevaluatedSessionsCount === 2, "Calidad de datos: 2 sesiones no evaluadas");

console.log("\n--- 3. Test de Temporada Completa con Evaluaciones y Evolución ---");
const mockCompleteSessions = [
  // 4 sesiones de Salida de balón (buena consecución 3.5)
  {
    id: "s-10", date_time: "2026-09-10", duration_minutes: 90, objective: "Salida de balón", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 90, session_rpe: 6, objective_achievement: 3, players_present_count: 15,
      session_behaviour_evaluations: [{ behaviour_description: "Perfilación corporal", score: 3 }]
    }]
  },
  {
    id: "s-11", date_time: "2026-09-12", duration_minutes: 90, objective: "Salida de balón", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 95, session_rpe: 7, objective_achievement: 4, players_present_count: 16,
      session_behaviour_evaluations: [{ behaviour_description: "Perfilación corporal", score: 4 }]
    }]
  },
  {
    id: "s-12", date_time: "2026-09-15", duration_minutes: 90, objective: "Salida de balón", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 90, session_rpe: 6, objective_achievement: 3.5, players_present_count: 16,
      session_behaviour_evaluations: [{ behaviour_description: "Perfilación corporal", score: 4 }]
    }]
  },
  {
    id: "s-13", date_time: "2026-09-18", duration_minutes: 90, objective: "Salida de balón", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 90, session_rpe: 6, objective_achievement: 4, players_present_count: 15,
      session_behaviour_evaluations: [{ behaviour_description: "Perfilación corporal", score: 4 }]
    }]
  },
  // 3 sesiones de Presión tras pérdida (consecución baja 1.8)
  {
    id: "s-20", date_time: "2026-09-20", duration_minutes: 90, objective: "Presión tras pérdida", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 110, session_rpe: 8, objective_achievement: 2, players_present_count: 14,
      session_behaviour_evaluations: [{ behaviour_description: "Acoso en 3 segundos", score: 2 }]
    }]
  },
  {
    id: "s-21", date_time: "2026-09-22", duration_minutes: 90, objective: "Presión tras pérdida", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 110, session_rpe: 8, objective_achievement: 2, players_present_count: 15,
      session_behaviour_evaluations: [{ behaviour_description: "Acoso en 3 segundos", score: 1.5 }]
    }]
  },
  {
    id: "s-22", date_time: "2026-09-25", duration_minutes: 90, objective: "Presión tras pérdida", num_players: 16,
    session_evaluations: [{
      actual_duration_min: 110, session_rpe: 8, objective_achievement: 1.5, players_present_count: 14,
      session_behaviour_evaluations: [{ behaviour_description: "Acoso en 3 segundos", score: 1.5 }]
    }]
  }
];

const completeReport = buildSeasonMethodologyReportFromData({
  team: { id: "team-1", name: "Cadete A", category: "cadete" },
  season: { id: "season-2627", name: "Temporada 2026/2027" },
  sessions: mockCompleteSessions,
  curriculumPrinciples: mockCurriculumPrinciples,
  teamObjectives: mockTeamObjectives
});

assert(completeReport.summary.plannedSessions === 7, "Total 7 sesiones registradas");
assert(completeReport.summary.evaluatedSessions === 7, "100% de sesiones evaluadas");
assert(completeReport.summary.evaluationPercentage === 100, "Porcentaje de evaluación 100%");
assert(completeReport.summary.avgRpe > 0, "RPE medio calculado correctamente");
assert(completeReport.summary.avgObjectiveAchievement > 0, "Consecución media calculada");

console.log("\n--- 4. Test de Clasificación de Cobertura de Principios ---");
const pSalida = completeReport.principlesCoverage.find(p => p.principleName === "Salida de balón");
assert(pSalida.classification === "trabajado", "Salida de balón (4 sesiones) clasificado como 'trabajado'");
assert(pSalida.avgAchievement >= 3.2, "Salida de balón tiene alta consecución");
assert(!pSalida.isLowAchievement, "Salida de balón NO está en baja consecución");

const pPresion = completeReport.principlesCoverage.find(p => p.principleName === "Presión tras pérdida");
assert(pPresion.classification === "poco_trabajado", "Presión tras pérdida (3 sesiones) clasificado como 'poco_trabajado'");
assert(pPresion.isLowAchievement === true, "Presión tras pérdida detectado como 'baja consecución' (media <= 2.2)");

const pRepliegue = completeReport.principlesCoverage.find(p => p.principleName === "Repliegue intensivo");
assert(pRepliegue.classification === "nunca_trabajado", "Repliegue intensivo (0 sesiones) clasificado como 'nunca_trabajado'");

console.log("\n--- 5. Test de Evolución de Comportamientos (Regla N >= 3) ---");
const bPerfilacion = completeReport.behaviourEvolution.find(b => b.behaviourDescription === "Perfilación corporal");
assert(bPerfilacion.sampleSize === 4, "Muestra de Perfilación: N = 4");
assert(bPerfilacion.trend === "improving" || bPerfilacion.trend === "stable", "Perfilación con tendencia positiva");
assert(bPerfilacion.percentageVariation !== null, "Variación porcentual calculada cuando N >= 3");

const bAcoso = completeReport.behaviourEvolution.find(b => b.behaviourDescription === "Acoso en 3 segundos");
assert(bAcoso.sampleSize === 3, "Muestra de Acoso: N = 3");
assert(bAcoso.trend === "declining" || bAcoso.trend === "stable", "Acoso detecta tendencia declinante/baja");

console.log("\n--- 6. Test de Planificado vs Conseguido (Objetivos del Equipo) ---");
const objSalida = completeReport.objectivesProgress.find(o => o.description.includes("Salida de balón"));
assert(objSalida.status === "achieved", "Objetivo Salida de balón: estado 'achieved'");

const objPresion = completeReport.objectivesProgress.find(o => o.description.includes("Presión tras pérdida"));
assert(objPresion.status === "at_risk", "Objetivo Presión tras pérdida: estado 'at_risk'");

const objABP = completeReport.objectivesProgress.find(o => o.description.includes("Balón parado"));
assert(objABP.status === "insufficient_data", "Objetivo Balón parado sin sesiones: estado 'insufficient_data'");

console.log("\n--- 7. Test de Conclusiones Deterministas con Evidencia Numérica ---");
assert(completeReport.conclusions.length > 0, "Genera conclusiones automáticas deterministas");
assert(completeReport.conclusions.some(c => c.type === "strength"), "Genera conclusión de fortaleza táctica");
assert(completeReport.conclusions.some(c => c.type === "gap"), "Genera conclusión de gap del currículo");
assert(completeReport.conclusions.some(c => c.type === "risk"), "Genera conclusión de riesgo por desvío de duración");

console.log("\n--- 8. Test de Comparativa Multi-Equipo ---");
const comparison = getTeamsMethodologyComparisonFromData([completeReport]);
assert(comparison.length === 1, "Comparativa genera 1 registro por equipo");
assert(comparison[0].teamName === "Cadete A", "Mapea nombre de equipo en comparativa");
assert(comparison[0].evaluationPercentage === 100, "Mapea porcentaje de evaluación");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS MEMORIA DE TEMPORADA: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
