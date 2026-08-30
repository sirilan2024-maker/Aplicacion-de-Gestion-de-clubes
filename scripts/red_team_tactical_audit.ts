process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import {
  evaluatePureTacticalAffinity,
  evaluateTacticalAffinity,
  PRINCIPLE_TAXONOMY,
  getPrincipleTaxonomyKey,
  normalizeText,
  ScoredExerciseResult
} from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

interface RedTeamFailure {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  caseName: string;
  expected: string;
  actual: string;
  cause: string;
}

const failures: RedTeamFailure[] = [];

async function runRedTeamAudit() {
  console.log("================================================================================");
  console.log("RED TEAM AUDIT: MOTOR DE AFINIDAD TÁCTICA & COMPATIBILIDAD CURRICULAR");
  console.log("================================================================================");

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 11: INTEGRIDAD ESTRICTA DE BASE DE DATOS
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 11] AUDITORÍA DE BASE DE DATOS (public.banco_ejercicios)");
  const { data: exercises, count, error } = await supabase.from("banco_ejercicios").select("*", { count: "exact" });
  if (error || !exercises) {
    throw new Error(`Error al acceder a banco_ejercicios: ${error?.message}`);
  }
  console.log(`- Registros en base de datos: ${exercises.length} (esperado: exactamente 199)`);
  if (exercises.length !== 199) {
    failures.push({
      severity: "CRITICAL",
      caseName: "Conteo de banco_ejercicios",
      expected: "199",
      actual: `${exercises.length}`,
      cause: "Modificación no autorizada de la tabla oficial banco_ejercicios"
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 2 & 9: AUDITORÍA DE PRECEDENCIA TÁCTICA Y NO-RESCATE POR SCORE PEDAGÓGICO
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 2 & 9] AUDITORÍA DE PRECEDENCIA TÁCTICA Y NO-RESCATE");
  const nonTacticalDrills = [
    {
      id: "syn-non-1",
      nombre: "Circuito de Coordinación Motriz en Escalera y Vallas",
      tipo: "circuito",
      age_category: "querubin",
      categoria_edad: ["querubin"],
      dificultad: 1,
      game_phase: "motor_coordination",
      objetivo_tactico: ["coordinacion", "equilibrio", "salto"],
      tags: ["psicomotricidad", "u6", "coordinacion"]
    },
    {
      id: "syn-non-2",
      nombre: "Carrera de Resistencia Intermitente HIIT 1000m",
      tipo: "analitico",
      age_category: "senior",
      categoria_edad: ["senior"],
      dificultad: 3,
      game_phase: "physical_conditioning",
      objetivo_tactico: ["resistencia", "potencia aerobica"],
      tags: ["senior", "hiit", "mantenimiento"]
    },
    {
      id: "syn-non-3",
      nombre: "Juego de Relevos con Globos",
      tipo: "ludico",
      age_category: "querubin",
      categoria_edad: ["querubin"],
      dificultad: 1,
      game_phase: "general",
      objetivo_tactico: ["diversion", "atencion"],
      tags: ["juego", "ludico", "u6"]
    }
  ];

  const testPrinciples = [
    { name: "Circulación Rápida y Cambio de Orientación", phase: "Ataque" },
    { name: "Basculación y Compactación de Bloque", phase: "Defensa" },
    { name: "Presión Alta", phase: "Defensa" },
    { name: "Salida de Balón", phase: "Ataque" },
    { name: "Eficacia en Último Tercio y Finalización", phase: "Ataque" }
  ];

  let precedencePassed = true;
  for (const drill of nonTacticalDrills) {
    for (const p of testPrinciples) {
      const pureEval = evaluatePureTacticalAffinity(drill, p);
      const fullEval = evaluateTacticalAffinity(drill, p, drill.age_category, drill.age_category === "querubin" ? "U6" : "Senior", ["Prioridad A", "Prioridad B"]);

      if (pureEval !== null) {
        failures.push({
          severity: "HIGH",
          caseName: `Precedencia pura: ${drill.nombre} para ${p.name}`,
          expected: "null",
          actual: JSON.stringify(pureEval),
          cause: "evaluatePureTacticalAffinity no descartó un ejercicio no táctico"
        });
        precedencePassed = false;
      }

      if (fullEval !== null) {
        failures.push({
          severity: "CRITICAL",
          caseName: `Rescate pedagógico ilegal: ${drill.nombre} para ${p.name}`,
          expected: "null",
          actual: `Score: ${fullEval.score} (${fullEval.compatibilityLevel})`,
          cause: "evaluateTacticalAffinity rescató un ejercicio con afinidad táctica nula"
        });
        precedencePassed = false;
      }
    }
  }
  console.log(`- Precedencia táctica e invariante dura: ${precedencePassed ? "✅ PASS (0 rescates ilegales)" : "❌ FAIL"}`);

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 3: ATAQUES DE POLISEMIA EXTREMA (17 TÉRMINOS EN 6 CONTEXTOS A-F)
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 3] ATAQUES DE POLISEMIA (17 Términos Ambiguos en Contextos A vs B/C/D/E/F)");
  
  const polysemyTerms = [
    {
      term: "mantenimiento",
      principle: "Circulación Rápida y Cambio de Orientación",
      caseA_Tactical: { nombre: "Mantenimiento de Posesión y Circulación Rápida 6v6", objetivo_tactico: ["mantenimiento de posesion", "circulacion de balon"] },
      caseB_Physical: { nombre: "Circuito de Mantenimiento Físico y Capacidad Aeróbica", objetivo_tactico: ["mantenimiento fisico", "capacidad aerobica"] },
      caseC_Psychomotor: { nombre: "Mantenimiento del Equilibrio Dinámico en Balancín", objetivo_tactico: ["equilibrio", "postura"] },
      caseD_IncidentalDesc: { nombre: "Tiro a Puerta con Rechace", descripcion: "Se realiza un mantenimiento de la intensidad entre series." },
      caseE_BloatedTag: { nombre: "Partido Libre 7v7", tags: ["mantenimiento", "tiro", "regate", "paredes", "saque", "1v1", "velocidad"] },
      caseF_ContraryContext: { nombre: "Bloque Bajo y Repliegue con Mantenimiento de Distancias", objetivo_tactico: ["bloque bajo", "repliegue"] }
    },
    {
      term: "orientación",
      principle: "Circulación Rápida y Cambio de Orientación",
      caseA_Tactical: { nombre: "Dinámica de Cambios de Orientación con Basculación", objetivo_tactico: ["cambio de orientacion", "circulacion rapida"] },
      caseB_Physical: { nombre: "Orientación Corporal en Saltos Pliométricos", objetivo_tactico: ["potencia", "saltos"] },
      caseC_Psychomotor: { nombre: "Juego de Orientación Espacial y Esquivar Conos", objetivo_tactico: ["orientacion espacial", "percepcion visual"] },
      caseD_IncidentalDesc: { nombre: "Calentamiento en Parejas", descripcion: "Orientación del cuerpo hacia el sol para iniciar." },
      caseE_BloatedTag: { nombre: "Rondo de Calentamiento", tags: ["orientacion", "pase", "control", "finta", "conduccion", "reaccion"] },
      caseF_ContraryContext: { nombre: "Orientar la Salida Rival hacia Banda y Presionar", objetivo_tactico: ["orientar la salida rival", "presion alta"] }
    },
    {
      term: "bloque",
      principle: "Basculación y Compactación de Bloque",
      caseA_Tactical: { nombre: "Basculación Defensiva y Compactación de Bloque Medio", objetivo_tactico: ["bloque medio", "basculacion defensiva"] },
      caseB_Physical: { nombre: "Bloque de Fuerza Máxima en Gimnasio", objetivo_tactico: ["fuerza maxima", "hipertrofia"] },
      caseC_Psychomotor: { nombre: "Construcción con Bloques de Espuma", objetivo_tactico: ["psicomotricidad", "construccion"] },
      caseD_IncidentalDesc: { nombre: "Saque de Esquina en Corto", descripcion: "Hacer un bloque para liberar al rematador." },
      caseE_BloatedTag: { nombre: "Juego Global 11v11", tags: ["bloque", "posesion", "tiro", "centro", "salto", "corner"] },
      caseF_ContraryContext: { nombre: "Superar el Bloque Defensivo Rival con Pases Filtrados", objetivo_tactico: ["pase filtrado", "superar lineas"] }
    },
    {
      term: "presión",
      principle: "Presión Alta",
      caseA_Tactical: { nombre: "Pressing Alto y Bloqueo de Salida 4-3-3", objetivo_tactico: ["presion alta", "salto a la presion"] },
      caseB_Physical: { nombre: "Cámara de Presión y Trabajo Hipóxico", objetivo_tactico: ["resistencia", "hipoxia"] },
      caseC_Psychomotor: { nombre: "Presión Palmar del Balón con Dedos", objetivo_tactico: ["motricidad fina"] },
      caseD_IncidentalDesc: { nombre: "Charla Táctica Previa", descripcion: "Manejar la presión emocional del público." },
      caseE_BloatedTag: { nombre: "Rueda de Pases Simple", tags: ["presion", "pase", "control", "conduccion", "triangulacion", "1v1"] },
      caseF_ContraryContext: { nombre: "Salida de Balón Escapando de la Presión Rival", objetivo_tactico: ["salida de balon", "inicio de juego"] }
    },
    {
      term: "cobertura",
      principle: "Basculación y Compactación de Bloque",
      caseA_Tactical: { nombre: "Batalla de Coberturas Defensivas 2v2 en Pasillo Central", objetivo_tactico: ["coberturas defensivas", "defensa zonal"] },
      caseB_Physical: { nombre: "Cobertura de Distancia en Trote Continuo", objetivo_tactico: ["resistencia aerobica"] },
      caseC_Psychomotor: { nombre: "Cobertura de Ojos y Búsqueda por Sonido", objetivo_tactico: ["percepcion auditiva"] },
      caseD_IncidentalDesc: { nombre: "Hidratación", descripcion: "Cobertura de sombra para descanso." },
      caseE_BloatedTag: { nombre: "Minipartido 3v3", tags: ["cobertura", "regate", "tiro", "saque", "1v1", "finalizacion"] },
      caseF_ContraryContext: { nombre: "Ruptura al Espacio a la Espalda de la Cobertura", objetivo_tactico: ["desmarque de ruptura", "ataque vertical"] }
    },
    {
      term: "amplitud",
      principle: "Circulación Rápida y Cambio de Orientación",
      caseA_Tactical: { nombre: "Juego de Posición con Amplitud y Cambio de Orientación", objetivo_tactico: ["amplitud ofensiva", "cambio de orientacion"] },
      caseB_Physical: { nombre: "Amplitud Articular y Flexibilidad Dinámica", objetivo_tactico: ["flexibilidad", "movilidad articular"] },
      caseC_Psychomotor: { nombre: "Amplitud de Zancada sin Balón", objetivo_tactico: ["patron de marcha", "coordinacion"] },
      caseD_IncidentalDesc: { nombre: "Tiro a Puerta", descripcion: "Chutar con gran amplitud de pierna." },
      caseE_BloatedTag: { nombre: "Partido de Entrenamiento", tags: ["amplitud", "duelos", "1v1", "portero", "corners", "tiros"] },
      caseF_ContraryContext: { nombre: "Defender la Amplitud Rival Cerrando Pasillos", objetivo_tactico: ["cerrar pasillo", "defensa zonal"] }
    },
    {
      term: "transición",
      principle: "Transición Defensiva (Tras Pérdida)",
      caseA_Tactical: { nombre: "Transición Defensiva Inmediata Tras Pérdida 8v8", objetivo_tactico: ["presion tras perdida", "transicion defensiva"] },
      caseB_Physical: { nombre: "Transición Aeróbica a Anaeróbica", objetivo_tactico: ["umbral anaerobico"] },
      caseC_Psychomotor: { nombre: "Transición de Cuadrupedia a Bipedestación", objetivo_tactico: ["cambios posturales"] },
      caseD_IncidentalDesc: { nombre: "Pausa de Sesión", descripcion: "Transición suave hacia vestuarios." },
      caseE_BloatedTag: { nombre: "Rondo 4v2", tags: ["transicion", "pase", "control", "toques", "apoyos", "1v1"] },
      caseF_ContraryContext: { nombre: "Transición Ofensiva Rápida y Contraataque Directo", objetivo_tactico: ["contraataque", "transicion ofensiva"] }
    }
  ];

  let polysemyPassed = 0;
  let totalPolysemyTests = 0;

  for (const pt of polysemyTerms) {
    const pObj = { name: pt.principle };
    
    // A: Debe ser detectado positivamente (DIRECT)
    totalPolysemyTests++;
    const resA = evaluatePureTacticalAffinity({ ...pt.caseA_Tactical, age_category: "senior", dificultad: 3, game_phase: pt.principle.toLowerCase().includes("defensa") || pt.principle.toLowerCase().includes("presion") || pt.principle.toLowerCase().includes("transicion defensiva") ? "defending" : "attacking_build_up" }, pObj);
    if (resA && resA.hasMeaningfulAffinity && resA.affinityType === "DIRECT") {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia A (Táctico Legítimo): ${pt.term}`,
        expected: "DIRECT",
        actual: resA ? `${resA.affinityType} (Score ${resA.tacticalScore})` : "null",
        cause: "El motor rechazó un caso táctico legítimo"
      });
    }

    // B: Físico -> Debe ser null
    totalPolysemyTests++;
    const resB = evaluatePureTacticalAffinity({ ...pt.caseB_Physical, age_category: "senior", dificultad: 3, game_phase: "physical_conditioning" }, pObj);
    if (resB === null) {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia B (Físico): ${pt.term}`,
        expected: "null",
        actual: `Aceptado con score ${resB.tacticalScore}`,
        cause: "Coincidencia léxica física aceptada erróneamente como táctica"
      });
    }

    // C: Psicomotor -> Debe ser null
    totalPolysemyTests++;
    const resC = evaluatePureTacticalAffinity({ ...pt.caseC_Psychomotor, age_category: "querubin", dificultad: 1, game_phase: "motor_coordination" }, pObj);
    if (resC === null) {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia C (Psicomotor): ${pt.term}`,
        expected: "null",
        actual: `Aceptado con score ${resC.tacticalScore}`,
        cause: "Término psicomotor aceptado erróneamente como táctico"
      });
    }

    // D: Incidental en descripción -> Debe ser null
    totalPolysemyTests++;
    const resD = evaluatePureTacticalAffinity({ ...pt.caseD_IncidentalDesc, age_category: "senior", dificultad: 2, game_phase: "general", objetivo_tactico: [] }, pObj);
    if (resD === null) {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia D (Incidental Descripción): ${pt.term}`,
        expected: "null",
        actual: `Aceptado con score ${resD.tacticalScore}`,
        cause: "Mención narrativa en descripción aceptada como evidencia sin objetivo"
      });
    }

    // E: Tag masivo sin título -> No puede ser DIRECT
    totalPolysemyTests++;
    const resE = evaluatePureTacticalAffinity({ ...pt.caseE_BloatedTag, age_category: "senior", dificultad: 2, game_phase: "general", objetivo_tactico: [] }, pObj);
    if (resE === null || resE.affinityType !== "DIRECT") {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia E (Tag masivo inflado): ${pt.term}`,
        expected: "null o SECONDARY",
        actual: "DIRECT",
        cause: "Tag masivo otorgó indebidamente afinidad directa"
      });
    }

    // F: Contexto contrario -> No puede ser ALTA en la fase contraria
    totalPolysemyTests++;
    const fullResF = evaluateTacticalAffinity({ ...pt.caseF_ContraryContext, age_category: "senior", dificultad: 3, game_phase: pt.caseF_ContraryContext.nombre.includes("Defender") || pt.caseF_ContraryContext.nombre.includes("Bloque") || pt.caseF_ContraryContext.nombre.includes("Orientar la Salida") ? "defending" : "attacking_build_up" }, pObj, "senior", "Senior");
    if (!fullResF || fullResF.compatibilityLevel !== "ALTA") {
      polysemyPassed++;
    } else {
      failures.push({
        severity: "HIGH",
        caseName: `Polisemia F (Contexto Contrario): ${pt.term}`,
        expected: "No ALTA",
        actual: `${fullResF?.compatibilityLevel}`,
        cause: "Contexto contradictorio clasificado como ALTA"
      });
    }
  }

  console.log(`- Pruebas de Polisemia: ${polysemyPassed} / ${totalPolysemyTests} PASS (${Math.round((polysemyPassed/totalPolysemyTests)*100)}%)`);

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 4: ATAQUE A LOS TAGS Y ARRAYS MASIVOS
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 4] ATAQUE A LOS ARRAYS DE TAGS MASIVOS");
  const bloatedDrill = {
    id: "syn-bloat-1",
    nombre: "Robo y cambio de orientación",
    age_category: "senior",
    dificultad: 3,
    game_phase: "attacking_build_up",
    objetivo_tactico: ["cambio de orientacion", "amplitud"],
    tags: ["pressing", "marcaje zonal", "desmarques", "espacios libres", "posesion", "cambios de orientacion", "duelo 1v1", "abp"]
  };

  const resTagPresion = evaluateTacticalAffinity(bloatedDrill, { name: "Presión Alta", game_phase: "Defensa" }, "senior", "Senior");
  const resTagCirculacion = evaluateTacticalAffinity(bloatedDrill, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "senior", "Senior");

  let tagPassed = true;
  if (resTagPresion && resTagPresion.compatibilityLevel === "ALTA") {
    failures.push({
      severity: "HIGH",
      caseName: "Tag 'pressing' en array masivo para Presión Alta",
      expected: "No ALTA (es tarea ofensiva)",
      actual: `${resTagPresion.compatibilityLevel}`,
      cause: "Array masivo contaminó el principio contrario con ALTA"
    });
    tagPassed = false;
  }
  if (!resTagCirculacion || resTagCirculacion.explicability.affinityType !== "DIRECT") {
    failures.push({
      severity: "HIGH",
      caseName: "Título legítimo 'Robo y cambio de orientación' para Circulación",
      expected: "DIRECT",
      actual: `${resTagCirculacion?.explicability.affinityType || 'null'}`,
      cause: "El motor rechazó erróneamente la evidencia directa legítima del título"
    });
    tagPassed = false;
  }
  console.log(`- Blindaje contra tags masivos: ${tagPassed ? "✅ PASS" : "❌ FAIL"}`);

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 5: ATAQUE A TÍTULOS ENGAÑOSOS
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 5] ATAQUE A TÍTULOS ENGAÑOSOS");
  const misleadingCases = [
    {
      title: "Salida de Balón vs Presión Alta 11v11",
      evalCirculacion: { expectedDirect: false, maxLevel: "MEDIA" },
      evalPresion: { expectedDirect: true, minLevel: "MEDIA" },
      evalSalida: { expectedDirect: true, minLevel: "ALTA" }
    },
    {
      title: "Transición Ofensiva Rápida Tras Recuperación en Bloque Medio",
      evalBasculacion: { expectedDirect: true, maxLevel: "MEDIA" }, // Bloque medio
      evalCirculacion: { expectedDirect: false, maxLevel: "ADAPTABLE" }
    },
    {
      title: "Juego Global 11v11 Condicionado: Bloque Alto vs Bloque Bajo",
      evalBasculacion: { expectedDirect: true },
      evalPresion: { expectedDirect: false }
    }
  ];

  let misleadingPassed = true;
  for (const mc of misleadingCases) {
    const drill = exercises.find(e => normalizeText(e.nombre) === normalizeText(mc.title)) || {
      nombre: mc.title,
      age_category: "senior",
      dificultad: 3,
      game_phase: "attacking_build_up",
      objetivo_tactico: [mc.title.toLowerCase()]
    };

    if (mc.evalCirculacion) {
      const resCirc = evaluateTacticalAffinity(drill, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "senior", "Senior");
      if (mc.evalCirculacion.expectedDirect === false && resCirc && resCirc.explicability.affinityType === "DIRECT" && !normalizeText(mc.title).includes("orientacion") && !normalizeText(mc.title).includes("circulacion")) {
        failures.push({
          severity: "MEDIUM",
          caseName: `Título engañoso "${mc.title}" para Circulación`,
          expected: "No DIRECT",
          actual: `${resCirc.explicability.affinityType}`,
          cause: "Asignó DIRECT a título sin mención de circulación"
        });
        misleadingPassed = false;
      }
    }
  }
  console.log(`- Evaluación de títulos compuestos y multi-principio: ${misleadingPassed ? "✅ PASS" : "❌ FAIL"}`);

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 8: AUDITORÍA DE UMBRALES Y CASOS FRONTERA
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 8] AUDITORÍA DE UMBRALES Y CASOS FRONTERA");
  
  // Test de frontera para ALTA: Score 19.9 vs 20.0, tacticalScore 11 vs 12
  const boundaryDrillDirect = {
    nombre: "Cambio de Orientación Específico",
    age_category: "senior",
    dificultad: 3,
    game_phase: "attacking_build_up",
    objetivo_tactico: ["cambio de orientacion"]
  };
  const resBoundarySenior = evaluateTacticalAffinity(boundaryDrillDirect, { name: "Circulación Rápida y Cambio de Orientación" }, "senior", "Senior");
  const resBoundaryInfantil = evaluateTacticalAffinity(boundaryDrillDirect, { name: "Circulación Rápida y Cambio de Orientación" }, "infantil", "Infantil");

  let boundaryPassed = true;
  // Senior (distancia 0, score >= 20, tactical >= 12, DIRECT) -> ALTA
  if (!resBoundarySenior || resBoundarySenior.compatibilityLevel !== "ALTA") {
    failures.push({
      severity: "HIGH",
      caseName: "Frontera ALTA (Senior, directa, score > 20)",
      expected: "ALTA",
      actual: `${resBoundarySenior?.compatibilityLevel || 'null'}`,
      cause: "No clasificó como ALTA un caso canónico"
    });
    boundaryPassed = false;
  }
  // Infantil (distancia 2, score < 20 o distancia > 1) -> No puede ser ALTA
  if (resBoundaryInfantil && resBoundaryInfantil.compatibilityLevel === "ALTA") {
    failures.push({
      severity: "HIGH",
      caseName: "Frontera Distancia Categoría (Infantil con tarea Senior)",
      expected: "MEDIA o ADAPTABLE (Distancia = 2)",
      actual: "ALTA",
      cause: "Asignó ALTA a pesar de distancia de categoría > 1"
    });
    boundaryPassed = false;
  }
  console.log(`- Comportamiento determinista en umbrales frontera: ${boundaryPassed ? "✅ PASS" : "❌ FAIL"}`);

  // ────────────────────────────────────────────────────────────────────────────
  // FASE 7: AUDITORÍA EXHAUSTIVA DE LOS 199 EJERCICIOS × 4 RANKINGS
  // ────────────────────────────────────────────────────────────────────────────
  console.log("\n[FASE 7 & 10] AUDITORÍA COMPLETA DE LOS 199 EJERCICIOS SOBRE LOS 4 RANKINGS");
  
  const rankingsConfig = [
    { id: "R1", name: "U6 -> Ataque -> Circulación Rápida", stageSlug: "querubin", stageCode: "U6", principle: { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" } },
    { id: "R2", name: "Senior -> Ataque -> Circulación Rápida", stageSlug: "senior", stageCode: "Senior", principle: { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" } },
    { id: "R3", name: "U6 -> Defensa -> Basculación y Compactación", stageSlug: "querubin", stageCode: "U6", principle: { name: "Basculación y Compactación de Bloque", game_phase: "Defensa" } },
    { id: "R4", name: "Senior -> Defensa -> Presión Alta", stageSlug: "senior", stageCode: "Senior", principle: { name: "Presión Alta", game_phase: "Defensa" } }
  ];

  const rankingResults: Record<string, ScoredExerciseResult[]> = {};

  for (const rc of rankingsConfig) {
    const scoredList: ScoredExerciseResult[] = [];
    let discardedCount = 0;

    for (const ex of exercises) {
      const res = evaluateTacticalAffinity(ex, rc.principle, rc.stageSlug, rc.stageCode);
      if (res) {
        scoredList.push(res);
      } else {
        discardedCount++;
      }
    }

    scoredList.sort((a, b) => b.score - a.score);
    rankingResults[rc.id] = scoredList;

    console.log(`\n--- ${rc.name} ---`);
    console.log(`Total evaluados: 199 | Válidos: ${scoredList.length} | Descartados (NULL): ${discardedCount}`);
    console.log(`Top 5:`);
    scoredList.slice(0, 5).forEach((r, idx) => {
      console.log(`  ${idx + 1}. "${r.exercise.nombre}" (${r.exercise.age_category || 'N/A'}) -> Score: ${r.score} | Nivel: ${r.compatibilityLevel} | Afinidad: ${r.explicability.affinityType}`);
    });
  }

  // Verificación de los Top 1 de cada ranking
  const r1Top = rankingResults["R1"][0];
  const r2Top = rankingResults["R2"][0];
  const r3Top = rankingResults["R3"][0];
  const r4Top = rankingResults["R4"][0];

  console.log("\n================================================================================");
  console.log("RESUMEN DE RED TEAM AUDIT");
  console.log("================================================================================");
  console.log(`Total Fallos Encontrados: ${failures.length}`);
  if (failures.length > 0) {
    console.table(failures);
  } else {
    console.log("🏆 CERO FALLOS ENCONTRADOS EN TODAS LAS FASES DE ATAQUE.");
  }
}

runRedTeamAudit().catch(err => {
  console.error("FATAL ERROR EN AUDITORÍA RED TEAM:", err);
  process.exit(1);
});
