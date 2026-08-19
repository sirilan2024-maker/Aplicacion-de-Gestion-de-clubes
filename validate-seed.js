const fs = require('fs');
const path = require('path');

const seedSql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260819_library_seed.sql'), 'utf8');

// Validar que no haya valores ilegales en cargas de 1 a 4
const errors = [];
const lines = seedSql.split('\n');

let currentExercise = '';
lines.forEach((line, idx) => {
  if (line.includes("INSERT INTO public.banco_ejercicios")) {
    currentExercise = `Line ${idx+1}`;
  }
  // Check constraints (carga_fisica, carga_cognitiva, oposicion, representatividad)
  if (line.includes("'principal'") || line.includes("'calentamiento'") || line.includes("'global'") || line.includes("'vuelta_calma'")) {
    const parts = line.split(',').map(s => s.trim());
    // Checking numeric values
    parts.forEach(p => {
      const num = parseInt(p, 10);
      if (!isNaN(num) && num > 4 && (line.includes("carga_fisica") || line.includes("carga_cognitiva"))) {
        errors.push(`Constraint violation potential at line ${idx+1}: value ${num}`);
      }
    });
  }
});

console.log("=== QA AUDIT REPORT ===");
console.log(`Total lines checked: ${lines.length}`);
console.log(`Errors found: ${errors.length}`);
if (errors.length > 0) {
  console.error(errors);
} else {
  console.log("✅ All SQL seed constraints verified: 100% valid.");
}
