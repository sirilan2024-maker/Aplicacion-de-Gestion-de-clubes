/**
 * TESTS DE COMPORTAMIENTO IA EN CONDICIONES DEL PILOTO (FASE 5.8)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.8 — TESTS DE COMPORTAMIENTO Y VALIDACIÓN IA DEL PILOTO");
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

const { MethodologyAIProvider } = require("./src/lib/methodology/ai/methodologyAIProvider");
const { auditAIResponseQuality } = require("./src/lib/methodology/ai/methodologyAIQualityService");

async function runAIPilotTests() {
  const provider = new MethodologyAIProvider(null);

  const mockClub = { id: "club-1", name: "Sporting Saladar" };
  const mockTeam = { id: "t1", name: "Cadete A", category: "cadete" };

  console.log("--- 1. Consulta IA con Datos Suficientes (N >= 3) ---");
  const aiResN4 = await provider.askAssistant("Diagnóstico semanal", {
    club: mockClub,
    team: mockTeam,
    scope: 'team',
    teamReport: { sampleSize: 4, summary: { avgObjectiveAchievement: 3.1, modelCoveragePercentage: 75 } }
  });

  const auditN4 = auditAIResponseQuality(aiResN4);
  assert(auditN4.isCompliant === true, "IA Piloto: Auditoría de calidad conforme al 100%");
  assert(aiResN4.dataSufficiency.sufficient === true, "IA Piloto: Suficiencia de datos reconocida");

  console.log("\n--- 2. Consulta IA con Datos Insuficientes (N < 3) ---");
  const aiResN1 = await provider.askAssistant("Diagnóstico semanal", {
    club: mockClub,
    team: mockTeam,
    scope: 'team',
    teamReport: { sampleSize: 1, summary: { avgObjectiveAchievement: 2.0, modelCoveragePercentage: 20 } }
  });

  assert(aiResN1.dataSufficiency.sufficient === false, "IA Piloto N<3: Suficiencia de datos bloqueada");
  assert(aiResN1.answer.includes("N < 3") || aiResN1.answer.includes("insuficientes"), "IA Piloto N<3: Mensaje transparente al usuario");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.8 TESTS IA PILOTO: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runAIPilotTests();
