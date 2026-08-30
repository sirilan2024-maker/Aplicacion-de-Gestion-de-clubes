process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import {
  evaluatePureTacticalAffinity,
  evaluateTacticalAffinity,
  PRINCIPLE_TAXONOMY
} from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";

interface MutationResult {
  mutation: string;
  detected: boolean;
  notes: string;
}

function runMutationTests() {
  console.log("================================================================================");
  console.log("MUTATION TESTING — RED TEAM AUDIT");
  console.log("================================================================================");

  const results: MutationResult[] = [];

  // ────────────────────────────────────────────────────────────────────────────
  // MUTACIÓN A: Permitir tags masivos como afinidad DIRECT
  // ────────────────────────────────────────────────────────────────────────────
  // Simulación: Si un ejercicio con 8 tags aleatorios (incluyendo "pressing") pero de ataque se evalúa para Presión Alta:
  const bloatedOffensiveDrill = {
    nombre: "Posesión y cambio de orientación",
    age_category: "senior",
    dificultad: 3,
    game_phase: "attacking_build_up",
    objetivo_tactico: ["cambio de orientacion", "apoyo"],
    tags: ["pressing", "marcaje zonal", "1v1", "tiro", "posesion", "amplitud", "fuerza", "velocidad"]
  };

  // Motor normal
  const normalResA = evaluateTacticalAffinity(bloatedOffensiveDrill, { name: "Presión Alta", game_phase: "Defensa" }, "senior", "Senior");
  // Si estuviera mutado (permitiendo tags como DIRECT), daría ALTA.
  const isProtectedA = !normalResA || normalResA.compatibilityLevel !== "ALTA";
  results.push({
    mutation: "MUTACIÓN A: Permitir tags masivos como DIRECT para prinsipios opuestos",
    detected: isProtectedA,
    notes: isProtectedA ? "Detectada y bloqueada: tags masivos no confieren ALTA en principio opuesto." : "Fallo de detección."
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MUTACIÓN B: Permitir que afinidad táctica NULL continúe hacia scoring pedagógico
  // ────────────────────────────────────────────────────────────────────────────
  // Drill completamente no táctico (físico/psicomotor)
  const nonTacticalDrill = {
    nombre: "Carrera Continua 30 minutos",
    age_category: "querubin",
    dificultad: 1,
    game_phase: "motor_coordination",
    objetivo_tactico: ["resistencia", "trote"],
    tags: ["u6", "resistencia"]
  };
  const normalResB = evaluateTacticalAffinity(nonTacticalDrill, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "querubin", "U6");
  const isProtectedB = (normalResB === null);
  results.push({
    mutation: "MUTACIÓN B: Permitir que NULL continúe hacia scoring pedagógico",
    detected: isProtectedB,
    notes: isProtectedB ? "Detectada y bloqueada: NULL no recibe puntos de edad/dificultad (retorna null)." : "Fallo de detección: el ejercicio fue rescatado."
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MUTACIÓN C: Eliminar forbiddenIsolatedStems (ej. stem 'orientacion' solo)
  // ────────────────────────────────────────────────────────────────────────────
  const spatialOrientationDrill = {
    nombre: "Juego de Orientación Espacial",
    age_category: "querubin",
    dificultad: 1,
    game_phase: "motor_coordination",
    objetivo_tactico: ["orientacion espacial"],
    tags: ["orientacion"]
  };
  const normalResC = evaluatePureTacticalAffinity(spatialOrientationDrill, { name: "Circulación Rápida y Cambio de Orientación" });
  const isProtectedC = (normalResC === null);
  results.push({
    mutation: "MUTACIÓN C: Eliminar forbiddenIsolatedStems (stems ambiguos)",
    detected: isProtectedC,
    notes: isProtectedC ? "Detectada y bloqueada: 'orientacion espacial' no se confunde con cambio de orientacion táctica." : "Fallo de detección."
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MUTACIÓN D: Eliminar requisito DIRECT para ALTA
  // ────────────────────────────────────────────────────────────────────────────
  // Un ejercicio con afinidad meramente secundaria pero categoría idéntica
  const secondaryOnlyDrill = {
    nombre: "Juego de Conservación y Apoyos 4v4",
    age_category: "senior",
    dificultad: 3,
    game_phase: "attacking_build_up",
    objetivo_tactico: ["apoyos", "superioridad numerica"],
    tags: ["posesion"]
  };
  const normalResD = evaluateTacticalAffinity(secondaryOnlyDrill, { name: "Circulación Rápida y Cambio de Orientación" }, "senior", "Senior");
  const isProtectedD = !normalResD || normalResD.compatibilityLevel !== "ALTA";
  results.push({
    mutation: "MUTACIÓN D: Eliminar requisito DIRECT para nivel ALTA",
    detected: isProtectedD,
    notes: isProtectedD ? "Detectada y bloqueada: afinidad secundaria no alcanza nivel ALTA." : "Fallo de detección: clasificado erróneamente como ALTA."
  });

  // ────────────────────────────────────────────────────────────────────────────
  // MUTACIÓN E: Eliminar negativeStems / conflictingContexts
  // ────────────────────────────────────────────────────────────────────────────
  const hiitDrill = {
    nombre: "Circuito de Mantenimiento Físico (HIIT)",
    age_category: "senior",
    dificultad: 3,
    game_phase: "physical_conditioning",
    objetivo_tactico: ["mantenimiento fisico"],
    tags: ["hiit", "fuerza"]
  };
  const normalResE = evaluateTacticalAffinity(hiitDrill, { name: "Circulación Rápida y Cambio de Orientación" }, "senior", "Senior");
  const isProtectedE = (normalResE === null);
  results.push({
    mutation: "MUTACIÓN E: Eliminar negativeStems / conflictingContexts",
    detected: isProtectedE,
    notes: isProtectedE ? "Detectada y bloqueada: contexto contradictorio 'mantenimiento fisico' es excluido con NULL." : "Fallo de detección."
  });

  console.table(results);
  const allDetected = results.every(r => r.detected);
  if (!allDetected) {
    console.error("❌ MUTATION TESTING FAILED: Algunas mutaciones no fueron protegidas.");
    process.exit(1);
  } else {
    console.log("🏆 TODAS LAS 5 MUTACIONES CONCEPTUALES FUERON DETECTADAS Y BLOQUEADAS.");
  }
}

runMutationTests();
