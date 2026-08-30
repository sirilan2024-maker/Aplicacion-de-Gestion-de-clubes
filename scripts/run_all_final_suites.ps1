echo "=== 1. AUDIT 9 PRINCIPLES QUALITY ==="
npx tsx scripts/audit_9_principles_quality.ts

echo "=== 2. VERIFY 1V1 TACTICAL QUALITY ==="
npx tsx scripts/verify_1v1_tactical_quality.ts

echo "=== 3. VERIFY PARSER CANONICAL ==="
npx tsx scripts/verify_parser_canonical.ts

echo "=== 4. VERIFY SELECTION BARRIER ==="
npx tsx scripts/verify_selection_barrier.ts

echo "=== 5. VERIFY METHODOLOGY COVERAGE ==="
npx tsx scripts/verify_methodology_coverage_285.ts

echo "=== 6. TEST METHODOLOGY SESSION GENERATOR ==="
node test-methodology-session-generator.js

echo "=== 7. VERIFY PREVENTIVE VALIDATION ==="
npx tsx scripts/verify_preventive_validation.ts
