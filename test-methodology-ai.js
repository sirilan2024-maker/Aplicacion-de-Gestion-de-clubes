/**
 * TESTS DE IA METODOLÓGICA ASISTIDA (FASE 5.1)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.1 — TESTS DE LA CAPA DE IA METODOLÓGICA ASISTIDA");
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

const { buildClubDirectionAIContext, buildTeamAIContext } = require("./src/lib/methodology/ai/methodologyAIContextBuilder");
const { MethodologyAIProvider } = require("./src/lib/methodology/ai/methodologyAIProvider");

async function runTests() {
  console.log("--- 1. Construcción de Contexto Estructurado ---");
  const mockClub = { id: "club-1", name: "Sporting Saladar" };
  const mockSeason = { id: "season-1", name: "2026-27" };
  const mockReports = [
    {
      team: { id: "t1", name: "Cadete A", category: "cadete" },
      statusDetail: { status: "solido", statusLabel: "Sólido" },
      summary: { avgObjectiveAchievement: 3.4, avgRpe: 6.2, modelCoveragePercentage: 85, evaluatedSessions: 8, totalSessions: 8 },
      alerts: []
    },
    {
      team: { id: "t2", name: "Infantil B", category: "infantil" },
      statusDetail: { status: "atencion", statusLabel: "Atención" },
      summary: { avgObjectiveAchievement: 1.9, avgRpe: 8.8, modelCoveragePercentage: 35, evaluatedSessions: 4, totalSessions: 6 },
      alerts: [{ message: "Baja consecución de objetivos", severity: "high" }]
    },
    {
      team: { id: "t3", name: "Alevín C", category: "alevin" },
      statusDetail: { status: "datos_insuficientes", statusLabel: "Datos Insuficientes" },
      summary: { avgObjectiveAchievement: 2.5, avgRpe: 6.0, modelCoveragePercentage: 0, evaluatedSessions: 1, totalSessions: 2 },
      alerts: []
    }
  ];

  const ctxClub = buildClubDirectionAIContext({
    club: mockClub,
    season: mockSeason,
    reports: mockReports,
    globalKpis: null,
    transversalAlerts: [{ teamId: "t2", teamName: "Infantil B", severity: "high", message: "Alerta", metric: "RPE" }]
  });

  assert(ctxClub.scope === "club_direction", "Contexto de Dirección: scope correcto");
  assert(ctxClub.teamsOverview.length === 3, "Contexto de Dirección: contiene 3 equipos");
  assert(ctxClub.globalKpis.attentionTeams === 1, "Contexto de Dirección: calcula 1 equipo en atención");
  assert(ctxClub.globalKpis.insufficientDataTeams === 1, "Contexto de Dirección: identifica 1 equipo con N<3");

  console.log("\n--- 2. IA Provider: Análisis de Dirección Deportiva (Fallback/Deterministic) ---");
  const aiProvider = new MethodologyAIProvider("mock-key-trigger-offline");
  const clubRes = await aiProvider.generateDeterministicAnalysis("¿Cómo está el club?", ctxClub);

  assert(typeof clubRes.answer === "string" && clubRes.answer.length > 0, "Respuesta: answer presente");
  assert(Array.isArray(clubRes.facts) && clubRes.facts.length > 0, "Separación: facts presentes");
  assert(Array.isArray(clubRes.interpretations) && clubRes.interpretations.length > 0, "Separación: interpretations presentes");
  assert(Array.isArray(clubRes.recommendations) && clubRes.recommendations.length > 0, "Separación: recommendations presentes");
  assert(Array.isArray(clubRes.evidence) && clubRes.evidence.length === 3, "Trazabilidad: evidencias presentes por equipo");
  assert(clubRes.dataSufficiency.sufficient === true, "Suficiencia: club con equipos es suficiente");

  console.log("\n--- 3. Regla N < 3 y Datos Insuficientes en Equipo ---");
  const ctxTeamN1 = buildTeamAIContext({
    club: mockClub,
    team: { id: "t3", name: "Alevín C", category: "alevin" },
    season: mockSeason,
    report: { summary: { evaluatedSessions: 1, avgObjectiveAchievement: 2.5, modelCoveragePercentage: 20 } }
  });

  const teamResN1 = await aiProvider.generateDeterministicAnalysis("¿Cómo evoluciona este equipo?", ctxTeamN1);
  assert(teamResN1.dataSufficiency.sufficient === false, "N=1: dataSufficiency.sufficient = false");
  assert(teamResN1.dataSufficiency.notice.includes("N < 3"), "N=1: notice explícito de N < 3");
  assert(teamResN1.answer.toLowerCase().includes("insuficientes"), "N=1: respuesta explícita de datos insuficientes");

  const ctxTeamN4 = buildTeamAIContext({
    club: mockClub,
    team: { id: "t1", name: "Cadete A", category: "cadete" },
    season: mockSeason,
    report: { summary: { evaluatedSessions: 4, avgObjectiveAchievement: 3.4, modelCoveragePercentage: 85 } }
  });

  const teamResN4 = await aiProvider.generateDeterministicAnalysis("¿Cómo evoluciona?", ctxTeamN4);
  assert(teamResN4.dataSufficiency.sufficient === true, "N=4: dataSufficiency.sufficient = true");

  console.log("\n--- 4. Aislamiento Multi-Tenant ---");
  const ctxClubA = buildClubDirectionAIContext({ club: { id: "club-A", name: "Club A" }, season: mockSeason, reports: [mockReports[0]] });
  const ctxClubB = buildClubDirectionAIContext({ club: { id: "club-B", name: "Club B" }, season: mockSeason, reports: [mockReports[1]] });

  assert(ctxClubA.club.id === "club-A" && ctxClubB.club.id === "club-B", "Multi-tenant: IDs aislados");
  assert(ctxClubA.teamsOverview.every(t => t.teamId === "t1"), "Multi-tenant: Club A solo tiene sus equipos");
  assert(ctxClubB.teamsOverview.every(t => t.teamId === "t2"), "Multi-tenant: Club B solo tiene sus equipos");

  console.log("\n--- 5. Cero Persistencia y Contrato Consultivo ---");
  let writesIntercepted = 0;
  const origFetch = global.fetch;
  global.fetch = function(...args) {
    const method = (args[1]?.method || "GET").toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      writesIntercepted++;
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  await aiProvider.generateDeterministicAnalysis("Consulta", ctxClub);
  await aiProvider.generateDeterministicAnalysis("Consulta", ctxTeamN4);
  assert(writesIntercepted === 0, "Persistencia: 0 escrituras interceptadas durante consulta IA");

  if (origFetch) global.fetch = origFetch;

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.1 TESTS IA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
