/**
 * TESTS DE OBSERVABILIDAD METODOLÓGICA Y RECONSTRUCCIÓN HISTÓRICA (FASE 6.9)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 6.9 — SUITE DE OBSERVABILIDAD METODOLÓGICA Y RECONSTRUCCIÓN DEL CICLO");
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

const {
  createMethodologicalEvent,
  reconstructCycleState
} = require("./src/lib/methodology/methodologyObservabilityEngine");

function runObservabilityTests() {
  console.log("--- 1. Registro Inmutable de Eventos Metodológicos ---");
  const evt = createMethodologicalEvent({
    eventType: "PLANIFICACION_REGISTRADA",
    actorId: "director-1",
    actorRole: "ADMIN",
    entityId: "ciclo-1",
    entityType: "MACROCICLO",
    clubId: "club-123",
    details: { sessionsCount: 20 },
    timestamp: "2026-08-01T10:00:00.000Z"
  });

  assert(evt.event_type === "PLANIFICACION_REGISTRADA", "Evento: Tipo registrado");
  assert(evt.actor.id === "director-1", "Evento: Actor identificado");

  console.log("\n--- 2. Reconstrucción Histórica del Ciclo (Sin Hindsight) ---");
  const eventsSequence = [
    {
      event_id: "e1",
      event_type: "CICLO_CREADO",
      actor: { id: "a1" },
      entity: { id: "c1" },
      club_id: "club-123",
      timestamp: "2026-08-01T10:00:00.000Z",
      details: {}
    },
    {
      event_id: "e2",
      event_type: "PLANIFICACION_REGISTRADA",
      actor: { id: "a1" },
      entity: { id: "c1" },
      club_id: "club-123",
      timestamp: "2026-08-05T10:00:00.000Z",
      details: { sessionsCount: 15 }
    },
    {
      event_id: "e3",
      event_type: "EVALUACION_REGISTRADA",
      actor: { id: "a2" },
      entity: { id: "c1" },
      club_id: "club-123",
      timestamp: "2026-08-10T10:00:00.000Z",
      details: {}
    }
  ];

  // Reconstrucción al 2026-08-06 (Debe ignorar e3 ocurrida el 10 de agosto)
  const statePast = reconstructCycleState({
    events: eventsSequence,
    targetTimestamp: "2026-08-06T00:00:00.000Z",
    cycleId: "c1",
    clubId: "club-123"
  });

  assert(statePast.events_replayed === 2, "Reconstrucción histórica: Excluye eventos futuros");
  assert(statePast.state_at_target === "PLANIFICADO", "Reconstrucción histórica: Estado correcto en fecha objetivo");
  assert(statePast.metrics.evaluatedSessions === 0, "Reconstrucción histórica: 0 evaluaciones en fecha objetivo");

  // Reconstrucción completa
  const stateFull = reconstructCycleState({
    events: eventsSequence,
    cycleId: "c1",
    clubId: "club-123"
  });

  assert(stateFull.events_replayed === 3, "Reconstrucción completa: 3 eventos reensamblados");
  assert(stateFull.metrics.evaluatedSessions === 1, "Reconstrucción completa: 1 evaluación contabilizada");

  console.log("\n--- 3. Determinismo Estricto ---");
  const stateRun2 = reconstructCycleState({
    events: eventsSequence,
    targetTimestamp: "2026-08-06T00:00:00.000Z",
    cycleId: "c1",
    clubId: "club-123"
  });

  assert(JSON.stringify(statePast) === JSON.stringify(stateRun2), "Determinismo: Reconstrucción 100% reproducible");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 6.9 TESTS OBSERVABILIDAD: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runObservabilityTests();
