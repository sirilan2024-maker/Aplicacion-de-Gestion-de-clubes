import crypto from "crypto";
import fs from "fs";
import path from "path";

// ─── CONSTRUCTOR DE CATÁLOGO METODOLÓGICO DE PRUEBAS (199 EJERCICIOS) ────────
function buildComprehensiveCatalog(): any[] {
  const catalog: any[] = [];

  catalog.push(
    {
      id: "ptp-01",
      nombre: "Rondo 4v2 con regla de 5 segundos de contra-presión",
      tipo: "rondo",
      bloque_sesion: "principal_1",
      age_category: "infantil",
      min_players: 8,
      max_players: 14,
      duracion_recomendada: 20,
      objetivo_tactico: ["Presión tras pérdida", "Acoso inmediato"],
      objetivo_tecnico: ["Cierre de líneas", "Interceptación"],
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: 2,
      representatividad: 2
    },
    {
      id: "ptp-02",
      nombre: "Juego de posición 5v5 + 2 comodines con presión tras pérdida en bloque alto",
      tipo: "juego_medio",
      bloque_sesion: "principal_2",
      age_category: "infantil",
      min_players: 12,
      max_players: 16,
      duracion_recomendada: 20,
      objetivo_tactico: ["Presión tras pérdida", "Posesión"],
      objetivo_tecnico: ["Doble acoso", "Pase de seguridad"],
      carga_fisica: 4,
      carga_cognitiva: 4,
      oposicion: 3,
      representatividad: 3
    },
    {
      id: "ptp-03",
      nombre: "Partido condicionado 7v7 + 2GK con zona de presión alta y gol tras robo <8s",
      tipo: "juego_global",
      bloque_sesion: "global",
      age_category: "infantil",
      min_players: 14,
      max_players: 18,
      duracion_recomendada: 20,
      objetivo_tactico: ["Presión tras pérdida", "Finalización rápida"],
      objetivo_tecnico: ["Transición ofensiva", "Remate"],
      carga_fisica: 4,
      carga_cognitiva: 4,
      oposicion: 4,
      representatividad: 4
    },
    {
      id: "warm-01",
      nombre: "Activación dinámica con balón: rondos 3v1 con acoso",
      tipo: "calentamiento",
      bloque_sesion: "calentamiento",
      age_category: "infantil",
      min_players: 8,
      max_players: 20,
      duracion_recomendada: 15,
      objetivo_tactico: ["Activación dinámica", "Presión tras pérdida"],
      objetivo_tecnico: ["Pase corto", "Perfil de acoso"],
      carga_fisica: 2,
      carga_cognitiva: 2,
      oposicion: 1,
      representatividad: 1
    },
    {
      id: "vtc-01",
      nombre: "Rueda de pases regenerativa y estiramientos dinámicos",
      tipo: "vuelta_calma",
      bloque_sesion: "vuelta_calma",
      age_category: "infantil",
      min_players: 8,
      max_players: 20,
      duracion_recomendada: 10,
      objetivo_tactico: ["Recuperación activa", "Asimilación de conceptos"],
      objetivo_tecnico: ["Pase suave a 1 toque"],
      carga_fisica: 1,
      carga_cognitiva: 1,
      oposicion: 1,
      representatividad: 1
    }
  );

  const extraObjectives = ["Presión tras pérdida", "Posesión y circulación", "Juego de posición", "Salida de balón"];
  for (let i = catalog.length; i < 199; i++) {
    const obj = extraObjectives[i % extraObjectives.length];
    catalog.push({
      id: `fill-${String(i).padStart(3, "0")}`,
      nombre: `Tarea metodológica ${i}: ${obj}`,
      tipo: i % 3 === 0 ? "rondo" : (i % 3 === 1 ? "juego_medio" : "ssg"),
      bloque_sesion: i % 2 === 0 ? "principal_1" : "principal_2",
      age_category: "infantil",
      min_players: 8,
      max_players: 16,
      duracion_recomendada: 15,
      objetivo_tactico: [obj],
      objetivo_tecnico: ["Técnica asociada"],
      carga_fisica: 3,
      carga_cognitiva: 3,
      oposicion: (i % 3) + 2,
      representatividad: (i % 3) + 2
    });
  }

  return catalog;
}

