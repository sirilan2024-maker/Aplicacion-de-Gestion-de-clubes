/**
 * Tests Unitarios: Planificador Metodológico de Microciclos v1.0
 * Antigravity Methodology OS - Fase 4.7
 */

console.log("================================================================================");
console.log("TESTS UNITARIOS: PLANIFICADOR METODOLÓGICO DE MICROCICLOS v1.0");
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
  calculateMdCode,
  generateMicrocycleProposal,
  regenerateMicrocycleDay,
  validateMicrocycleProposal,
  convertMicrocycleDayToSessionContext
} = require("./src/lib/methodology/methodologyMicrocyclePlanner");

const mockPrinciples = [
  { id: "p-1", name: "Salida de balón", game_phase: "Ataque" },
  { id: "p-2", name: "Presión tras pérdida", game_phase: "Transición" },
  { id: "p-3", name: "Repliegue intensivo", game_phase: "Defensa" },
  { id: "p-4", name: "Acciones a Balón Parado", game_phase: "Balón Parado" }
];

const mockPriorities = [
  {
    priorityLevel: "high",
    priority: "high",
    type: "behaviour_gap",
    title: "Reacción tras pérdida en declive",
    suggestedPrinciple: "Presión tras pérdida",
    evidence: "Descenso de 3.5 a 2.0"
  },
  {
    priorityLevel: "medium",
    priority: "medium",
    type: "stale_principle",
    title: "Salida de balón sin trabajar",
    suggestedPrinciple: "Salida de balón",
    evidence: "22 días sin trabajar"
  }
];

console.log("--- 1. Test de Cálculo de Códigos MD ---");
assert(calculateMdCode("2026-09-06", "2026-09-06") === 'MD', "Día de partido devuelve 'MD'");
assert(calculateMdCode("2026-09-05", "2026-09-06") === 'MD-1', "Día previo devuelve 'MD-1'");
assert(calculateMdCode("2026-09-04", "2026-09-06") === 'MD-2', "2 días antes devuelve 'MD-2'");
assert(calculateMdCode("2026-09-03", "2026-09-06") === 'MD-3', "3 días antes devuelve 'MD-3'");
assert(calculateMdCode("2026-09-07", "2026-09-06") === 'MD+1', "Día posterior devuelve 'MD+1'");

console.log("\n--- 2. Test de Generación de Propuesta de Microciclo (3 Sesiones + Partido) ---");
const contextStandard = {
  teamId: "team-cadete-a",
  category: "cadete",
  weekStartDate: "2026-08-31", // Lunes
  matchDayDate: "2026-09-06",  // Domingo
  matchOpponent: "CF Gandia",
  trainingDays: [2, 4, 5],      // Martes, Jueves, Viernes
  priorities: mockPriorities,
  curriculumPrinciples: mockPrinciples,
  teamObjectives: [{ id: "o-1", description: "Presión coordinada", type: "táctico" }],
  recentSessions: []
};

const proposalStandard = generateMicrocycleProposal(contextStandard);

assert(proposalStandard.days.length === 7, "El microciclo contiene exactamente 7 días");
assert(proposalStandard.days[6].isMatchDay === true, "Domingo es día de partido oficial");
assert(proposalStandard.days[6].microcycleDay === 'MD', "Domingo tiene código MD");

const trainingDays = proposalStandard.days.filter(d => d.isTrainingDay);
assert(trainingDays.length === 3, "Se programan exactamente 3 días de entrenamiento");

// Comprobación de asignación de prioridades a días clave
const tuesdayDay = proposalStandard.days[1]; // Martes (MD-5 / Tensión)
assert(tuesdayDay.isTrainingDay === true, "Martes es día de entrenamiento activo");
assert(tuesdayDay.targetLoad === 'Alta', "Martes asignado con carga 'Alta'");
assert(tuesdayDay.objective === "Presión tras pérdida", "Martes asignado a la prioridad metodológica de alto impacto");

const fridayDay = proposalStandard.days[4]; // Viernes (MD-2 / Espacios amplios)
assert(fridayDay.targetLoad === 'Media-Alta', "Viernes asignado con carga 'Media-Alta'");

console.log("\n--- 3. Test de Frecuencias de Entrenamiento Alternativas (1, 2, 5 Sesiones) ---");
const prop1Session = generateMicrocycleProposal({ ...contextStandard, trainingDays: [3] }); // Solo Miércoles
assert(prop1Session.days.filter(d => d.isTrainingDay).length === 1, "Microciclo con 1 sesión generado correctamente");

