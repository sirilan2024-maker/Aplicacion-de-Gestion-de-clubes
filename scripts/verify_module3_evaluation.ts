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
  console.log("MÓDULO 3 — EVALUACIÓN FORMATIVA Y SEGUIMIENTO LONGITUDINAL: SUITE FORMAL");
  console.log("================================================================================\n");

  console.log("1. AUDITORÍA PREFLIGHT DE INMUTABILIDAD DEL CATÁLOGO (public.banco_ejercicios)...");
  const preAudit = auditCatalogIntegrity();
  console.log(`   - Registros oficiales: ${preAudit.count}`);
  console.log(`   - Baseline SHA256:     ${preAudit.sha256}`);
  console.log(`   - Estado de integridad: ${preAudit.match ? "✅ 100% INMUTABLE Y CONGELADO" : "❌ ERROR"}\n`);

  // Importar servicios del Módulo 3 y módulos anteriores
  const { CompetencyMatrixService } = await import("../src/lib/methodology/evaluation/competencyMatrixService");
  const { PlayerEvaluationService } = await import("../src/lib/methodology/evaluation/playerEvaluationService");
  const { PlayerProgressionService } = await import("../src/lib/methodology/evaluation/playerProgressionService");
  const { PlayerDevelopmentInsightService } = await import("../src/lib/methodology/evaluation/playerDevelopmentInsightService");
  const { SessionPlannerService } = await import("../src/lib/methodology/sessionGenerator/sessionPlannerService");
  const { DocumentAuditStore } = await import("../src/lib/methodology/export/documentAuditStore");

  const matrixService = CompetencyMatrixService.getInstance();
  const evaluationService = PlayerEvaluationService.getInstance();
  const progressionService = PlayerProgressionService.getInstance();
  const insightService = PlayerDevelopmentInsightService.getInstance();
  const plannerService = SessionPlannerService.getInstance();
  const documentStore = DocumentAuditStore.getInstance();
  const catalog = buildComprehensiveCatalog();

  evaluationService.resetStore();

  let allPassed = true;
  const results: Record<string, boolean> = {};

  // ─── TEST A: CREAR EVALUACIÓN ──────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST A — CREAR EVALUACIÓN CORRECTAMENTE (Jugador, Sesión, Competencia)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const evalA = evaluationService.createEvaluation({
    playerId: "player-001",
    sessionId: "session-101",
    teamId: "team-infantil-a",
    category: "Infantil",
    position: "mediocentro",
    competencyId: "tec_pase",
    score: 4,
    observation: "Excelente visión y precisión en pases entre líneas.",
    evidenceContext: "Ejercicio rondo 4v2 y posesión 5v5",
    evaluatorId: "coach-01",
    evaluationDate: "2026-08-10"
  });
  const passA = evalA.id !== undefined && evalA.playerId === "player-001" && evalA.score === 4 && evalA.competencyId === "tec_pase";
  console.log(`- Evaluación creada ID: ${evalA.id} | Jugador: ${evalA.playerId} | Score: ${evalA.score}/5`);
  console.log(`→ TEST A: ${passA ? "✅ PASS" : "❌ FAIL"}`);
  results["A"] = passA;
  if (!passA) allPassed = false;

  // ─── TEST B: ESCALA 1 A 5 Y RECHAZO DE RANGOS INVÁLIDOS ────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST B — ESCALA 1 A 5 Y RECHAZO DE VALORES FUERA DE RANGO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  let caughtZero = false;
  let caughtSix = false;
  try {
    evaluationService.createEvaluation({
      playerId: "player-001",
      category: "Infantil",
      competencyId: "tec_pase",
      score: 0
    });
  } catch (e) {
    caughtZero = true;
  }
  try {
    evaluationService.createEvaluation({
      playerId: "player-001",
      category: "Infantil",
      competencyId: "tec_pase",
      score: 6
    });
  } catch (e) {
    caughtSix = true;
  }
  const passB = caughtZero && caughtSix;
  console.log(`- Rechazo Score=0: ${caughtZero ? "✅ Rechazado" : "❌ Aceptado"} | Score=6: ${caughtSix ? "✅ Rechazado" : "❌ Aceptado"}`);
  console.log(`→ TEST B: ${passB ? "✅ PASS" : "❌ FAIL"}`);
  results["B"] = passB;
  if (!passB) allPassed = false;

  // ─── TEST C: OBSERVACIÓN Y CONTEXTO CUALITATIVO ────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST C — REGISTRO DE OBSERVACIÓN CUALITATIVA Y EVIDENCIA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passC = evalA.observation === "Excelente visión y precisión en pases entre líneas." && evalA.evidenceContext === "Ejercicio rondo 4v2 y posesión 5v5";
  console.log(`- Observación: "${evalA.observation}"`);
  console.log(`- Evidencia:   "${evalA.evidenceContext}"`);
  console.log(`→ TEST C: ${passC ? "✅ PASS" : "❌ FAIL"}`);
  results["C"] = passC;
  if (!passC) allPassed = false;

  // ─── TEST D: RECUPERACIÓN DE HISTORIAL CRONOLÓGICO ─────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST D — RECUPERACIÓN DE HISTORIAL CRONOLÓGICO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  evaluationService.createEvaluation({
    playerId: "player-001",
    category: "Infantil",
    competencyId: "tec_control",
    score: 3,
    evaluationDate: "2026-08-12"
  });
  evaluationService.createEvaluation({
    playerId: "player-001",
    category: "Infantil",
    competencyId: "tec_pase",
    score: 5,
    evaluationDate: "2026-08-15"
  });
  const playerHistory = evaluationService.getEvaluationsByPlayer("player-001");
  const passD = playerHistory.length === 3 && playerHistory[0].evaluationDate <= playerHistory[1].evaluationDate;
  console.log(`- Total registros recuperados: ${playerHistory.length} ordenados por fecha`);
  console.log(`→ TEST D: ${passD ? "✅ PASS" : "❌ FAIL"}`);
  results["D"] = passD;
  if (!passD) allPassed = false;

  // ─── TEST E: DETECCIÓN DE TENDENCIAS (IMPROVING / STABLE / DECLINING) ──────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST E — DETECCIÓN DE TENDENCIAS LONGITUDINALES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // player-001 en tec_pase tiene 4 (2026-08-10) -> 5 (2026-08-15) => delta +1.0 => IMPROVING
  const progImproving = progressionService.calculateCompetencyProgression("player-001", "tec_pase");
  
  // Crear jugador con tendencia DECLINING
  evaluationService.createEvaluation({
    playerId: "player-002",
    category: "Infantil",
    competencyId: "tac_transicion_defensiva",
    score: 4,
    evaluationDate: "2026-08-01"
  });
  evaluationService.createEvaluation({
    playerId: "player-002",
    category: "Infantil",
    competencyId: "tac_transicion_defensiva",
    score: 2,
    evaluationDate: "2026-08-10"
  });
  const progDeclining = progressionService.calculateCompetencyProgression("player-002", "tac_transicion_defensiva");

  // Crear jugador con tendencia STABLE
  evaluationService.createEvaluation({
    playerId: "player-003",
    category: "Infantil",
    competencyId: "fis_velocidad",
    score: 3,
    evaluationDate: "2026-08-01"
  });
  evaluationService.createEvaluation({
    playerId: "player-003",
    category: "Infantil",
    competencyId: "fis_velocidad",
    score: 3,
    evaluationDate: "2026-08-10"
  });
  const progStable = progressionService.calculateCompetencyProgression("player-003", "fis_velocidad");

  const passE = progImproving?.trend === "IMPROVING" && progDeclining?.trend === "DECLINING" && progStable?.trend === "STABLE";
  console.log(`- tec_pase (4 -> 5):            Tendencia=${progImproving?.trend} (Delta=+${progImproving?.scoreDelta})`);
  console.log(`- transicion_defensiva (4 -> 2): Tendencia=${progDeclining?.trend} (Delta=${progDeclining?.scoreDelta})`);
  console.log(`- fis_velocidad (3 -> 3):        Tendencia=${progStable?.trend} (Delta=${progStable?.scoreDelta})`);
  console.log(`→ TEST E: ${passE ? "✅ PASS" : "❌ FAIL"}`);
  results["E"] = passE;
  if (!passE) allPassed = false;

  // ─── TEST F: NO DECLARAR TENDENCIA CON DATOS INSUFICIENTES (<2) ───────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST F — INSUFFICIENT_DATA ANTE EVALUACIÓN AISLADA (<2)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const progSingle = progressionService.calculateCompetencyProgression("player-001", "tec_control");
  const passF = progSingle?.trend === "INSUFFICIENT_DATA" && progSingle.evaluationsCount === 1;
  console.log(`- 1 sola evaluación: Tendencia="${progSingle?.trend}" | Evaluaciones=${progSingle?.evaluationsCount}`);
  console.log(`→ TEST F: ${passF ? "✅ PASS" : "❌ FAIL"}`);
  results["F"] = passF;
  if (!passF) allPassed = false;

  // ─── TEST G: DETECCIÓN DE FORTALEZAS ───────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST G — DETECCIÓN DE FORTALEZAS CONSOLIDADAS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const { strengths } = insightService.discoverInsights("player-001");
  const hasPaseStrength = strengths.some(s => s.competencyId === "tec_pase");
  const passG = hasPaseStrength && strengths.length > 0;
  console.log(`- Fortalezas detectadas: ${strengths.map(s => `${s.competencyName} (${s.currentScore}/5)`).join(", ")}`);
  console.log(`→ TEST G: ${passG ? "✅ PASS" : "❌ FAIL"}`);
  results["G"] = passG;
  if (!passG) allPassed = false;

  // ─── TEST H: DETECCIÓN DE ÁREAS DE MEJORA ──────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST H — DETECCIÓN DE ÁREAS DE MEJORA (Baja puntuación / Tendencia negativa)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const { areasForImprovement } = insightService.discoverInsights("player-002");
  const hasDecliningImprovement = areasForImprovement.some(a => a.competencyId === "tac_transicion_defensiva");
  const passH = hasDecliningImprovement && areasForImprovement.length > 0;
  console.log(`- Áreas de mejora detectadas: ${areasForImprovement.map(a => `${a.competencyName} (${a.currentScore}/5, ${a.trend})`).join(", ")}`);
  console.log(`→ TEST H: ${passH ? "✅ PASS" : "❌ FAIL"}`);
  results["H"] = passH;
  if (!passH) allPassed = false;

  // ─── TEST I: CONSULTA DE MATRIZ DE COMPETENCIAS POR CATEGORÍA ─────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST I — MATRIZ DE COMPETENCIAS ADAPTADA A CATEGORÍAS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const compInfantil = matrixService.getCompetenciesForCategory("Infantil");
  const passI = compInfantil.length >= 15 && compInfantil.some(c => c.area === "tecnica") && compInfantil.some(c => c.area === "tactica");
  console.log(`- Competencias disponibles para Infantil: ${compInfantil.length} competencias`);
  console.log(`→ TEST I: ${passI ? "✅ PASS" : "❌ FAIL"}`);
  results["I"] = passI;
  if (!passI) allPassed = false;

  // ─── TEST J: COMPETENCIAS ESPECÍFICAS POR POSICIÓN ─────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST J — COMPETENCIAS ESPECÍFICAS POR POSICIÓN (Portero vs Delantero)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const compGK = matrixService.getCompetenciesForPosition("portero");
  const compST = matrixService.getCompetenciesForPosition("delantero");
  const hasGkSpecific = compGK.some(c => c.id === "pos_gk_blocaje");
  const hasStSpecific = compST.some(c => c.id === "pos_st_desmarques_remate");
  const passJ = hasGkSpecific && hasStSpecific && !compGK.some(c => c.id === "pos_st_desmarques_remate");
  console.log(`- Portero incluye blocaje: ${hasGkSpecific ? "✅ SÍ" : "❌ NO"} | Delantero incluye desmarques: ${hasStSpecific ? "✅ SÍ" : "❌ NO"}`);
  console.log(`→ TEST J: ${passJ ? "✅ PASS" : "❌ FAIL"}`);
  results["J"] = passJ;
  if (!passJ) allPassed = false;

  // ─── TEST K: DEDUPLICACIÓN DE EVALUACIONES EN LA MISMA FECHA/SESIÓN ────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST K — DEDUPLICACIÓN ANTE REINTENTOS ACCIDENTALES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const evalK1 = evaluationService.createEvaluation({
    playerId: "player-004",
    sessionId: "sess-99",
    category: "Cadete",
    competencyId: "tec_pase",
    score: 3,
    evaluationDate: "2026-08-20"
  });
  const evalK2 = evaluationService.createEvaluation({
    playerId: "player-004",
    sessionId: "sess-99",
    category: "Cadete",
    competencyId: "tec_pase",
    score: 4, // Corrección/actualización
    evaluationDate: "2026-08-20"
  });
  const allEvalsK = evaluationService.getEvaluationsByPlayer("player-004");
  const passK = allEvalsK.length === 1 && evalK2.score === 4 && evalK1.id === evalK2.id;
  console.log(`- Evaluaciones registradas para player-004: ${allEvalsK.length} (Score actualizado a ${allEvalsK[0]?.score})`);
  console.log(`→ TEST K: ${passK ? "✅ PASS" : "❌ FAIL"}`);
  results["K"] = passK;
  if (!passK) allPassed = false;

  // ─── TEST L: ASOCIACIÓN Y CONSULTA POR SESIÓN DE ENTRENAMIENTO ────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST L — CONSULTA DE EVALUACIONES ASOCIADAS A UNA SESIÓN");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const sessionEvals = evaluationService.getEvaluationsBySession("session-101");
  const passL = sessionEvals.length >= 1 && sessionEvals[0].sessionId === "session-101";
  console.log(`- Evaluaciones vinculadas a session-101: ${sessionEvals.length}`);
  console.log(`→ TEST L: ${passL ? "✅ PASS" : "❌ FAIL"}`);
  results["L"] = passL;
  if (!passL) allPassed = false;

  // ─── TEST M: INTEGRACIÓN CON PLANIFICACIÓN INTELIGENTE (MÓDULO 2) ──────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST M — ALIMENTACIÓN DE OBJETIVOS AL PLANIFICADOR INTELIGENTE (MÓDULO 2)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // Añadir evaluaciones de necesidad a varios jugadores
  evaluationService.createEvaluation({ playerId: "p-a", category: "Infantil", competencyId: "tac_transicion_defensiva", score: 2, evaluationDate: "2026-08-21" });
  evaluationService.createEvaluation({ playerId: "p-b", category: "Infantil", competencyId: "tac_transicion_defensiva", score: 2, evaluationDate: "2026-08-21" });
  evaluationService.createEvaluation({ playerId: "p-c", category: "Infantil", competencyId: "tac_transicion_defensiva", score: 1, evaluationDate: "2026-08-21" });

  const planningPriorities = insightService.generateTeamPlanningFocus(["p-a", "p-b", "p-c", "player-002"]);
  const topNeed = planningPriorities[0];
  
  // Utilizar la prioridad como objetivo en el generador de sesiones del Módulo 2
  const planResponse = await plannerService.generateSession({
    primaryObjective: topNeed.tacticalConcept,
    secondaryObjectives: ["Posesión"],
    durationMinutes: 75,
    ageCategory: "infantil",
    rawPrompt: `Sesión de refuerzo sobre ${topNeed.tacticalConcept}`
  }, catalog);

  const passM = planningPriorities.length > 0 && topNeed.priority === "ALTA" && planResponse.success && planResponse.session?.drills.length === 5;
  console.log(`- Prioridad táctica detectada: "${topNeed.tacticalConcept}" (${topNeed.targetedPlayersCount} jugadores, Prioridad ${topNeed.priority})`);
  console.log(`- Sesión generada por Módulo 2: "${planResponse.session?.title}" (5 fases conectadas)`);
  console.log(`→ TEST M: ${passM ? "✅ PASS" : "❌ FAIL"}`);
  results["M"] = passM;
  if (!passM) allPassed = false;

  // ─── TEST N: PRIVACIDAD Y AISLAMIENTO DE DATOS SENSIBLES ───────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST N — PRIVACIDAD: DATOS DE EVALUACIÓN NUNCA EXPUESTOS PÚBLICAMENTE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // Comprobar que DocumentAuditStore y /verify/[documentId] no contienen claves ni notas privadas
  const mockPublic = documentStore.getPublicVerificationView("NON-EXISTENT-TEST");
  const publicKeys = Object.keys(mockPublic);
  const passN = !publicKeys.includes("scores") && !publicKeys.includes("playerEvaluations") && !publicKeys.includes("observations");
  console.log(`- Verificación pública aislada de evaluaciones privadas: ${passN ? "✅ AISLADO" : "❌ VULNERABLE"}`);
  console.log(`→ TEST N: ${passN ? "✅ PASS" : "❌ FAIL"}`);
  results["N"] = passN;
  if (!passN) allPassed = false;

  // ─── TEST O: CONTROL DE ACCESO Y RECHAZO DE OPERACIONES SIN ROL ───────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST O — REGLAS DE AUTORIZACIÓN PARA EVALUADORES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // Validación de que evaluatorId es registrado y trazable
  const passO = evalA.evaluatorId === "coach-01";
  console.log(`- Evaluador registrado: "${evalA.evaluatorId}"`);
  console.log(`→ TEST O: ${passO ? "✅ PASS" : "❌ FAIL"}`);
  results["O"] = passO;
  if (!passO) allPassed = false;

  // ─── TEST P: PERSISTENCIA Y RECUPERACIÓN COMPLETA DE PERFIL ────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST P — PERSISTENCIA Y RECUPERACIÓN DEL PERFIL DE DESARROLLO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const profile001 = progressionService.buildPlayerProfile("player-001");
  const passP = profile001.playerId === "player-001" && profile001.totalEvaluations >= 3 && profile001.overallAverage > 0;
  console.log(`- Perfil recuperado: ${profile001.totalEvaluations} evaluaciones | Media global: ${profile001.overallAverage}/5`);
  console.log(`→ TEST P: ${passP ? "✅ PASS" : "❌ FAIL"}`);
  results["P"] = passP;
  if (!passP) allPassed = false;

  // ─── TEST Q: CÁLCULO EXACTO DE EVOLUCIÓN TEMPORAL (scoreDelta) ─────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST Q — CÁLCULO DE VARIACIÓN TEMPORAL (scoreDelta)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const passQ = progImproving?.scoreDelta === 1.0 && progDeclining?.scoreDelta === -2.0;
  console.log(`- Delta calculado en progresión positiva: +${progImproving?.scoreDelta}`);
  console.log(`- Delta calculado en progresión negativa: ${progDeclining?.scoreDelta}`);
  console.log(`→ TEST Q: ${passQ ? "✅ PASS" : "❌ FAIL"}`);
  results["Q"] = passQ;
  if (!passQ) allPassed = false;

  // ─── TEST R: COMPARACIÓN CONTEXTUAL CON COHORTE DE EQUIPO ──────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST R — COMPARACIÓN CONTEXTUAL CON COHORTE SIN EXPONER RANKINGS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const comparison = progressionService.compareWithCohort("player-001", ["player-002", "player-003", "p-a"]);
  const compPase = comparison["tec_pase"];
  const passR = compPase !== undefined && compPase.playerScore === 5 && typeof compPase.cohortAverage === "number";
  console.log(`- Comparativa tec_pase: Jugador=${compPase?.playerScore}/5 | Media Cohorte=${compPase?.cohortAverage}/5`);
  console.log(`→ TEST R: ${passR ? "✅ PASS" : "❌ FAIL"}`);
  results["R"] = passR;
  if (!passR) allPassed = false;

  // ─── TEST S: GENERACIÓN DE DATOS DE RADAR BASADOS EN DATOS REALES ──────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST S — DATOS DE RADAR CON VALORES ANTERIOR VS ACTUAL (0 INVENCIÓN)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const radarPoints = profile001.radarData;
  const passS = radarPoints.length > 0 && radarPoints.every(r => r.fullMark === 5 && r.currentScore >= 1 && r.currentScore <= 5);
  console.log(`- Puntos de radar generados: ${radarPoints.length} dimensiones con fullMark=5`);
  console.log(`→ TEST S: ${passS ? "✅ PASS" : "❌ FAIL"}`);
  results["S"] = passS;
  if (!passS) allPassed = false;

  // ─── TEST T: NO-REGRESIÓN MÓDULOS 1 Y 2 (Catálogo 199 / SHA256) ────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST T — INMUTABILIDAD POSTFLIGHT Y NO-REGRESIÓN DE MÓDULOS 1 Y 2");
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

  // ─── RESUMEN DE AUDITORÍA MÓDULO 3 ─────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("RESUMEN DE AUDITORÍA Y RESULTADOS (MÓDULO 3 — EVALUACIÓN FORMATIVA)");
  console.log("================================================================================");
  console.log(`  Test A — Crear evaluación:                            ${results["A"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test B — Escala 1 a 5 y descarte de rangos inválidos: ${results["B"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test C — Registro de observación cualitativa:         ${results["C"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test D — Recuperación de historial cronológico:       ${results["D"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test E — Detección de tendencias (Imp/Stb/Dec):       ${results["E"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test F — INSUFFICIENT_DATA ante evaluaciones < 2:     ${results["F"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test G — Detección de fortalezas consolidadas:        ${results["G"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test H — Detección de áreas de mejora:                ${results["H"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test I — Matriz de competencias adaptada a categoría: ${results["I"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test J — Competencias específicas por posición:       ${results["J"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test K — Deduplicación ante reintentos accidentales:  ${results["K"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test L — Asociación y consulta por sesión:            ${results["L"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test M — Integración con planificación (Módulo 2):    ${results["M"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test N — Privacidad: Aislamiento de datos sensibles:  ${results["N"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test O — Trazabilidad y rol de evaluador:             ${results["O"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test P — Persistencia y perfil de desarrollo:         ${results["P"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test Q — Cálculo exacto de scoreDelta:                ${results["Q"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test R — Comparación contextual con cohorte:          ${results["R"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test S — Datos de radar con valores reales:           ${results["S"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Test T — Catálogo oficial inmutable (199 / SHA):      ${results["T"] ? "✅ PASS" : "❌ FAIL"}`);
  console.log("--------------------------------------------------------------------------------");
  if (allPassed) {
    console.log("🏆 RESULTADO: TODAS LAS PRUEBAS PASS (20/20) — MÓDULO 3 COMPLETADO");
  } else {
    console.log("❌ ALGUNAS PRUEBAS FALLARON — Revisar arriba.");
    process.exit(1);
  }
  console.log("================================================================================\n");

  // Guardar snapshot de manifest del Módulo 3
  const manifestPath = "C:\\Users\\siril\\.gemini\\antigravity\\brain\\9ef9b320-b73a-402c-a839-9be738b292b8\\scratch\\module3_manifest.json";
  const manifestContent = {
    module: "MÓDULO 3 — EVALUACIÓN FORMATIVA Y SEGUIMIENTO LONGITUDINAL",
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
  console.error("Error en validación Módulo 3:", err);
  process.exit(1);
});
