/**
 * TESTS E2E DE PLANIFICACIÓN METODOLÓGICA ASISTIDA POR IA (FASE 5.3)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.3 — TESTS E2E DE FLUJO COMPLETO DE PLANIFICACIÓN ASISTIDA");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log("OK [PASS] " + testName);
    passed++;
  } else {
    console.error("XX [FAIL] " + testName);
    failed++;
  }
}

const { buildTeamPlanningAIContext } = require("./src/lib/methodology/ai/methodologyAIPlanningContextBuilder");
const { buildAIPlanningProposal, updateAIPlanningDay } = require("./src/lib/methodology/ai/methodologyAIPlanningService");
const { generateMethodologySessionProposal, validateMethodologySessionProposal } = require("./src/lib/methodology/methodologySessionGenerator");
const { convertMicrocycleDayToSessionContext } = require("./src/lib/methodology/methodologyMicrocyclePlanner");

async function runE2ETests() {
  console.log("--- Flujo E2E: Contexto -> Propuesta IA -> Edición -> Constructor Sesiones -> Guardado Humano ---");

  const mockClub = { id: "club-real-1", name: "Sporting Saladar" };
  const mockTeam = { id: "team-infantil-a", name: "Infantil A", category: "infantil" };
  const mockSeason = { id: "season-2026-27", name: "2026-27" };
  const mockPrinciples = [
    { id: "p1", name: "Salida de balón", game_phase: "Ataque" },
    { id: "p2", name: "Presión tras pérdida", game_phase: "Transición Ataque-Defensa" }
  ];
  const mockExercises = [
    { id: "e1", nombre: "Activación Rondo 4v2", tipo: "rondo", bloque_sesion: "activacion", dificultad: 2, duracion_recomendada: 15, tags: ["posesion"] },
    { id: "e2", nombre: "Juego de Posición 6v4", tipo: "juego_medio", bloque_sesion: "principal", dificultad: 3, duracion_recomendada: 20, tags: ["salida"] },
    { id: "e3", nombre: "Circuito Técnico de Pase", tipo: "analitico", bloque_sesion: "principal", dificultad: 2, duracion_recomendada: 25, tags: ["pase"] },
    { id: "e4", nombre: "Partido Condicionado 8v8", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] },
    { id: "e5", nombre: "Vuelta a la Calma y Estiramientos", tipo: "calentamiento", bloque_sesion: "vuelta_calma", dificultad: 1, duracion_recomendada: 10, tags: ["regenerativo"] },
    { id: "e6", nombre: "Juego Global 7v7 Amplitud", tipo: "juego_global", bloque_sesion: "global", dificultad: 3, duracion_recomendada: 20, tags: ["global"] }
  ];

  // 1. Construir Contexto Server-Side
  const context = buildTeamPlanningAIContext({
    club: mockClub,
    team: mockTeam,
    season: mockSeason,
    weekStartDate: "2026-09-01",
    matchDayDate: "2026-09-07",
    matchOpponent: "Levante UD",
    trainingDays: [2, 4, 5],
    report: { summary: { evaluatedSessions: 4, avgObjectiveAchievement: 2.8, modelCoveragePercentage: 70 } },
    priorities: [{ id: "prio-1", title: "Salida limpia", suggestedDay: "MD-3" }]
  });

  assert(context.scope === "planning", "E2E Paso 1: Contexto de planificación construido server-side");

  // 2. IA genera la propuesta de planificación de microciclo
  const planningProposal = buildAIPlanningProposal(context, mockPrinciples, mockExercises);
  assert(planningProposal.proposedMicrocycle.days.length === 7, "E2E Paso 2: Propuesta IA de microciclo de 7 días");
  assert(planningProposal.requiresHumanConfirmation === true, "E2E Paso 2: Propuesta exige confirmación humana obligatoria");

  // 3. Edición Humana en UI (Entrenador ajusta duración de MD-3 a 80 min)
  const md3DayBefore = planningProposal.proposedMicrocycle.days.find(d => d.microcycleDay === "MD-3");
  const editRes = updateAIPlanningDay(planningProposal, md3DayBefore.dayOfWeek, {
    plannedDurationMin: 80,
    objective: "Salida de balón y superación de primera línea"
  }, mockPrinciples);

  assert(editRes.valid === true, "E2E Paso 3: Entrenador edita y el motor revalida positivamente");
  const editedDay = editRes.proposal.proposedMicrocycle.days.find(d => d.dayOfWeek === md3DayBefore.dayOfWeek);
  assert(editedDay.plannedDurationMin === 80, "E2E Paso 3: Duración editada a 80 min confirmada");

  // 4. Transferencia de la jornada editada al Constructor de Sesiones Asistido
  const sessionCtx = convertMicrocycleDayToSessionContext(
    {
      objective: editedDay.objective,
      secondaryObjectives: ["Pase orientado", "Amplitud"],
      plannedDurationMin: editedDay.plannedDurationMin,
      microcycleDay: editedDay.microcycleDay,
      targetLoad: editedDay.targetLoad,
      priorityContext: editedDay.priorityContext
    },
    mockTeam,
    mockExercises
  );

  const builtSession = generateMethodologySessionProposal(sessionCtx);
  assert(builtSession.totalDurationMin === 80, "E2E Paso 4: Sesión generada en constructor respeta los 80 min editados");
  assert(builtSession.objective === editedDay.objective, "E2E Paso 4: Sesión adopta el objetivo curricular del microciclo");

  // 5. Validación Global Final antes de Persistencia Humana
  const finalValidation = validateMethodologySessionProposal(builtSession);
  assert(finalValidation.valid === true, "E2E Paso 5: Sesión validada por el motor determinista lista para Confirmar y Guardar");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.3 TESTS E2E: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2ETests();
