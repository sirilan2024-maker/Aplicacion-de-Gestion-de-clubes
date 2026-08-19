/**
 * Motor Determinista de Observabilidad Metodológica, Auditoría Histórica y Reconstrucción del Ciclo v1.0 (TS)
 * Antigravity Methodology OS - Fase 6.9
 */

export type MethodologicalEventType =
  | "CICLO_CREADO"
  | "CICLO_INICIADO"
  | "PLANIFICACION_REGISTRADA"
  | "SESION_REGISTRADA"
  | "EVALUACION_REGISTRADA"
  | "PROPUESTA_GENERADA"
  | "DECISION_APROBADA"
  | "DECISION_RECHAZADA"
  | "DECISION_DEVUELTA"
  | "SIMULACION_EJECUTADA"
  | "RESULTADO_REGISTRADO"
  | "APRENDIZAJE_REGISTRADO"
  | "CICLO_CERRADO";

export interface MethodologicalEvent {
  event_id: string;
  event_type: MethodologicalEventType;
  actor: {
    id: string;
    role: string;
  };
  entity: {
    id: string;
    type: string;
  };
  club_id: string;
  details: any;
  timestamp: string;
}

export interface ReconstructedCycleStateResult {
  cycle_id: string;
  club_id: string;
  state_at_target: string;
  target_timestamp: string;
  metrics: {
    plannedSessions: number;
    evaluatedSessions: number;
    decisionsCount: number;
    learningsCount: number;
  };
  events_replayed: number;
  reconstructed_at: string;
}

export function createMethodologicalEvent(params: {
  eventType: MethodologicalEventType;
  actorId: string;
  actorRole?: string;
  entityId?: string;
  entityType?: string;
  clubId: string;
  details?: any;
  timestamp?: string;
}): MethodologicalEvent {
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

export function reconstructCycleState(params: {
  events?: MethodologicalEvent[];
  targetTimestamp?: string;
  cycleId: string;
  clubId: string;
}): ReconstructedCycleStateResult {
  const { events = [], targetTimestamp, cycleId, clubId } = params;

  if (!cycleId || !clubId) {
    throw new Error("cycleId y clubId son obligatorios para reconstruir el estado del ciclo.");
  }

  const validEvents = events
    .filter((e) => e.club_id === clubId && (!targetTimestamp || new Date(e.timestamp) <= new Date(targetTimestamp)))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let state = "NO_INICIADO";
  let plannedSessions = 0;
  let evaluatedSessions = 0;
  let decisions: any[] = [];
  let learnings: any[] = [];

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