const prop5Sessions = generateMicrocycleProposal({ ...contextStandard, trainingDays: [1, 2, 3, 4, 5] }); // Lun a Vie
assert(prop5Sessions.days.filter(d => d.isTrainingDay).length === 5, "Microciclo con 5 sesiones generado correctamente");

console.log("\n--- 4. Test de Modulación Preventiva por RPE Histórico Elevado ---");
const highRpeSessions = [
  { session_evaluations: [{ session_rpe: 8.5 }] },
  { session_evaluations: [{ session_rpe: 8.0 }] }
];
const propHighRpe = generateMicrocycleProposal({ ...contextStandard, recentSessions: highRpeSessions });
assert(propHighRpe.microcycleReasons.some(r => r.includes("Modulación preventiva") || r.includes("RPE")), "Alerta explicable de modulación por RPE alto en histórico");

console.log("\n--- 5. Test de Regeneración Parcial de un Único Día ---");
const regeneratedProp = regenerateMicrocycleDay(proposalStandard, 2, contextStandard); // Regenerar Martes (Día 2)

assert(regeneratedProp.days[0].objective === proposalStandard.days[0].objective, "Lunes permanece idéntico");
assert(regeneratedProp.days[2].objective === proposalStandard.days[2].objective, "Miércoles permanece idéntico");
assert(regeneratedProp.days[3].objective === proposalStandard.days[3].objective, "Jueves permanece idéntico");
assert(regeneratedProp.days[4].objective === proposalStandard.days[4].objective, "Viernes permanece idéntico");
assert(regeneratedProp.days[5].objective === proposalStandard.days[5].objective, "Sábado permanece idéntico");
assert(regeneratedProp.days[6].objective === proposalStandard.days[6].objective, "Domingo permanece idéntico");

console.log("\n--- 6. Test de Validación del Microciclo (Errors vs Warnings) ---");
const validationOk = validateMicrocycleProposal(proposalStandard);
assert(validationOk.valid === true, "Microciclo estándar tiene valid=true");
assert(validationOk.errors.length === 0, "Microciclo estándar tiene 0 errores");

// Error bloqueante: Falta fecha de inicio
const propInvalidDate = { ...proposalStandard, weekStartDate: "" };
const valInvalid = validateMicrocycleProposal(propInvalidDate);
assert(valInvalid.valid === false, "Sin fecha de inicio genera valid=false (Error Bloqueante)");
assert(valInvalid.errors.some(e => e.includes("Falta la fecha de inicio")), "Mensaje de error explícito de fecha");

// Warning: Carga alta consecutiva
const propConsecutiveHigh = {
  ...proposalStandard,
  days: proposalStandard.days.map((d, i) => i === 0 || i === 1 ? { ...d, targetLoad: 'Alta', isTrainingDay: true } : d)
};
const valConsecutive = validateMicrocycleProposal(propConsecutiveHigh);
assert(valConsecutive.valid === true, "Carga consecutiva mantiene valid=true pero genera warning");
assert(valConsecutive.warnings.some(w => w.includes("consecutivos")), "Genera advertencia de fatiga por días consecutivos de carga alta");

console.log("\n--- 7. Test de Integración con el Generador de Sesiones ---");
const sessionContext = convertMicrocycleDayToSessionContext(
  proposalStandard.days[1],
  { id: "team-cadete-a", category: "cadete" },
  [],
  ["ex-1"]
);
assert(sessionContext.teamId === "team-cadete-a", "Mapea teamId al session context");
assert(sessionContext.objective === proposalStandard.days[1].objective, "Mapea objetivo del microciclo al session context");
assert(sessionContext.microcycleDay === proposalStandard.days[1].microcycleDay, "Mapea código MD");
assert(sessionContext.intensityLoad === 4, "Mapea carga Alta como intensidad 4");

console.log("\n--- 8. Test de Determinismo Estricto (same context produces identical proposal) ---");
const propRun1 = generateMicrocycleProposal(contextStandard);
const propRun2 = generateMicrocycleProposal(contextStandard);
assert(
  JSON.stringify(propRun1) === JSON.stringify(propRun2),
  "same context produces identical proposal (Determinismo 100% verificado)"
);

console.log("\n================================================================================");
console.log(`RESULTADO DE TESTS UNITARIOS PLANIFICADOR MICROCICLOS: ${passed} PASADOS, ${failed} FALLADOS`);
console.log("================================================================================");
