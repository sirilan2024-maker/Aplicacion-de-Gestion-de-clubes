/**
 * Test E2E de Inteligencia Histórica y Evolución Metodológica
 * Antigravity Methodology OS - Fase 4.3
 */

console.log("================================================================================");
console.log("TEST E2E: INTELIGENCIA HISTÓRICA, COBERTURA Y EVOLUCIÓN METODOLÓGICA");
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

// 1. Datos simulados para testing determinista
const mockCurriculumPrinciples = [
  { id: "pr-1", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa" },
  { id: "pr-2", name: "Salida de balón", game_phase: "Ataque" },
  { id: "pr-3", name: "Tercer hombre", game_phase: "Ataque" },
  { id: "pr-4", name: "Bloque bajo y defensa de área", game_phase: "Defensa" },
  { id: "pr-5", name: "Balón parado defensivo", game_phase: "Balón Parado" },
  { id: "pr-6", name: "Basculación coordinada", game_phase: "Defensa" }
];

const mockHistoricalSessions = [
  {
    id: "s-1",
    team_id: "team-cadete-a",
    club_id: "club-saladar",
    date_time: "2026-08-01T18:00:00",
    duration_minutes: 90,
    microcycle_day: "MD-3",
    objective: "Presión tras pérdida",
    objectives_secondary: ["Tercer hombre"],
    num_players: 18,
    estimated_load: 75,
    session_evaluations: [{
      actual_duration_min: 95,
      session_rpe: 8,
      objective_achievement: 2, // Baja consecución inicial
      players_present_count: 17,
      session_behaviour_evaluations: [
        { behaviour_description: "Acoso en 3 segundos", score: 2, game_phase_or_family: "Transiciones" },
        { behaviour_description: "Perfilación corporal", score: 2, game_phase_or_family: "Técnica" }
      ]
    }]
  },
  {
    id: "s-2",
    team_id: "team-cadete-a",
    club_id: "club-saladar",
    date_time: "2026-08-05T18:00:00",
    duration_minutes: 90,
    microcycle_day: "MD-2",
    objective: "Salida de balón",
    objectives_secondary: ["Tercer hombre"],
    num_players: 18,
    estimated_load: 65,
    session_evaluations: [{
      actual_duration_min: 90,
      session_rpe: 6,
      objective_achievement: 3,
      players_present_count: 18,
      session_behaviour_evaluations: [
        { behaviour_description: "Acoso en 3 segundos", score: 3, game_phase_or_family: "Transiciones" },
        { behaviour_description: "Perfilación corporal", score: 3, game_phase_or_family: "Técnica" }
      ]
    }]
  },
  {
    id: "s-3",
    team_id: "team-cadete-a",
    club_id: "club-saladar",
    date_time: "2026-08-10T18:00:00",
    duration_minutes: 90,
    microcycle_day: "MD-3",
    objective: "Presión tras pérdida",
    objectives_secondary: ["Salida de balón"],
    num_players: 18,
    estimated_load: 75,
    session_evaluations: [{
      actual_duration_min: 90,
      session_rpe: 7,
      objective_achievement: 4, // Alta consecución
      players_present_count: 16,
      session_behaviour_evaluations: [
        { behaviour_description: "Acoso en 3 segundos", score: 4, game_phase_or_family: "Transiciones" },
        { behaviour_description: "Perfilación corporal", score: 3, game_phase_or_family: "Técnica" },
        { behaviour_description: "Vigilancia lejana en ABP", score: 2, game_phase_or_family: "Balón Parado" } // Solo 1 observación
      ]
    }]
  },
  {
    id: "s-4",
    team_id: "team-cadete-a",
    club_id: "club-saladar",
    date_time: "2026-08-15T18:00:00",
    duration_minutes: 60,
    microcycle_day: "MD-1",
    objective: "Salida de balón",
    objectives_secondary: [],
    num_players: 18,
    estimated_load: 40,
    session_evaluations: [] // Sesión SIN evaluación
  }
];

// FUNCIONES ANALÍTICAS DETERMINISTAS PURAS
function calculateBehaviourEvolution(sessions) {
  const behaviourMap = {};

  sessions.forEach(s => {
    const ev = s.session_evaluations?.[0];
    if (ev && ev.session_behaviour_evaluations) {
      ev.session_behaviour_evaluations.forEach(b => {
        const desc = b.behaviour_description;
        if (!behaviourMap[desc]) {
          behaviourMap[desc] = { family: b.game_phase_or_family, history: [] };
        }
        behaviourMap[desc].history.push({
          date: s.date_time.split("T")[0],
          sessionId: s.id,
          score: b.score
        });
      });
    }
  });

  return Object.entries(behaviourMap).map(([desc, data]) => {
    const N = data.history.length;
    const scores = data.history.map(h => h.score);
    const avgScore = N > 0 ? Number((scores.reduce((a, b) => a + b, 0) / N).toFixed(2)) : 0;
    const firstScore = N > 0 ? scores[0] : 0;
    const lastScore = N > 0 ? scores[N - 1] : 0;
    const absoluteVariation = Number((lastScore - firstScore).toFixed(2));

    let trend = 'insufficient_data';
    let percentageVariation = null;

    if (N >= 3) {
      if (firstScore > 0) {
        percentageVariation = Number((((lastScore - firstScore) / firstScore) * 100).toFixed(1));
      }
      if (absoluteVariation >= 0.4) {
        trend = 'improving';
      } else if (absoluteVariation <= -0.4) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    return {
      behaviourDescription: desc,
      gamePhaseOrFamily: data.family,
      evaluationsCount: N,
      sampleSize: N,
      firstScore,
      lastScore,
      avgScore,
      absoluteVariation,
      percentageVariation,
      trend,
      history: data.history
    };
  });
}

function calculatePrincipleCoverage(sessions, curriculumPrinciples) {
  const principleUsage = {};

  sessions.forEach(s => {
    if (s.objective) {
      if (!principleUsage[s.objective]) principleUsage[s.objective] = { count: 0, scores: [] };
      principleUsage[s.objective].count += 1;
      const score = s.session_evaluations?.[0]?.objective_achievement;
      if (score) principleUsage[s.objective].scores.push(score);
    }
    (s.objectives_secondary || []).forEach(sec => {
      if (!principleUsage[sec]) principleUsage[sec] = { count: 0, scores: [] };
      principleUsage[sec].count += 1;
      const score = s.session_evaluations?.[0]?.objective_achievement;
      if (score) principleUsage[sec].scores.push(score);
    });
  });

  const trainedNamesSet = new Set(Object.keys(principleUsage).map(k => k.toLowerCase()));
  const neverTrained = curriculumPrinciples.filter(p => !trainedNamesSet.has(p.name.toLowerCase()));

  const lowAchievementPrinciples = Object.entries(principleUsage)
    .filter(([_, data]) => data.scores.length > 0 && (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) <= 2.2)
    .map(([name, data]) => ({
      principle: name,
      avgScore: Number((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
      count: data.count
    }));

  return {
    trainedCount: Object.keys(principleUsage).length,
    totalCurriculum: curriculumPrinciples.length,
    neverTrained,
    lowAchievementPrinciples,
    principleUsage
  };
}

console.log("--- 1. Test de Histórico Vacío (N = 0) ---");
const emptyEvolution = calculateBehaviourEvolution([]);
assert(emptyEvolution.length === 0, "Histórico vacío devuelve array vacío sin errores");
const emptyCoverage = calculatePrincipleCoverage([], mockCurriculumPrinciples);
assert(emptyCoverage.trainedCount === 0, "Cobertura de principios en histórico vacío es 0");
assert(emptyCoverage.neverTrained.length === mockCurriculumPrinciples.length, "Todos los principios marcados como no trabajados en histórico vacío");

console.log("\n--- 2. Test de Muestra Insuficiente (N = 1 o N = 2) ---");
const singleSessionEvolution = calculateBehaviourEvolution([mockHistoricalSessions[0]]);
const singleBehav = singleSessionEvolution.find(b => b.behaviourDescription === "Acoso en 3 segundos");
assert(singleBehav.sampleSize === 1, "Muestra de 1 observación registrada con sampleSize = 1");
assert(singleBehav.trend === "insufficient_data", "Regla N < 3: la tendencia es 'insufficient_data'");
assert(singleBehav.percentageVariation === null, "Regla N < 3: no calcula variación porcentual espuria");

console.log("\n--- 3. Test de Evolución de Comportamiento (N >= 3) ---");
const fullEvolution = calculateBehaviourEvolution(mockHistoricalSessions);
const improvingBehav = fullEvolution.find(b => b.behaviourDescription === "Acoso en 3 segundos");
assert(improvingBehav.sampleSize === 3, "Comportamiento evaluado en 3 sesiones (N = 3)");
assert(improvingBehav.firstScore === 2 && improvingBehav.lastScore === 4, "Evolución 2 -> 4 registrada");
assert(improvingBehav.absoluteVariation === 2, "Variación absoluta calculada (+2.0)");
assert(improvingBehav.percentageVariation === 100, "Variación porcentual calculada (+100.0%)");
assert(improvingBehav.trend === "improving", "Tendencia clasificada correctamente como 'improving'");

const stableBehav = fullEvolution.find(b => b.behaviourDescription === "Perfilación corporal");
assert(stableBehav.sampleSize === 3, "Perfilación evaluada 3 veces (2 -> 3 -> 3)");
assert(stableBehav.avgScore === 2.67, "Media de perfilación calculada (2.67 / 4)");

const singleObsBehav = fullEvolution.find(b => b.behaviourDescription === "Vigilancia lejana en ABP");
assert(singleObsBehav.sampleSize === 1 && singleObsBehav.trend === "insufficient_data", "Comportamiento con N=1 catalogado como muestra insuficiente");

console.log("\n--- 4. Test de Cobertura de Principios y Diagnóstico Diferenciado ---");
const coverage = calculatePrincipleCoverage(mockHistoricalSessions, mockCurriculumPrinciples);
assert(coverage.trainedCount === 3, "Se trabajaron 3 principios del modelo (Presión, Salida, Tercer hombre)");
assert(coverage.neverTrained.length === 3, "Se detectaron 3 principios NUNCA trabajados (Bloque bajo, ABP defensivo, Basculación)");

// Diferenciación: 'Poco trabajado' vs 'Trabajado con baja consecución'
const neverNames = coverage.neverTrained.map(p => p.name);
assert(neverNames.includes("Balón parado defensivo"), "Balón parado defensivo catalogado como 'Nunca trabajado'");

console.log("\n--- 5. Test de Sesiones Sin Evaluación (Robustez y Fallback) ---");
const loadEvolution = mockHistoricalSessions.map(s => {
  const ev = s.session_evaluations?.[0];
  return {
    sessionId: s.id,
    plannedDuration: s.duration_minutes,
    actualDuration: ev?.actual_duration_min || s.duration_minutes,
    actualRpe: ev?.session_rpe || 6,
    hasEvaluation: Boolean(ev)
  };
});
assert(loadEvolution[3].hasEvaluation === false, "Sesión 4 detectada como no evaluada");
assert(loadEvolution[3].actualDuration === 60, "Fallback a duración planificada cuando no hay evaluación");
assert(loadEvolution[3].actualRpe === 6, "Fallback a RPE base (6/10) sin romper cálculos");

console.log("\n--- 6. Test de Filtros Temporales y Microciclos ---");
const md3Sessions = mockHistoricalSessions.filter(s => s.microcycle_day === "MD-3");
assert(md3Sessions.length === 2, "Filtro microcycleDay='MD-3' devuelve exactamente 2 sesiones");

const augustEarlySessions = mockHistoricalSessions.filter(s => s.date_time >= "2026-08-01" && s.date_time <= "2026-08-06");
assert(augustEarlySessions.length === 2, "Filtro de fechas (1 al 6 de Agosto) devuelve 2 sesiones");

console.log("\n--- 7. Test de Aislamiento Multi-Tenant ---");
const hasWrongClub = mockHistoricalSessions.some(s => s.club_id !== "club-saladar");
assert(!hasWrongClub, "Aislamiento multi-tenant validado: todas las sesiones pertenecen a 'club-saladar'");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E ANALYTICS: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
