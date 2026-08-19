/**
 * TESTS DE FEEDBACK POST-SESIÓN CON IA (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS DE FEEDBACK METODOLÓGICO POST-SESIÓN IA");
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

const { generatePostSessionFeedback } = require("./src/lib/methodology/ai/methodologyAIPostSessionService");

function runTests() {
  const session = {
    id: "sess-100",
    objective: "Presión alta y basculación",
    microcycleDay: "MD-3",
    duration_minutes: 90,
    num_players: 16
  };

  console.log("--- 1. Feedback estructurado Facts/Interpretations/Recommendations/Evidence ---");
  const fb = generatePostSessionFeedback({
    session,
    evaluation: {
      actualDurationMin: 95,
      sessionRpe: 8.5,
      objectiveAchievement: 2.1,
      playersPresentCount: 16,
      behaviours: [{ score: 2.0 }]
    },
    history: [{ id: "s1" }, { id: "s2" }, { id: "s3" }]
  });

  assert(Array.isArray(fb.facts) && fb.facts.length > 0, "Post-Session IA: facts presentes");
  assert(Array.isArray(fb.interpretations) && fb.interpretations.length > 0, "Post-Session IA: interpretations presentes");
  assert(Array.isArray(fb.recommendations) && fb.recommendations.length > 0, "Post-Session IA: recommendations presentes");
  assert(Array.isArray(fb.evidence) && fb.evidence.length > 0, "Post-Session IA: evidence presente");
  assert(fb.dataSufficiency.sufficient === true, "Post-Session IA: N>=3 dataSufficiency.sufficient === true");

  console.log("\n--- 2. Generación de Action Proposals post-sesión ---");
  assert(Array.isArray(fb.actionProposals) && fb.actionProposals.length > 0, "Post-Session IA: genera propuestas ante RPE alto / baja consecución");
  assert(fb.actionProposals[0].requiresHumanConfirmation === true, "Post-Session IA: propuesta exige confirmación humana");

  console.log("\n--- 3. Regla N < 3 en Feedback Post-Sesión ---");
  const fbN1 = generatePostSessionFeedback({
    session,
    evaluation: { actualDurationMin: 90, sessionRpe: 6, objectiveAchievement: 3.0 },
    history: [] // N=1 total
  });
  assert(fbN1.dataSufficiency.sufficient === false, "N=1: dataSufficiency.sufficient === false");
  assert(fbN1.dataSufficiency.notice.includes("N < 3"), "N=1: notice explícito de N < 3");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS POST-SESIÓN IA: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
