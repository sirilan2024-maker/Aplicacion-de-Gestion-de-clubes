/**
 * Tests Unitarios de Auditoría Integral y Hardening del Ecosistema Metodológico v1.0
 * Antigravity Methodology OS - Fase 4.8
 */

console.log("================================================================================");
console.log("TESTS DE AUDITORÍA INTEGRAL Y HARDENING METODOLÓGICO v1.0");
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

const { METHODOLOGY_RULES } = require("./src/lib/methodology/methodologyPriorityEngine");
const { RECOMMENDATION_WEIGHTS, scoreExercise, recommendExercises } = require("./src/lib/methodology/recommendationEngine");
const { allocateSessionTime, generateMethodologySessionProposal, regenerateMethodologyBlock, validateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { calculateMdCode, generateMicrocycleProposal, regenerateMicrocycleDay, validateMicrocycleProposal } = require("./src/lib/methodology/methodologyMicrocyclePlanner");
const { buildSeasonMethodologyReportFromData, getTeamsMethodologyComparisonFromData } = require("./src/lib/methodology/seasonMethodologyReportService");

console.log("--- 1. Auditoría de Reglas de Negocio Centralizadas ---");
assert(METHODOLOGY_RULES.MIN_TREND_OBSERVATIONS === 3, "Regla N >= 3 centralizada en METHODOLOGY_RULES");
assert(METHODOLOGY_RULES.LOW_ACHIEVEMENT_THRESHOLD === 2.2, "Threshold de baja consecución = 2.2 centralizado");
assert(METHODOLOGY_RULES.STALE_PRINCIPLE_DAYS === 21, "Threshold de principio obsoleto = 21 días centralizado");
assert(METHODOLOGY_RULES.HIGH_RPE_THRESHOLD === 8, "Threshold de RPE elevado = 8 centralizado");
assert(METHODOLOGY_RULES.REPEATED_RPE_THRESHOLD === 7.5, "Threshold de modulación preventiva = 7.5 centralizado");
assert(METHODOLOGY_RULES.DURATION_DEV_MINUTES === 15, "Threshold de desviación de duración = 15 min centralizado");

console.log("\n--- 2. Auditoría de Integridad Temporal Exacta (9 Casos: 30' a 180') ---");
const testDurations = [30, 45, 60, 75, 90, 105, 120, 150, 180];
testDurations.forEach(dur => {
  const alloc = allocateSessionTime(dur);
  const sum = Object.values(alloc.durations).reduce((a, b) => a + b, 0);
  assert(alloc.success === true && sum === dur, `Asignación de tiempo exacta para ${dur} min (Suma: ${sum}')`);
});

// Rechazo explícito de límites fuera de rango
assert(allocateSessionTime(25).success === false, "Rechaza duración < 30 min");
assert(allocateSessionTime(200).success === false, "Rechaza duración > 180 min");
assert(allocateSessionTime(NaN).success === false, "Rechaza duración NaN");

console.log("\n--- 3. Auditoría de Scoring y Breakdown Matemático ---");
const mockExercise = {
  id: "ex-perfect",
  nombre: "Juego de Posición 4v4+3",
  categoria_edad: ["cadete"],
  tipo: "juego_medio",
  bloque_sesion: "principal",
  drill_structure: "juego_medio",
  objetivo_tactico: ["Salida de balón"],
  criterios_exito: ["Perfilación"],
  dificultad: 3,
  min_players: 10,
  max_players: 16,
  espacio: "25x25m",
  duracion_recomendada: 20,
  carga_fisica: 3
};

const mockContext = {
  category: "cadete",
  objective: "Salida de balón",
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 14,
  intensityLoad: 4,
  availableSpace: "25x25m",
  targetBlock: "principal_1"
};

const scoreResult = scoreExercise(mockExercise, mockContext);
const sumBreakdown = Object.values(scoreResult.breakdown).reduce((a, b) => a + (b || 0), 0);
assert(scoreResult.score === sumBreakdown, "El score total coincide exactamente con la suma del desglose de factores");
assert(scoreResult.score > 0 && scoreResult.score <= 185, `Score dentro del rango válido (Obtenido: ${scoreResult.score} pts / Max: 185 pts)`);

console.log("\n--- 4. Auditoría de Determinismo Global (10 Iteraciones Consecutivas) ---");
const genContext = {
  teamId: "team-cadete-a",
  category: "cadete",
  objective: "Salida de balón",
  durationMinutes: 90,
  microcycleDay: "MD-3",
  numPlayers: 14,
  allExercises: [mockExercise]
};

const baseRun = JSON.stringify(generateMethodologySessionProposal(genContext));
let isDeterministic = true;
for (let i = 0; i < 10; i++) {
  const currentRun = JSON.stringify(generateMethodologySessionProposal(genContext));
  if (currentRun !== baseRun) {
    isDeterministic = false;
    break;
  }
}
assert(isDeterministic === true, "Generación de sesión: Determinismo estricto verificado en 10 ejecuciones consecutivas");

console.log("\n--- 5. Auditoría de Resiliencia ante Datos Vacíos e Incompletos ---");
// Caso: Sin sesiones, sin evaluaciones, sin objetivos
const emptySeasonReport = buildSeasonMethodologyReportFromData({
  team: { id: "t-empty", name: "Equipo Vacío" },
  season: { id: "s-empty", name: "2026/2027" },
  sessions: [],
  curriculumPrinciples: [],
  teamObjectives: []
});

assert(!isNaN(emptySeasonReport.summary.avgObjectiveAchievement), "Consecución media no es NaN en datos vacíos");
assert(!isNaN(emptySeasonReport.summary.avgRpe), "RPE medio no es NaN en datos vacíos");
assert(!isNaN(emptySeasonReport.summary.modelCoveragePercentage), "Cobertura de modelo no es NaN en datos vacíos");
assert(isFinite(emptySeasonReport.summary.avgAttendanceRate), "Asistencia no es Infinite en datos vacíos");

// Caso: Comportamientos con N = 1, N = 2 y N = 3
const mixedEvalSessions = [
  {
    id: "s-1",
    date_time: "2026-09-01",
    session_evaluations: [{
      objective_achievement: 3,
      session_behaviour_evaluations: [
        { behaviour_description: "Comportamiento N=1", score: 3 },
        { behaviour_description: "Comportamiento N=2", score: 2 },
        { behaviour_description: "Comportamiento N=3", score: 2 }
      ]
    }]
  },
  {
    id: "s-2",
    date_time: "2026-09-03",
    session_evaluations: [{
      objective_achievement: 3,
      session_behaviour_evaluations: [
        { behaviour_description: "Comportamiento N=2", score: 3 },
        { behaviour_description: "Comportamiento N=3", score: 3 }
      ]
    }]
  },
  {
    id: "s-3",
    date_time: "2026-09-05",
    session_evaluations: [{
      objective_achievement: 3,
      session_behaviour_evaluations: [
        { behaviour_description: "Comportamiento N=3", score: 4 }
      ]
    }]
  }
];

const mixedReport = buildSeasonMethodologyReportFromData({
  team: { id: "t-1", name: "Equipo" },
  season: { id: "s-1", name: "2026/2027" },
  sessions: mixedEvalSessions,
  curriculumPrinciples: [],
  teamObjectives: []
});

const bN1 = mixedReport.behaviourEvolution.find(b => b.behaviourDescription === "Comportamiento N=1");
const bN2 = mixedReport.behaviourEvolution.find(b => b.behaviourDescription === "Comportamiento N=2");
const bN3 = mixedReport.behaviourEvolution.find(b => b.behaviourDescription === "Comportamiento N=3");

assert(bN1.trend === 'insufficient_data' && bN1.percentageVariation === null, "N=1 clasificado como insufficient_data");
assert(bN2.trend === 'insufficient_data' && bN2.percentageVariation === null, "N=2 clasificado como insufficient_data");
assert(bN3.trend === 'improving' && bN3.percentageVariation !== null, "N=3 calcula tendencia 'improving' y variación %");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS DE AUDITORÍA INTEGRAL: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
