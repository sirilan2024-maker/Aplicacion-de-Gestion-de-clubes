/**
 * TESTS DE ROBUSTEZ Y FALLBACK DEL PROVEEDOR IA (FASE 5.7)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.7 — TESTS DE ROBUSTEZ Y FALLBACK ANTE CAÍDA DE IA");
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

async function runTests() {
  const providerWithoutKey = new MethodologyAIProvider(null); // Sin API key -> Forzará fallback determinista

  const mockClub = { id: "club-1", name: "Sporting Saladar" };
  const mockTeam = { id: "t1", name: "Cadete A", category: "cadete" };

  console.log("--- 1. Fallback Determinista Operativo ante Proveedor no Disponible ---");
  const fallbackRes = await providerWithoutKey.askAssistant("¿Cuál es el estado del equipo?", {
    club: mockClub,
    team: mockTeam,
    scope: 'team',
    teamReport: { sampleSize: 4, summary: { avgObjectiveAchievement: 3.2, modelCoveragePercentage: 75 } }
  });

  assert(fallbackRes !== null && typeof fallbackRes.answer === 'string', "Fallback: Respuesta generada con éxito");
  assert(fallbackRes.facts.length > 0, "Fallback: Hechos presentes");
  assert(fallbackRes.dataSufficiency.sufficient === true, "Fallback: Suficiencia respetada con N>=3");

  console.log("\n--- 2. Manejo de Datos Incompletos y Vacíos en Fallback ---");
  const fallbackEmpty = await providerWithoutKey.askAssistant("Consulta", {
    club: mockClub,
    team: mockTeam,
    scope: 'team',
    teamReport: { sampleSize: 0, summary: {} }
  });

  assert(fallbackEmpty.dataSufficiency.sufficient === false, "Fallback vacío: dataSufficiency.sufficient === false");
  assert(fallbackEmpty.answer.includes("N < 3") || fallbackEmpty.answer.includes("insuficientes"), "Fallback vacío: Mensaje seguro ante datos incompletos");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.7 TESTS FALLBACK: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
