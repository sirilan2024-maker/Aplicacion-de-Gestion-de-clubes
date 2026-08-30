process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { sessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { 
  generateMethodologySessionProposal, 
  regenerateMethodologyBlock 
} from "../src/lib/methodology/methodologySessionGenerator";
import { 
  scoreExercise, 
  recommendExercises, 
  isExerciseSelectableForBlock 
} from "../src/lib/methodology/recommendationEngine";

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, details?: string) {
  if (cond) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name} ${details ? "-> " + details : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("TESTS UNITARIOS DE BARRERA METODOLÓGICA DE SELECCIONABILIDAD");
  console.log("================================================================================\n");

  // Mock catalog with controlled exercises
  const invalidExercise = {
    id: "invalid-drill-1",
    nombre: "Ejercicio Totalmente Incompatible",
    age_category: "querubin",
    categoria_edad: ["querubin"],
    tipo: "juego_global",
    bloque_sesion: "global",
    objetivo_tactico: ["concepto_irrelevante_opuesto"],
    objetivo_tecnico: ["tiro"],
    carga_fisica: 4,
    carga_cognitiva: 4,
    oposicion: 4,
    representatividad: 4,
    dificultad: 4
  };

  const validActivacion = {
    id: "valid-act-1",
    nombre: "Rondo de Activación 4v2",
    age_category: "senior",
    categoria_edad: ["senior"],
    tipo: "rondo",
    bloque_sesion: "calentamiento",
    objetivo_tactico: ["Conservación", "Circulación"],
    objetivo_tecnico: ["Pase", "Control"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    representatividad: 2,
    dificultad: 2
  };

  const validPrincipal1 = {
    id: "valid-p1-1",
    nombre: "Juego de Posición 6v4 Presión Alta",
    age_category: "senior",
    categoria_edad: ["senior"],
    tipo: "juego_medio",
    bloque_sesion: "principal",
    objetivo_tactico: ["Presión Alta", "Acoso"],
    objetivo_tecnico: ["Pase"],
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    representatividad: 3,
    dificultad: 3
  };

  const validCooldown = {
    id: "valid-calm-1",
    nombre: "Rueda de Pases y Regeneración",
    age_category: "senior",
    categoria_edad: ["senior"],
    tipo: "analitico",
    bloque_sesion: "vuelta_calma",
    objetivo_tactico: ["Recuperación"],
    objetivo_tecnico: ["Pase suave"],
    carga_fisica: 1,
    carga_cognitiva: 1,
    oposicion: 1,
    representatividad: 1,
    dificultad: 1
  };

  // ─── TEST 1: Un ejercicio con pertinencia inválida NO puede ser seleccionado ──────────
  console.log("--- TEST 1: Bloqueo de ejercicio metodológicamente inválido ---");
  const scoreInv = scoreExercise(invalidExercise, {
    category: "senior",
    objective: "Presión Alta",
    targetBlock: "principal_1",
    numPlayers: 18,
    durationMinutes: 20,
    microcycleDay: "MD-4",
    intensityLoad: 4
  });
  assert(!isExerciseSelectableForBlock(scoreInv), "isExerciseSelectableForBlock rechaza ejercicio incompatible con objetivo y categoría");

  const recs = recommendExercises([invalidExercise], {
    category: "senior",
    objective: "Presión Alta",
    targetBlock: "principal_1",
    numPlayers: 18,
    durationMinutes: 20,
    microcycleDay: "MD-4",
    intensityLoad: 4
  });
  assert(recs.length === 0, "recommendExercises devuelve lista vacía si los ejercicios son inválidos");

  // ─── TEST 2: Un ejercicio que falla la barrera NO puede entrar mediante secondaryCandidates ───
  console.log("\n--- TEST 2: Bloqueo de bypass por secondaryCandidates ---");
  const secondaryIncompatible = {
    id: "sec-incompatible",
    nombre: "Ejercicio sin afinidad con el bloque",
    age_category: "senior",
    categoria_edad: ["senior"],
    tipo: "juego_global",
    bloque_sesion: "global",
    objetivo_tactico: ["Contraataque"],
    carga_fisica: 4,
    oposicion: 4
  };

  const planRes = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, [secondaryIncompatible]);

  const drillsWithoutValidCandidates = planRes.session.drills.filter(d => d.exercise?.id === secondaryIncompatible.id);
  assert(drillsWithoutValidCandidates.length === 0, "Ejercicio incompatible no entra por secondaryCandidates");

  // ─── TEST 3: Un ejercicio que falla la barrera NO puede entrar mediante fallback ──────
  console.log("\n--- TEST 3: Bloqueo de bypass por fallback al catálogo ---");
  const onlyInvalidCatalog = [invalidExercise];
  const planOnlyInv = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, onlyInvalidCatalog);

  const selectedInvDrills = planOnlyInv.session.drills.filter(d => d.exercise?.id === invalidExercise.id);
  assert(selectedInvDrills.length === 0, "Ningún ejercicio inválido fue seleccionado como fallback arbitrario", `Seleccionados: ${selectedInvDrills.length}`);

  // ─── TEST 4: Un ejercicio que falla la barrera NO puede entrar mediante regenerateMethodologyBlock() ─
  console.log("\n--- TEST 4: Bloqueo en regeneración parcial ---");
  const initialProposal = generateMethodologySessionProposal({
    teamId: "team-1",
    category: "senior",
    objective: "Presión Alta",
    durationMinutes: 90,
    numPlayers: 18,
    microcycleDay: "MD-4",
    intensityLoad: 4,
    allExercises: [validActivacion, validPrincipal1, validCooldown]
  });

  const regeneratedProposal = regenerateMethodologyBlock(
    initialProposal,
    "principal_1",
    {
      teamId: "team-1",
      category: "senior",
      objective: "Presión Alta",
      durationMinutes: 90,
      numPlayers: 18,
      microcycleDay: "MD-4",
      intensityLoad: 4,
      allExercises: [invalidExercise] // Solo ejercicio inválido disponible
    }
  );

  assert(
    regeneratedProposal.blocks["principal_1"]?.exercise?.id !== invalidExercise.id,
    "regenerateMethodologyBlock no introduce el ejercicio inválido"
  );

  // ─── TEST 5: Si existe un candidato válido y otro inválido, siempre se selecciona el válido ──
  console.log("\n--- TEST 5: Selección preferente de candidato válido ---");
  const mixedPool = [invalidExercise, validPrincipal1];
  const recsMixed = recommendExercises(mixedPool, {
    category: "senior",
    objective: "Presión Alta",
    targetBlock: "principal_1",
    numPlayers: 18,
    durationMinutes: 20,
    microcycleDay: "MD-4",
    intensityLoad: 4
  });

  assert(recsMixed.length === 1 && recsMixed[0].exercise.id === validPrincipal1.id, "recommendExercises selecciona exclusivamente el candidato válido");

  // ─── TEST 6: Si no existe ningún candidato válido, NO se selecciona arbitrariamente el primero/último ───
  console.log("\n--- TEST 6: Rechazo honesto ante catálogo sin candidatos válidos ---");
  const emptyProposal = generateMethodologySessionProposal({
    teamId: "team-1",
    category: "senior",
    objective: "Presión Alta",
    durationMinutes: 90,
    numPlayers: 18,
    microcycleDay: "MD-4",
    intensityLoad: 4,
    allExercises: [invalidExercise] // Catálogo sin ningún candidato apropiado
  });

  const selectedInEmpty = Object.values(emptyProposal.blocks).filter(b => b.exercise !== null);
  assert(selectedInEmpty.length === 0, "No se seleccionó arbitrariamente el primer o último ejercicio al no haber candidatos válidos");

  // ─── TEST 7: La deduplicación y exclusiones siguen funcionando ──────────────
  console.log("\n--- TEST 7: Deduplicación y exclusiones ---");
  const planExcl = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    excludedObjectives: ["Conservación"],
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18
  }, [validActivacion, validPrincipal1, validCooldown]);

  const hasExcluded = planExcl.session.drills.some(d => (d.exercise?.objetivo_tactico || []).includes("Conservación"));
  assert(!hasExcluded, "Exclusiones respetadas: ejercicio con 'Conservación' excluido");

  // ─── TEST 8: Ejercicios externos respetan sus filtros ────────────────────────
  console.log("\n--- TEST 8: Filtro de verificación de ejercicios externos ---");
  const extUnverified = {
    id: "ext-unverified-1",
    title: "Drill Externo No Verificado",
    source: "web_unverified",
    verificationStatus: "UNVERIFIED",
    dominantObjective: "Presión Alta"
  };
  const planExtReq = await sessionPlannerService.generateSession({
    primaryObjective: "Presión Alta",
    ageCategory: "senior",
    durationMinutes: 90,
    players: 18,
    requireVerifiedOnly: true,
    requestedExternalCount: 1
  }, [validActivacion, validPrincipal1, validCooldown]);

  const hasUnverifiedExt = planExtReq.session.drills.some(d => d.exercise?.id === extUnverified.id);
  assert(!hasUnverifiedExt, "Ejercicios externos respetan filtro requireVerifiedOnly");

  console.log("\n================================================================================");
  console.log(`RESUMEN DE BARRERA METODOLÓGICA: ${passed} PASADOS | ${failed} FALLADOS`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Error fatal en tests de barrera:", err);
  process.exit(1);
});
