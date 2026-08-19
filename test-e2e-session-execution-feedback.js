/**
 * TESTS E2E DE FEEDBACK PLANIFICADO VS EJECUTADO (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS E2E DE COMPARACIÓN PLANIFICADO VS EJECUTADO");
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

const { calculatePlannedVsExecutedFeedback } = require("./src/lib/methodology/sessionExecutionFeedbackService");

function runE2EFeedbackTests() {
  const session = {
    id: "sess-e2e-1",
    duration_minutes: 90,
    num_players: 16,
    intensity_load: 3,
    objective: "Presión alta",
    microcycleDay: "MD-3"
  };

  const attendance = [
    { playerId: "p1", status: "present" },
    { playerId: "p2", status: "present" },
    { playerId: "p3", status: "absent" }
  ];

  const evaluation = {
    actualDurationMin: 105, // Delta = +15 (moderada)
    sessionRpe: 8,
    objectiveAchievement: 2.2,
    playersPresentCount: 15,
    behaviours: [
      { behaviourDescription: "Presión coordinada", score: 2.0 },
      { behaviourDescription: "Cobertura de pase", score: 3.5 }
    ]
  };

  const result = calculatePlannedVsExecutedFeedback({ session, evaluation, attendance });

  assert(result.deviations.durationDiffMin === 15, "E2E Feedback: Delta de duración calculado (+15 min)");
  assert(result.deviations.durationAlert === "moderate", "E2E Feedback: Clasificación de duración moderada");
  assert(result.deviations.isRpeExcessive === true, "E2E Feedback: Alerta de RPE excesivo activada");
  assert(result.methodologyImpact.lowScoringBehavioursCount === 1, "E2E Feedback: 1 comportamiento con baja puntuación detectado");
  assert(result.methodologyImpact.highScoringBehavioursCount === 1, "E2E Feedback: 1 comportamiento con alta puntuación detectado");
  assert(result.dataQuality.hasAttendanceRecorded === true, "E2E Feedback: Asistencia registrada confirmada");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS E2E FEEDBACK: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EFeedbackTests();
