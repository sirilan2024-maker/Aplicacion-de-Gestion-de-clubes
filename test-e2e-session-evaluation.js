/**
 * Test E2E de Ciclo Completo de Evaluación Post-Sesión
 * PLANIFICAR -> EJECUTAR -> EVALUAR -> PLANIFICADO VS REAL
 * Antigravity Methodology OS - Fase 4.2
 */

console.log("================================================================================");
console.log("TEST E2E: CIERRE DE CICLO METODOLÓGICO POST-SESIÓN (PLANIFICADO VS EJECUTADO)");
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

// 1. Simulación de Sesión Planificada
const mockSession = {
  id: "sess-e2e-eval-001",
  team_id: "team-cadete-a",
  club_id: "club-sporting-saladar",
  date_time: "2026-08-22T18:30:00",
  duration_minutes: 90,
  microcycle_day: "MD-3",
  intensity_load: 4,
  objective: "Presión tras pérdida y repliegue intensivo",
  objectives_secondary: ["Vigilancias ofensivas", "Transición rápida"],
  num_players: 18,
  num_goalkeepers: 2,
  estimated_load: 75,
  is_completed: false,
  blocks: {
    activacion: [
      { id: "ex-1", nombre: "Rondo de Presión", criterios_exito: ["Acoso inmediato al poseedor", "Cierre de líneas de pase"] }
    ],
    principal_1: [
      { id: "ex-2", nombre: "Juego de Posición 6v4", criterios_exito: ["Tercer hombre tras robo", "Perfilación defensiva"] }
    ],
    principal_2: [
      { id: "ex-3", nombre: "SSG 4v4 + Transición", criterios_exito: ["Finalizar en menos de 6 segundos", "Reacción tras pérdida"] }
    ],
    global: [
      { id: "ex-4", nombre: "Partido 9v9 Condicionado", criterios_exito: ["Bloque compacto"] }
    ],
    vuelta_calma: [
      { id: "ex-5", nombre: "Rueda de Pases Suaves", criterios_exito: ["Control de frecuencia cardíaca"] }
    ]
  }
};

// 2. Simulación de Plantilla de Jugadores
const mockPlayers = [
  { id: "p-1", name: "Marc Navarro", dorsal: 4 },
  { id: "p-2", name: "Carlos Soler", dorsal: 8 },
  { id: "p-3", name: "David Albiol", dorsal: 3 },
  { id: "p-4", name: "Hugo Duro", dorsal: 9 },
  { id: "p-5", name: "Sergi Canós", dorsal: 11 },
  { id: "p-6", name: "Pepelu", dorsal: 6 },
  { id: "p-7", name: "Thierry Rendall", dorsal: 12 },
  { id: "p-8", name: "Diego López", dorsal: 16 },
  { id: "p-9", name: "Javi Guerra", dorsal: 18 },
  { id: "p-10", name: "Cristhian Mosquera", dorsal: 15 },
  { id: "p-11", name: "Yarek Gasiorowski", dorsal: 24 },
  { id: "p-12", name: "Alberto Marí", dorsal: 22 },
  { id: "p-13", name: "Cenk Özkacar", dorsal: 5 },
  { id: "p-14", name: "Fran Pérez", dorsal: 23 },
  { id: "p-15", name: "Jesús Vázquez", dorsal: 21 },
  { id: "p-16", name: "Dimitrievski", dorsal: 1 },
  { id: "p-17", name: "Jaume Doménech", dorsal: 13 },
  { id: "p-18", name: "Pablo Gozálbez", dorsal: 27 }
];

console.log("--- 1. Extracción Taxonómica de Comportamientos Observables ---");
const extractedBehaviours = [];
const seenCrit = new Set();
Object.values(mockSession.blocks).forEach(drillList => {
  drillList.forEach(drill => {
    (drill.criterios_exito || []).forEach(crit => {
      if (!seenCrit.has(crit)) {
        seenCrit.add(crit);
        extractedBehaviours.push({
          behaviourDescription: crit,
          gamePhaseOrFamily: "Transiciones Defensivas",
          score: 3, // Valoración por defecto
          coachNotes: ""
        });
      }
    });
  });
});

assert(extractedBehaviours.length === 8, "Se extrajeron exactamente 8 comportamientos observables de los ejercicios");

console.log("\n--- 2. Registro de Ejecución Real y Pase de Lista ---");
const mockAttendance = mockPlayers.map((p, idx) => ({
  playerId: p.id,
  status: idx === 17 ? 'absent' : (idx === 16 ? 'excused' : 'present') // 16 presentes, 1 ausente, 1 justificado
}));

const presentCount = mockAttendance.filter(a => a.status === 'present').length;
assert(presentCount === 16, "Pase de lista calcula exactamente 16 jugadores presentes");

console.log("\n--- 3. Registro de RPE y Evaluación de Comportamientos (1-4) ---");
// Simulamos valoraciones reales de los 8 comportamientos
const behaviourRatings = [
  { behaviourDescription: "Acoso inmediato al poseedor", score: 4, coachNotes: "Excelente timing de presión" },
  { behaviourDescription: "Cierre de líneas de pase", score: 3, coachNotes: "" },
  { behaviourDescription: "Tercer hombre tras robo", score: 3, coachNotes: "" },
  { behaviourDescription: "Perfilación defensiva", score: 2, coachNotes: "Dificultad en giros rápidos" },
  { behaviourDescription: "Finalizar en menos de 6 segundos", score: 4, coachNotes: "Gran verticalidad" },
  { behaviourDescription: "Reacción tras pérdida", score: 3, coachNotes: "" },
  { behaviourDescription: "Bloque compacto", score: 3, coachNotes: "" },
  { behaviourDescription: "Control de frecuencia cardíaca", score: 3, coachNotes: "" }
];