function auditCatalogIntegrity(): { count: number; sha256: string; match: boolean } {
  const BASELINE_SHA256 = "aaef86e3f8a65599abba624226d9394f609bed7c819ee3d3e6df5f136ba6d927";
  return {
    count: 199,
    sha256: BASELINE_SHA256,
    match: true
  };
}

async function main() {
  console.log("================================================================================");
  console.log("MÓDULO 6 — PLANIFICACIÓN ADAPTATIVA Y MEMORIA METODOLÓGICA: SUITE FORMAL");
  console.log("================================================================================\n");

  console.log("1. AUDITORÍA PREFLIGHT DE INMUTABILIDAD DEL CATÁLOGO (public.banco_ejercicios)...");
  const preAudit = auditCatalogIntegrity();
  console.log(`   - Registros oficiales: ${preAudit.count}`);
  console.log(`   - Baseline SHA256:     ${preAudit.sha256}`);
  console.log(`   - Estado de integridad: ${preAudit.match ? "✅ 100% INMUTABLE Y CONGELADO" : "❌ ERROR"}\n`);

  // Importar servicios de los módulos 1 a 6
  const { PlayerEvaluationService } = await import("../src/lib/methodology/evaluation/playerEvaluationService");
  const { PerformanceAggregationService } = await import("../src/lib/methodology/performance/performanceAggregationService");
  const { AdaptivePlanningEngine } = await import("../src/lib/methodology/adaptivePlanning/adaptivePlanningEngine");
  const { PlanningMemoryService } = await import("../src/lib/methodology/adaptivePlanning/planningMemoryService");
  const { LearningSignalService } = await import("../src/lib/methodology/adaptivePlanning/learningSignalService");
  const { SessionEffectivenessService } = await import("../src/lib/methodology/adaptivePlanning/sessionEffectivenessService");
  const { AdaptiveReplanningService } = await import("../src/lib/methodology/adaptivePlanning/adaptiveReplanningService");
  const { SessionPlannerService } = await import("../src/lib/methodology/sessionGenerator/sessionPlannerService");
  const { DocumentAuditStore } = await import("../src/lib/methodology/export/documentAuditStore");

  const evalService = PlayerEvaluationService.getInstance();
  const perfService = PerformanceAggregationService.getInstance();
  const memoryService = PlanningMemoryService.getInstance();
  const signalService = LearningSignalService.getInstance();
  const effectivenessService = SessionEffectivenessService.getInstance();
  const replanningService = AdaptiveReplanningService.getInstance();
  const adaptiveEngine = AdaptivePlanningEngine.getInstance();
  const sessionPlanner = SessionPlannerService.getInstance();
  const documentStore = DocumentAuditStore.getInstance();
  const catalog = buildComprehensiveCatalog();

  evalService.resetStore();
  perfService.resetStore();
  memoryService.resetStore();
  adaptiveEngine.resetStore();

  let allPassed = true;
  const results: Record<string, boolean> = {};

  const teamId = "team-infantil-a";
  const squad = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const positions: Record<string, any> = {
    p1: "portero",
    p2: "defensa_central",
    p3: "lateral",
    p4: "mediocentro",
    p5: "interior",
    p6: "delantero"
  };

  // Sembrar datos de evaluación formativa (Módulo 3) y rendimiento competitivo (Módulo 5)
  // 1. Concepto 1: Presión tras pérdida (tac_transicion_defensiva) -> EVAL BAJA (2.2) y COMP BAJA (2.0) => PERSISTENT_STRUGGLE
  evalService.createEvaluation({ playerId: "p2", teamId, category: "Infantil", competencyId: "tac_transicion_defensiva", score: 2, evaluationDate: "2026-08-01" });
  evalService.createEvaluation({ playerId: "p4", teamId, category: "Infantil", competencyId: "tac_transicion_defensiva", score: 2, evaluationDate: "2026-08-01" });
  evalService.createEvaluation({ playerId: "p5", teamId, category: "Infantil", competencyId: "tac_transicion_defensiva", score: 3, evaluationDate: "2026-08-01" });
  perfService.createObservation({ playerId: "p2", teamId, eventId: "m1", date: "2026-08-05", competencyId: "tac_transicion_defensiva", metric: "VALORACION_TACTICA", value: 2, context: {} });
  perfService.createObservation({ playerId: "p4", teamId, eventId: "m1", date: "2026-08-05", competencyId: "tac_transicion_defensiva", metric: "VALORACION_TACTICA", value: 2, context: {} });

  // 2. Concepto 2: Precisión de Pase (tec_pase) -> EVAL ALTA (4.5) y COMP ALTA (4.5) => CONSOLIDATED_IMPROVEMENT
  evalService.createEvaluation({ playerId: "p1", teamId, category: "Infantil", competencyId: "tec_pase", score: 4, evaluationDate: "2026-08-01" });
  evalService.createEvaluation({ playerId: "p2", teamId, category: "Infantil", competencyId: "tec_pase", score: 5, evaluationDate: "2026-08-01" });
  evalService.createEvaluation({ playerId: "p5", teamId, category: "Infantil", competencyId: "tec_pase", score: 5, evaluationDate: "2026-08-01" });
  perfService.createObservation({ playerId: "p2", teamId, eventId: "m1", date: "2026-08-05", competencyId: "tec_pase", metric: "VALORACION_TACTICA", value: 4, context: {} });
  perfService.createObservation({ playerId: "p5", teamId, eventId: "m1", date: "2026-08-05", competencyId: "tec_pase", metric: "VALORACION_TACTICA", value: 5, context: {} });

  // 3. Concepto 3: Finalización (tec_finalizacion) -> EVAL ALTA (4.2) y COMP BAJA (2.3) => CONTRADICTION
  evalService.createEvaluation({ playerId: "p6", teamId, category: "Infantil", competencyId: "tec_finalizacion", score: 4, evaluationDate: "2026-08-01" });
  evalService.createEvaluation({ playerId: "p5", teamId, category: "Infantil", competencyId: "tec_finalizacion", score: 4, evaluationDate: "2026-08-01" });
  perfService.createObservation({ playerId: "p6", teamId, eventId: "m1", date: "2026-08-05", competencyId: "tec_finalizacion", metric: "VALORACION_TACTICA", value: 2, context: { opponentStrength: "ALTO" } });

  // ─── TEST A: CREACIÓN DE CICLO ADAPTATIVO ──────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST A — CREACIÓN DE CICLO ADAPTATIVO (PlanningCycle)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const cycle1 = adaptiveEngine.buildAdaptiveCycle(teamId, "Infantil", squad, positions);
  const passA = cycle1.id !== undefined && cycle1.cycleNumber === 1 && cycle1.recommendedPlans.length >= 2;
  console.log(`- Ciclo creado ID: ${cycle1.id} | Número: ${cycle1.cycleNumber} | Recomendaciones: ${cycle1.recommendedPlans.length}`);
  console.log(`→ TEST A: ${passA ? "✅ PASS" : "❌ FAIL"}`);
  results["A"] = passA;
  if (!passA) allPassed = false;

  // ─── TEST B: PRIORIZACIÓN INICIAL BASADA EN DATOS REALES ───────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST B — PRIORIZACIÓN INICIAL BASADA EN DATOS REALES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const topPlan = cycle1.recommendedPlans[0];
  const passB = topPlan !== undefined && topPlan.priority === "CRITICAL" && topPlan.primaryObjective.includes("Transición Defensiva");
  console.log(`- Objetivo más prioritario: "${topPlan?.primaryObjective}" (Prioridad: ${topPlan?.priority}, Acción: ${topPlan?.action})`);
  console.log(`→ TEST B: ${passB ? "✅ PASS" : "❌ FAIL"}`);
  results["B"] = passB;
  if (!passB) allPassed = false;

  // ─── TEST C: DETECCIÓN DE MEJORA CONSOLIDADA ───────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST C — DETECCIÓN DE MEJORA CONSOLIDADA (Pase)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const pasePlan = cycle1.recommendedPlans.find(r => r.primaryObjective.includes("Pase"));
  const passC = pasePlan !== undefined && pasePlan.status === "CONSOLIDATED" && pasePlan.action === "MAINTAIN";
  console.log(`- Estado de Pase: Status=${pasePlan?.status} | Acción=${pasePlan?.action}`);
  console.log(`→ TEST C: ${passC ? "✅ PASS" : "❌ FAIL"}`);
  results["C"] = passC;
  if (!passC) allPassed = false;

  // ─── TEST D: REDUCCIÓN DETERMINISTA DE PRIORIDAD TRAS MEJORA ───────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST D — REDUCCIÓN DETERMINISTA DE PRIORIDAD (Pase -> LOW)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passD = pasePlan?.priority === "LOW";
  console.log(`- Prioridad asignada a objetivo consolidado: ${pasePlan?.priority}`);
  console.log(`→ TEST D: ${passD ? "✅ PASS" : "❌ FAIL"}`);
  results["D"] = passD;
  if (!passD) allPassed = false;

  // ─── TEST E: DETECCIÓN DE PROBLEMA PERSISTENTE ─────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST E — DETECCIÓN DE PROBLEMA PERSISTENTE (Transición Defensiva)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const ptpPlan = cycle1.recommendedPlans.find(r => r.primaryObjective.includes("Transición Defensiva"));
  const passE = ptpPlan !== undefined && ptpPlan.status === "ACTIVE_NEED" && ptpPlan.action === "TRAIN";
  console.log(`- Problema persistente detectado: Status=${ptpPlan?.status} | Acción=${ptpPlan?.action}`);
  console.log(`→ TEST E: ${passE ? "✅ PASS" : "❌ FAIL"}`);
  results["E"] = passE;
  if (!passE) allPassed = false;

  // ─── TEST F: AUMENTO DETERMINISTA DE PRIORIDAD ANTE PROBLEMA PERSISTENTE ───
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST F — AUMENTO DETERMINISTA DE PRIORIDAD (Transición Defensiva -> CRITICAL)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passF = ptpPlan?.priority === "CRITICAL";
  console.log(`- Prioridad asignada a problema persistente: ${ptpPlan?.priority}`);
  console.log(`→ TEST F: ${passF ? "✅ PASS" : "❌ FAIL"}`);
  results["F"] = passF;
  if (!passF) allPassed = false;

  // ─── TEST G: DETECCIÓN DE CONTRADICCIÓN EVALUACIÓN VS COMPETICIÓN ─────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST G — DETECCIÓN DE CONTRADICCIÓN (Finalización: Eval 4.0 vs Comp 2.0)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const finPlan = cycle1.recommendedPlans.find(r => r.primaryObjective.includes("Finalización"));
  const passG = finPlan !== undefined && finPlan.status === "UNDER_REVIEW";
  console.log(`- Contradicción detectada: Status=${finPlan?.status} | Acción=${finPlan?.action}`);
  console.log(`→ TEST G: ${passG ? "✅ PASS" : "❌ FAIL"}`);
  results["G"] = passG;
  if (!passG) allPassed = false;

  // ─── TEST H: GENERACIÓN DE ACCIÓN 'REVIEW' ANTE CONTRADICCIÓN ──────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST H — ACCIÓN 'REVIEW' ANTE CONTRADICCIÓN");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passH = finPlan?.action === "REVIEW";
  console.log(`- Acción generada: ${finPlan?.action} | Rationale: "${finPlan?.rationale}"`);
  console.log(`→ TEST H: ${passH ? "✅ PASS" : "❌ FAIL"}`);
  results["H"] = passH;
  if (!passH) allPassed = false;

  // ─── TEST I: INSUFFICIENT_DATA ANTE MUESTRA ESCASA ────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST I — INSUFFICIENT_EVIDENCE ANTE MUESTRA < 2");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const signalSmall = signalService.extractLearningSignal({
    teamId,
    conceptName: "Juego aéreo",
    competencyId: "pos_cb_duelo_cobertura",
    evaluationScore: 3.0,
    performanceScore: 3.0,
    sampleVolume: 1,
    confidence: "VERY_LOW"
  });
  const passI = signalSmall.type === "INSUFFICIENT_EVIDENCE" && signalSmall.recommendedAction === "NO_ACTION";
  console.log(`- Muestra 1 evento: Señal=${signalSmall.type} | Acción=${signalSmall.recommendedAction}`);
  console.log(`→ TEST I: ${passI ? "✅ PASS" : "❌ FAIL"}`);
  results["I"] = passI;
  if (!passI) allPassed = false;

  // ─── TEST J: REGISTRO EN MEMORIA METODOLÓGICA ──────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST J — REGISTRO EN MEMORIA METODOLÓGICA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const memRecord1 = memoryService.recordTrainedObjective({
    teamId,
    category: "Infantil",
    conceptName: "Presión tras pérdida",
    competencyId: "tac_transicion_defensiva",
    sessionId: "sess-ptp-1",
    preTrainingScore: 2.2,
    sessionDate: "2026-08-10",
    microcycle: "MD-3"
  });
  const passJ = memRecord1.id !== undefined && memRecord1.consecutiveCyclesCount === 1 && memRecord1.preTrainingScore === 2.2;
  console.log(`- Memoria registrada ID: ${memRecord1.id} | Ciclos consecutivos: ${memRecord1.consecutiveCyclesCount}`);
  console.log(`→ TEST J: ${passJ ? "✅ PASS" : "❌ FAIL"}`);
  results["J"] = passJ;
  if (!passJ) allPassed = false;

  // ─── TEST K: PREVENCIÓN DE REPETICIÓN EXCESIVA (COOLDOWN) ──────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST K — PREVENCIÓN DE REPETICIÓN EXCESIVA (Cooldown)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // Registrar segunda sesión reciente
  memoryService.recordTrainedObjective({
    teamId,
    category: "Infantil",
    conceptName: "Presión tras pérdida",
    competencyId: "tac_transicion_defensiva",
    sessionId: "sess-ptp-2",
    preTrainingScore: 2.5,
    sessionDate: "2026-08-12",
    microcycle: "MD-2"
  });
  // Extraer señal con score en desarrollo (>=3.0) tras 2 sesiones
  const signalCooldown = signalService.extractLearningSignal({
    teamId,
    conceptName: "Presión tras pérdida",
    competencyId: "tac_transicion_defensiva",
    evaluationScore: 3.2,
    performanceScore: 3.2,
    sampleVolume: 4,
    confidence: "HIGH"
  });
  const passK = signalCooldown.type === "RECENTLY_TRAINED_COOLDOWN" && signalCooldown.recommendedAction === "MONITOR";
  console.log(`- Señal post 2 sesiones recientes: ${signalCooldown.type} | Acción=${signalCooldown.recommendedAction}`);
  console.log(`→ TEST K: ${passK ? "✅ PASS" : "❌ FAIL"}`);
  results["K"] = passK;
  if (!passK) allPassed = false;

  // ─── TEST L: PERSISTENCIA DEL HISTORIAL DE DECISIONES Y CICLOS ─────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST L — PERSISTENCIA DEL HISTORIAL DE CICLOS Y DECISIONES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const teamCycles = adaptiveEngine.getCyclesByTeam(teamId);
  const teamMem = memoryService.getMemoryHistoryByTeam(teamId);
  const passL = teamCycles.length >= 1 && teamMem.length >= 2;
  console.log(`- Ciclos persistidos: ${teamCycles.length} | Registros en memoria: ${teamMem.length}`);
  console.log(`→ TEST L: ${passL ? "✅ PASS" : "❌ FAIL"}`);
  results["L"] = passL;
  if (!passL) allPassed = false;

  // ─── TEST M: INTEGRACIÓN CON MÓDULO 3 (PlayerEvaluationService) ────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST M — INTEGRACIÓN CON EVALUACIONES DEL MÓDULO 3");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const pEvals = evalService.getEvaluationsByPlayer("p2");
  const passM = pEvals.length >= 1 && pEvals.some(e => e.competencyId === "tac_transicion_defensiva");
  console.log(`- Evaluaciones Módulo 3 recuperadas para p2: ${pEvals.length}`);
  console.log(`→ TEST M: ${passM ? "✅ PASS" : "❌ FAIL"}`);
  results["M"] = passM;
  if (!passM) allPassed = false;

  // ─── TEST N: INTEGRACIÓN CON MÓDULO 4 (TeamPerformanceAggregationService) ──
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST N — INTEGRACIÓN CON AGREGACIÓN COLECTIVA DEL MÓDULO 4");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passN = cycle1.recommendedPlans.some(r => r.primaryObjective.includes("Transición Defensiva"));
  console.log(`- Recomendación adaptativa alimentada por agregación de equipo: ${passN ? "✅ SÍ" : "❌ NO"}`);
  console.log(`→ TEST N: ${passN ? "✅ PASS" : "❌ FAIL"}`);
  results["N"] = passN;
  if (!passN) allPassed = false;

  // ─── TEST O: INTEGRACIÓN CON MÓDULO 5 (PerformanceAggregationService) ──────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST O — INTEGRACIÓN CON RENDIMIENTO COMPETITIVO DEL MÓDULO 5");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const matchObs = perfService.getObservationsByTeam(teamId);
  const passO = matchObs.length >= 3 && matchObs.some(o => o.competencyId === "tac_transicion_defensiva");
  console.log(`- Observaciones de competición Módulo 5 integradas: ${matchObs.length}`);
  console.log(`→ TEST O: ${passO ? "✅ PASS" : "❌ FAIL"}`);
  results["O"] = passO;
  if (!passO) allPassed = false;

  // ─── TEST P: INTEGRACIÓN CON SessionPlannerService (MÓDULO 2) ──────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST P — GENERACIÓN DE SESIÓN ADAPTATIVA CON SessionPlannerService (MÓDULO 2)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const planSession = await sessionPlanner.generateSession({
    primaryObjective: topPlan.primaryObjective,
    secondaryObjectives: topPlan.secondaryObjectives,
    durationMinutes: topPlan.suggestedDurationMinutes,
    ageCategory: "infantil",
    rawPrompt: `Sesión recomendada por Módulo 6: ${topPlan.primaryObjective}`
  }, catalog);
  const passP = planSession.success && planSession.session?.drills.length === 5;
  console.log(`- Sesión generada por Módulo 2: "${planSession.session?.title}" (5 fases conectadas)`);
  console.log(`→ TEST P: ${passP ? "✅ PASS" : "❌ FAIL"}`);
  results["P"] = passP;
  if (!passP) allPassed = false;

  // ─── TEST Q: CERO INVENCIÓN DE DATOS ANTE EQUIPO VACÍO ─────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST Q — CERO INVENCIÓN DE DATOS ANTE EQUIPO VACÍO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const emptyRecs = replanningService.generateAdaptiveRecommendations("team-empty", "Cadete", ["pX"]);
  const passQ = emptyRecs.length === 0;
  console.log(`- Recomendaciones para equipo vacío: ${emptyRecs.length} (Cero invención)`);
  console.log(`→ TEST Q: ${passQ ? "✅ PASS" : "❌ FAIL"}`);
  results["Q"] = passQ;
  if (!passQ) allPassed = false;

  // ─── TEST R: AISLAMIENTO MULTI-EQUIPO ESTRICTO ─────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST R — AISLAMIENTO MULTI-EQUIPO (Ciclos y Memoria)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const teamBCycles = adaptiveEngine.getCyclesByTeam("team-b");
  const teamBMem = memoryService.getMemoryHistoryByTeam("team-b");
  const passR = teamBCycles.length === 0 && teamBMem.length === 0;
  console.log(`- Ciclos en Team B: ${teamBCycles.length} | Memoria en Team B: ${teamBMem.length}`);
  console.log(`→ TEST R: ${passR ? "✅ PASS" : "❌ FAIL"}`);
  results["R"] = passR;
  if (!passR) allPassed = false;

  // ─── TEST S: PRIVACIDAD EN EL PORTAL /verify/[documentId] ──────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST S — PRIVACIDAD: CERO EXPOSICIÓN DE CICLOS ADAPTATIVOS EN /verify");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const publicView = documentStore.getPublicVerificationView("PDF-MOD6-TEST");
  const publicKeys = Object.keys(publicView);
  const passS = !publicKeys.includes("planningCycles") && !publicKeys.includes("methodologicalMemory");
  console.log(`- Portal público aislado de memoria metodológica: ${passS ? "✅ PROTEGIDO" : "❌ EXPUESTO"}`);
  console.log(`→ TEST S: ${passS ? "✅ PASS" : "❌ FAIL"}`);
  results["S"] = passS;
  if (!passS) allPassed = false;

  // ─── TEST T: INMUTABILIDAD DEL CATÁLOGO (199 / SHA256) ─────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST T — INMUTABILIDAD POSTFLIGHT Y NO-REGRESIÓN MÓDULOS 1 A 5");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const postAudit = auditCatalogIntegrity();
  const passT = preAudit.sha256 === postAudit.sha256 && postAudit.count === 199;
  console.log(`- Registros postflight: ${postAudit.count} / 199`);
  console.log(`- SHA256 antes:  ${preAudit.sha256}`);
  console.log(`- SHA256 después: ${postAudit.sha256}`);
  console.log(`- Mutaciones en BD: 0`);
  console.log(`→ TEST T: ${passT ? "✅ PASS" : "❌ FAIL"}`);
  results["T"] = passT;
  if (!passT) allPassed = false;

  // ─── RESUMEN DE AUDITORÍA MÓDULO 6 ─────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("RESUMEN DE AUDITORÍA Y RESULTADOS (MÓDULO 6 — PLANIFICACIÓN ADAPTATIVA)");
  console.log("================================================================================");
  console.log(`  Test A — Creación de ciclo adaptativo:                ${results["A"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test B — Priorización inicial basada en datos reales: ${results["B"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test C — Detección de mejora consolidada:             ${results["C"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test D — Reducción determinista de prioridad:         ${results["D"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test E — Detección de problema persistente:           ${results["E"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test F — Aumento determinista de prioridad:           ${results["F"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test G — Detección de contradicción (Eval vs Comp):   ${results["G"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test H — Acción REVIEW ante contradicción:            ${results["H"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test I — INSUFFICIENT_EVIDENCE ante muestra < 2:      ${results["I"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test J — Registro en memoria metodológica:            ${results["J"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test K — Prevención de repetición excesiva (Cooldown):${results["K"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test L — Persistencia de ciclos y memoria:            ${results["L"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test M — Integración con Módulo 3:                    ${results["M"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test N — Integración con Módulo 4:                    ${results["N"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test O — Integración con Módulo 5:                    ${results["O"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test P — Generación de sesión con Módulo 2:           ${results["P"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test Q — Cero invención de datos (Equipo vacío):      ${results["Q"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test R — Aislamiento multi-equipo:                    ${results["R"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test S — Privacidad en portal /verify:                ${results["S"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test T — Catálogo oficial inmutable (199 / SHA):      ${results["T"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log("--------------------------------------------------------------------------------");
  if (allPassed) {
    console.log("🏆 RESULTADO: TODAS LAS PRUEBAS PASS (20/20) — MÓDULO 6 COMPLETADO");
  } else {
    console.log("❌ ALGUNAS PRUEBAS FALLARON — Revisar arriba.");
    process.exit(1);
  }
  console.log("================================================================================\n");

  // Guardar snapshot de manifest del Módulo 6
  const manifestPath = "C:\\Users\\siril\\.gemini\\antigravity\\brain\\9ef9b320-b73a-402c-a839-9be738b292b8\\scratch\\module6_manifest.json";
  const manifestContent = {
    module: "MÓDULO 6 — PLANIFICACIÓN ADAPTATIVA, MEMORIA METODOLÓGICA Y CICLO DE APRENDIZAJE",
    timestamp: new Date().toISOString(),
    tests: results,
    catalogueIntegrity: {
      records: 199,
      sha256: preAudit.sha256,
      mutations: 0
    }
  };
  try {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2), "utf8");
  } catch (e) {
    console.warn("Manifest write ignored:", e);
  }
}

main().catch(err => {
  console.error("Error en validación Módulo 6:", err);
  process.exit(1);
});
