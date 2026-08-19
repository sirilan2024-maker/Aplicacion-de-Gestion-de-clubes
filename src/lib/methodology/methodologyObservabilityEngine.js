/**
 * Motor Determinista de Observabilidad Metodológica, Auditoría Histórica y Reconstrucción del Ciclo v1.0
 * Antigravity Methodology OS - Fase 6.9
 *
 * Inmutabilidad Histórica + Trazabilidad Bidireccional + Reconstrucción sin Hindsight
 */

function createMethodologicalEvent(params) {
  const {
    eventType,
    actorId,
    actorRole,
    entityId,
    entityType,
    clubId,
    details = {},
    timestamp
  } = params;

  if (!eventType || !actorId || !clubId) {
    throw new Error("Parámetros obligatorios incompletos para registrar evento metodológico.");
  }

  return {
    event_id: `evt-${eventType}-${Date.now()}`,
    event_type: eventType,
    actor: {
      id: actorId,
      role: actorRole || "STAFF"
    },
    entity: {
      id: entityId || "unknown",
      type: entityType || "GENERIC"
    },
    club_id: clubId,
    details,
    timestamp: timestamp || new Date().toISOString()
  };
}

function reconstructCycleState(params) {
  const { events = [], targetTimestamp, cycleId, clubId } = params;

  if (!cycleId || !clubId) {
    throw new Error("cycleId y clubId son obligatorios para reconstruir el estado del ciclo.");
  }

  // Filtrar exclusivamente eventos anteriores o iguales al targetTimestamp (Sin información futura)
  const validEvents = events
    .filter((e) => e.club_id === clubId && (!targetTimestamp || new Date(e.timestamp) <= new Date(targetTimestamp)))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let state = "NO_INICIADO";
  let plannedSessions = 0;
  let evaluatedSessions = 0;
  let decisions = [];
  let learnings = [];

  validEvents.forEach((e) => {
    switch (e.event_type) {
      case "CICLO_CREADO":
        state = "CREADO";
        break;
      case "PLANIFICACION_REGISTRADA":
        state = "PLANIFICADO";
        plannedSessions = e.details.sessionsCount || plannedSessions;
        break;
      case "SESION_REGISTRADA":
        state = "EN_EJECUCION";
        break;
      case "EVALUACION_REGISTRADA":
        evaluatedSessions++;
        break;
      case "DECISION_APROBADA":
      case "DECISION_RECHAZADA":
        decisions.push({
          decision_id: e.details.decisionId,
          decision: e.event_type === "DECISION_APROBADA" ? "APROBADA" : "RECHAZADA",
          actor: e.actor.id
        });
        break;
      case "APRENDIZAJE_REGISTRADO":
        learnings.push(e.details.learningId);
        break;
      case "CICLO_CERRADO":
        state = "CERRADO";
        break;
    }
  });

  return {
    cycle_id: cycleId,
    club_id: clubId,
    state_at_target: state,
    target_timestamp: targetTimestamp || "LATEST",
    metrics: {
      plannedSessions,
      evaluatedSessions,
      decisionsCount: decisions.length,
      learningsCount: learnings.length
    },
    events_replayed: validEvents.length,
    reconstructed_at: "DETERMINISTIC_TIMESTAMP"
  };
}

module.exports = {
  createMethodologicalEvent,
  reconstructCycleState
};