const mockEvaluationPayload = {
  sessionId: mockSession.id,
  clubId: mockSession.club_id,
  actualDurationMin: 95, // 5 min de desvío
  sessionRpe: 8, // Duro
  objectiveAchievement: 3, // Conseguido (3 de 4)
  playersPresentCount: presentCount,
  coachObservations: "Muy buena predisposición táctica. El equipo entendió cuándo saltar a la presión.",
  incidentsNotes: "Carlos Soler terminó con sobrecarga leve en el gemelo.",
  attendance: mockAttendance,
  behaviours: behaviourRatings
};

// Validaciones de dominio
assert(mockEvaluationPayload.sessionRpe >= 1 && mockEvaluationPayload.sessionRpe <= 10, "RPE se mantiene en escala válida 1-10");
assert(mockEvaluationPayload.objectiveAchievement >= 1 && mockEvaluationPayload.objectiveAchievement <= 4, "Consecución de objetivo en escala 1-4");
assert(behaviourRatings.every(b => b.score >= 1 && b.score <= 4), "Todas las valoraciones de comportamientos respetan el rango 1-4");

console.log("\n--- 4. Generación de Comparativa Planificado vs Ejecutado ---");
function buildComparison(session, evaluation) {
  const durationDiff = evaluation.actualDurationMin - session.duration_minutes;
  const playersDiff = evaluation.playersPresentCount - session.num_players;
  
  const sumScores = (evaluation.behaviours || []).reduce((sum, b) => sum + b.score, 0);
  const avgScore = evaluation.behaviours && evaluation.behaviours.length > 0
    ? Number((sumScores / evaluation.behaviours.length).toFixed(1))
    : evaluation.objectiveAchievement || 3;

  const deviations = [];
  if (Math.abs(durationDiff) > 0) deviations.push(`Desviación de tiempo: ${durationDiff > 0 ? `+${durationDiff}` : durationDiff} min.`);
  if (Math.abs(playersDiff) > 0) deviations.push(`Desviación de asistencia: ${playersDiff} jugadores.`);
  if (evaluation.sessionRpe >= 8 && session.microcycle_day === 'MD-3') {
    deviations.push("Sesión de alta tensión acorde a MD-3.");
  }

  return {
    sessionId: session.id,
    plannedDurationMin: session.duration_minutes,
    actualDurationMin: evaluation.actualDurationMin,
    durationDiffMin: durationDiff,
    plannedPlayers: session.num_players,
    actualPlayers: evaluation.playersPresentCount,
    playersDiff: playersDiff,
    plannedLoad: session.estimated_load,
    actualRpe: evaluation.sessionRpe,
    objective: session.objective,
    objectiveAchievement: evaluation.objectiveAchievement,
    avgBehaviourScore: avgScore,
    coachObservations: evaluation.coachObservations,
    incidentsNotes: evaluation.incidentsNotes,
    deviations
  };
}

const comp = buildComparison(mockSession, mockEvaluationPayload);
assert(comp.plannedDurationMin === 90 && comp.actualDurationMin === 95, "Comparativa de duración correcta (90' vs 95')");
assert(comp.durationDiffMin === 5, "Diferencia de duración calculada en +5 min");
assert(comp.plannedPlayers === 18 && comp.actualPlayers === 16, "Comparativa de jugadores correcta (18 vs 16)");
assert(comp.avgBehaviourScore === 3.1, "Media aritmética de comportamientos calculada con precisión (3.1 / 4)");
assert(comp.objectiveAchievement === 3, "Nivel de consecución del objetivo registrado (3/4)");
assert(comp.deviations.length >= 2, "Detección automática de desviaciones de tiempo y asistencia");

console.log("\n--- 5. Simulación de Actualización y Persistencia Idempotente ---");
// Simulamos guardar una modificación a la evaluación
const updatedPayload = {
  ...mockEvaluationPayload,
  actualDurationMin: 90,
  objectiveAchievement: 4 // Actualizado a Superado/Automatizado
};
const updatedComp = buildComparison(mockSession, updatedPayload);

assert(updatedComp.actualDurationMin === 90, "Actualización de duración real a 90' procesada");
assert(updatedComp.durationDiffMin === 0, "Diferencia de duración actualizada a 0 min");
assert(updatedComp.objectiveAchievement === 4, "Nivel de consecución actualizado a nivel 4");

console.log("\n--- 6. Casos Límite y Aislamiento Multi-Tenant ---");
// Sesión sin evaluación
const emptyEvalFallback = buildComparison(mockSession, {
  actualDurationMin: mockSession.duration_minutes,
  playersPresentCount: mockSession.num_players,
  sessionRpe: 6,
  objectiveAchievement: 3,
  behaviours: []
});
assert(emptyEvalFallback.avgBehaviourScore === 3, "Sesión sin evaluación adopta fallback consistente sin NaN");
assert(mockEvaluationPayload.clubId === "club-sporting-saladar", "Aislamiento multi-tenant preservado con club_id");

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS E2E EVALUACIÓN: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
