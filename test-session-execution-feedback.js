/**
 * TESTS UNITARIOS DE FEEDBACK DE EJECUCIÓN (FASE 5.4)
 * Antigravity Methodology OS
 */

console.log("================================================================================");
console.log("FASE 5.4 — TESTS DE FEEDBACK PLANIFICADO VS EJECUTADO Y DESVIACIONES");
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

function runTests() {
  const baseSession = {
    id: "sess-1",
    duration_minutes: 90,
    num_players: 16,
    intensity_load: 3,
    objective: "Salida de balón",
    microcycleDay: "MD-3"
  };

  console.log("--- 1. Sesión sin evaluación registrada ---");
  const resNoEval = calculatePlannedVsExecutedFeedback({ session: baseSession });
  assert(resNoEval.dataQuality.isEvaluated === false, "Sin evaluación: isEvaluated === false");
  assert(resNoEval.executed.sessionRpe === null, "Sin evaluación: RPE === null");
  assert(resNoEval.methodologyImpact.achievementLevel === 'no_evaluado', "Sin evaluación: achievementLevel === 'no_evaluado'");

  console.log("\n--- 2. Desviación temporal: Delta = 0 (Óptimo) ---");
  const resDelta0 = calculatePlannedVsExecutedFeedback({
    session: baseSession,
    evaluation: { actualDurationMin: 90, sessionRpe: 6, objectiveAchievement: 3.5, playersPresentCount: 16 }
  });
  assert(resDelta0.deviations.durationDiffMin === 0, "Delta 0: durationDiffMin === 0");
  assert(resDelta0.deviations.durationAlert === 'optimal', "Delta 0: durationAlert === 'optimal'");
  assert(resDelta0.deviations.isDurationDeviationSevere === false, "Delta 0: isDurationDeviationSevere === false");

  console.log("\n--- 3. Desviación temporal: 0 < |Delta| <= 15 (Moderado) ---");
  const resDelta10 = calculatePlannedVsExecutedFeedback({
    session: baseSession,
    evaluation: { actualDurationMin: 100, sessionRpe: 7, objectiveAchievement: 3.0, playersPresentCount: 15 }
  });
  assert(resDelta10.deviations.durationDiffMin === 10, "Delta 10: durationDiffMin === 10");
  assert(resDelta10.deviations.durationAlert === 'moderate', "Delta 10: durationAlert === 'moderate'");
  assert(resDelta10.deviations.isDurationDeviationSevere === false, "Delta 10: no es severo");

  console.log("\n--- 4. Desviación temporal: |Delta| > 15 (Severo) ---");
  const resDelta25 = calculatePlannedVsExecutedFeedback({
    session: baseSession,
    evaluation: { actualDurationMin: 115, sessionRpe: 8, objectiveAchievement: 2.0, playersPresentCount: 14 }
  });
  assert(resDelta25.deviations.durationDiffMin === 25, "Delta 25: durationDiffMin === 25");
  assert(resDelta25.deviations.durationAlert === 'severe', "Delta 25: durationAlert === 'severe'");
  assert(resDelta25.deviations.isDurationDeviationSevere === true, "Delta 25: isDurationDeviationSevere === true");

  console.log("\n--- 5. Alertas de RPE y Consecución ---");
  const resHighRpe = calculatePlannedVsExecutedFeedback({
    session: baseSession,
    evaluation: { actualDurationMin: 90, sessionRpe: 9, objectiveAchievement: 1.8, playersPresentCount: 16 }
  });
  assert(resHighRpe.deviations.rpeAlert === 'excessive', "RPE 9: rpeAlert === 'excessive'");
  assert(resHighRpe.deviations.isRpeExcessive === true, "RPE 9: isRpeExcessive === true");
  assert(resHighRpe.deviations.achievementAlert === 'critical', "Consecución 1.8: achievementAlert === 'critical'");

  console.log("\n================================================================================");
  console.log("RESULTADO FASE 5.4 TESTS EJECUCIÓN FEEDBACK: " + passed + " PASADOS, " + failed + " FALLADOS");
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
