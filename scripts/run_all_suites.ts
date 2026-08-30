import { execSync } from "child_process";

const suites = [
  "scripts/verify_phase56.ts",
  "scripts/verify_phase57.ts",
  "scripts/verify_phase58.ts",
  "scripts/verify_phase59.ts",
  "scripts/verify_phase60.ts",
  "scripts/verify_phase61.ts",
  "scripts/verify_phase62.ts",
  "scripts/verify_phase63.ts",
  "scripts/verify_module2_planning.ts",
  "scripts/verify_module3_evaluation.ts",
  "scripts/verify_module4_team_intelligence.ts",
  "scripts/verify_module5_performance_intelligence.ts",
  "scripts/verify_module6_adaptive_planning.ts",
  "scripts/verify_module7_intelligence_center.ts",
  "scripts/verify_module8_operational_center.ts",
  "scripts/verify_final_production_e2e.ts",
  "scripts/verify_tag_contamination.ts",
  "scripts/verify_semantic_affinity.ts",
  "scripts/verify_tactical_precedence.ts",
  "scripts/validate_curriculo_quality_flow.ts",
  "scripts/evaluate_tactical_ground_truth.ts",
  "scripts/red_team_tactical_audit.ts",
  "scripts/mutation_testing_red_team.ts",
  "scripts/red_team_session_microcycle_audit.ts",
  "scripts/verify_deep_quality_audit.ts",
  "scripts/final_production_gate.ts"
];

console.log(`================================================================================`);
console.log(`EJECUTANDO REGRESIÓN COMPLETA DE PRODUCCIÓN (${suites.length} SUITES)`);
console.log(`================================================================================\n`);

let passedCount = 0;
const failures: string[] = [];

for (const suite of suites) {
  process.stdout.write(`- Ejecutando ${suite}... `);
  try {
    execSync(`npx tsx ${suite}`, { stdio: "pipe" });
    console.log(`✅ PASS`);
    passedCount++;
  } catch (err: any) {
    console.log(`❌ FAIL`);
    failures.push(suite);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
  }
}

console.log(`\n================================================================================`);
console.log(`RESUMEN GLOBAL DE SUITES: ${passedCount} / ${suites.length} PASS`);
console.log(`================================================================================`);

if (failures.length > 0) {
  console.error(`Suites fallidas:`, failures);
  process.exit(1);
} else {
  console.log(`🏆 TODAS LAS ${suites.length} SUITES ESTÁN EN 100% PASS.`);
}
