/**
 * Test Unitario del Motor de Prioridades Metodológicas Deterministas
 * Antigravity Methodology OS - Fase 4.4
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: MOTOR DE PRIORIDADES METODOLÓGICAS v1.0");
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
  calculateMethodologyPriorities, 
  METHODOLOGY_RULES 
} = require("./src/lib/methodology/methodologyPriorityEngine");

// 1. Contexto con histórico vacío
console.log("--- 1. Test de Histórico Vacío ---");
const emptyResult = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  history: [],
  curriculumPrinciples: [
    { id: "p-1", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa" },
    { id: "p-2", name: "Salida de balón", game_phase: "Ataque" }
  ]
});

assert(emptyResult.length === 2, "Genera prioridades de principios no iniciados cuando el histórico está vacío");
assert(emptyResult.every(p => p.type === 'principle_gap'), "Todas las prioridades generadas son de tipo 'principle_gap'");

// 2. Principio sin trabajar en >= 21 días (stale_principle)
console.log("\n--- 2. Test de Principio Obsoleto / Sin Trabajar (>= 21 días) ---");
const staleSessionDate = new Date("2026-07-20T18:00:00").toISOString(); // Hace 31 días respecto al 20 de Agosto
const staleResult = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  history: [
    {
      id: "s-old",
      date_time: staleSessionDate,
      objective: "Salida de balón",
      session_evaluations: [{ objective_achievement: 3 }]
    }
  ],
  curriculumPrinciples: [
    { id: "p-2", name: "Salida de balón", game_phase: "Ataque" }
  ]
});

const stalePriority = staleResult.find(p => p.type === 'stale_principle');
assert(Boolean(stalePriority), "Detecta principio sin trabajar en >= 21 días (stale_principle)");
assert(stalePriority.priority === 'high', "Principio obsoleto catalogado con prioridad 'high'");
assert(stalePriority.evidence.daysSinceLastWork >= 21, "Evidencia cuantifica días desde el último trabajo");

// 3. Principio trabajado recientemente (< 21 días con buena consecución)
console.log("\n--- 3. Test de Principio Reciente con Buena Consecución ---");
const recentSessionDate = new Date("2026-08-18T18:00:00").toISOString(); // Hace 2 días
const recentResult = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  history: [
    {
      id: "s-recent",
      date_time: recentSessionDate,
      objective: "Salida de balón",
      session_evaluations: [{ objective_achievement: 4 }]
    }
  ],
  curriculumPrinciples: [
    { id: "p-2", name: "Salida de balón", game_phase: "Ataque" }
  ]
});

const falseStale = recentResult.find(p => p.type === 'stale_principle');
assert(!falseStale, "NO genera alerta de stale_principle si se trabajó hace menos de 21 días");

// 4. Principio con Baja Consecución (low_achievement <= 2.2)
console.log("\n--- 4. Test de Principio con Baja Consecución (low_achievement) ---");
const lowAchResult = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  history: [
    {
      id: "s-1",
      date_time: "2026-08-10T18:00:00",
      objective: "Repliegue defensivo",
      session_evaluations: [{ objective_achievement: 2 }]
    },
    {
      id: "s-2",
      date_time: "2026-08-15T18:00:00",
      objective: "Repliegue defensivo",
      session_evaluations: [{ objective_achievement: 2 }]
    }
  ]
});

const lowAchPriority = lowAchResult.find(p => p.type === 'low_achievement');
assert(Boolean(lowAchPriority), "Detecta principio con baja consecución (media <= 2.2)");
assert(lowAchPriority.priority === 'high', "Baja consecución catalogada como prioridad 'high'");

// 5. Comportamiento Observable con Muestra Insuficiente (N < 3) vs N >= 3
console.log("\n--- 5. Test de Comportamiento (Regla N >= 3) ---");
const behaviourSummaryLowN = {
  behaviourEvolution: [
    {
      behaviourDescription: "Acoso en 3 segundos",
      sampleSize: 2, // Muestra insuficiente
      avgScore: 1.8,
      trend: 'insufficient_data'
    }
  ]
};

const resultLowN = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  summary: behaviourSummaryLowN
});

const behavLowNPriority = resultLowN.find(p => p.type === 'behaviour_gap');
assert(!behavLowNPriority, "Regla N < 3: NO genera 'behaviour_gap' si la muestra es insuficiente");

const behaviourSummaryValidN = {
  behaviourEvolution: [
    {
      behaviourDescription: "Acoso en 3 segundos",
      sampleSize: 4, // Muestra válida
      avgScore: 2.0,
      firstScore: 3,
      lastScore: 1,
      trend: 'declining'
    }
  ]
};

const resultValidN = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  summary: behaviourSummaryValidN
});

const behavValidNPriority = resultValidN.find(p => p.type === 'behaviour_gap');
assert(Boolean(behavValidNPriority), "Regla N >= 3: Detecta behaviour_gap en declive");
assert(behavValidNPriority.evidence.sampleSize === 4, "Registra muestra de 4 observaciones");

// 6. Alerta de Carga y Fatiga en MD-1
console.log("\n--- 6. Test de Carga y Fatiga en MD-1 ---");
const loadSummaryHighFatigue = {
  loadEvolution: [
    { actualRpe: 9, isHighFatigueWarning: true }
  ]
};

const loadResultMD1 = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  microcycleDay: "MD-1",
  summary: loadSummaryHighFatigue
});

const fatiguePriority = loadResultMD1.find(p => p.type === 'load_warning');
assert(Boolean(fatiguePriority), "Genera alerta de carga y fatiga en víspera de partido (MD-1)");
assert(fatiguePriority.priority === 'high', "Alerta de fatiga en MD-1 tiene prioridad 'high'");

// 7. Ordenamiento Determinista
console.log("\n--- 7. Test de Ordenamiento Determinista ---");
const allPriorities = [
  ...emptyResult,
  ...staleResult,
  ...resultValidN
];
const sortedPriorities = calculateMethodologyPriorities({
  teamId: "team-cadete-a",
  date: "2026-08-20T18:00:00",
  microcycleDay: "MD-3",
  history: [
    { id: "s-old", date_time: staleSessionDate, objective: "Salida de balón", session_evaluations: [{ objective_achievement: 3 }] }
  ],
  summary: behaviourSummaryValidN,
  curriculumPrinciples: [
    { id: "p-1", name: "Presión tras pérdida", game_phase: "Transición" }
  ]
});

assert(sortedPriorities[0].priority === 'high', "La primera prioridad siempre es de nivel 'high'");
assert(sortedPriorities.every(p => Boolean(p.explanation)), "Todas las prioridades contienen una explicación explicable");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS MOTOR PRIORIDADES: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
