process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY, getPrincipleTaxonomyKey, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import { normalizeDrillType, inferDrillBlock } from "./diagnostic_normalization";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runComplete285Audit() {
  console.log("================================================================================");
  console.log("AUDITORÍA INTEGRAL DE LOS 285 EJERCICIOS DE LA BIBLIOTECA");
  console.log("================================================================================\n");

  const { data: allExercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (error || !allExercises) {
    console.error("Error cargando banco_ejercicios:", error);
    process.exit(1);
  }

  console.log(`Ejercicios cargados: ${allExercises.length}\n`);

  // ==========================================
  // 1. PETICIONES METODOLÓGICAS FORMALES
  // ==========================================
  const targetRequests = [
    { key: "circulacion", label: "Circulación de balón / Mantenimiento", pKey: "circulacion" },
    { key: "presion_alta", label: "Presión alta / Bloque alto", pKey: "presion alta" },
    { key: "salida_de_balon", label: "Salida de balón / Construcción", pKey: "salida de balon" },
    { key: "transicion_defensiva", label: "Transición defensiva / Presión tras pérdida", pKey: "transicion defensiva" },
    { key: "transicion_ofensiva", label: "Transición ofensiva / Contraataque", pKey: "transicion ofensiva" },
    { key: "progresion", label: "Progresión / Superar líneas", pKey: "progresion" },
    { key: "finalizacion", label: "Finalización / Creación de ocasiones", pKey: "finalizacion" },
    { key: "organizacion_defensiva", label: "Organización defensiva / Basculación", pKey: "basculacion" },
    { key: "balon_parado", label: "Balón parado / ABP", pKey: "balon parado" },
    { key: "duelos_1v1", label: "Duelos 1v1 / Desborde individual", pKey: "progresion" },
    { key: "coordinacion", label: "Psicomotricidad / Coordinación (U6-U8)", pKey: "circulacion" }
  ];

  // ==========================================
  // 2. MATRIZ DE COBERTURA: DIRECTO, COMPATIBLE, SECUNDARIO, NO PERTINENTE
  // ==========================================
  console.log("--- 1. CLASIFICACIÓN DE AFINIDAD METODOLÓGICA (DIRECTO / COMPATIBLE / SECUNDARIO / NO PERTINENTE) ---");

  const affinityMatrix: any[] = [];

  for (const req of targetRequests) {
    let directCount = 0;
    let compatibleCount = 0;
    let secondaryCount = 0;
    let notPertinentCount = 0;

    let p1Count = 0;
    let p2Count = 0;
    let globCount = 0;
    let actCount = 0;
    let calmCount = 0;

    const taxDef = PRINCIPLE_TAXONOMY[req.pKey];

    allExercises.forEach(ex => {
      const pure = evaluatePureTacticalAffinity(ex, { name: req.label, game_phase: req.label });
      
      const titleNorm = normalizeText(ex.nombre || "");
      const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
      const tagsNorm = (ex.tags || []).map((t: string) => normalizeText(t)).join(" ");
      const descNorm = normalizeText(ex.descripcion || "");

      let isDirect = false;
      let isCompatible = false;
      let isSecondary = false;

      if (pure && pure.hasMeaningfulAffinity) {
        if (pure.affinityType === "DIRECT") {
          isDirect = true;
        } else {
          isCompatible = true;
        }
      } else if (taxDef) {
        const hasExact = taxDef.primaryExactPhrases.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasPrimary = taxDef.primaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasSec = taxDef.secondaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)) || tagsNorm.includes(normalizeText(p)));

        if (hasExact || hasPrimary) {
          isCompatible = true;
        } else if (hasSec) {
          isSecondary = true;
        }
      }

      if (isDirect) directCount++;
      else if (isCompatible) compatibleCount++;
      else if (isSecondary) secondaryCount++;
      else notPertinentCount++;

      // Evaluaciones por bloque usando scoring y barrera estricta
      const sAct = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP1 = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP2 = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
      const sGl = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sCa = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });

      if (isExerciseSelectableForBlock(sAct)) actCount++;
      if (isExerciseSelectableForBlock(sP1)) p1Count++;
      if (isExerciseSelectableForBlock(sP2)) p2Count++;
      if (isExerciseSelectableForBlock(sGl)) globCount++;
      if (isExerciseSelectableForBlock(sCa)) calmCount++;
    });

    affinityMatrix.push({
      Peticion: req.label,
      DIRECTO: directCount,
      COMPATIBLE: compatibleCount,
      SECUNDARIO: secondaryCount,
      "NO PERTINENTE": notPertinentCount,
      "Total Útiles": directCount + compatibleCount + secondaryCount,
      Act: actCount,
      P1: p1Count,
      P2: p2Count,
      Glob: globCount,
      Calm: calmCount,
      "Capacidad Real Sesión": (p1Count >= 1 && p2Count >= 1 && globCount >= 1 && actCount >= 1) ? "SÍ (Completa)" : (p1Count >= 1 || p2Count >= 1) ? "PARCIAL" : "INSUFICIENTE"
    });
  }

  console.table(affinityMatrix);

  // ==========================================
  // 3. MATRIZ DE COBERTURA POR CATEGORÍA
  // ==========================================
  console.log("\n--- 2. MATRIZ DE COBERTURA POR CATEGORÍA DE EDAD (FASES PRINCIPALES P1+P2+GLOB) ---");

  const categories = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];
  const catMatrix: any[] = [];

  for (const cat of categories) {
    const row: Record<string, any> = { Categoria: cat };
    for (const req of targetRequests.slice(0, 9)) {
      const validForCat = allExercises.filter(ex => {
        const cats = Array.isArray(ex.categoria_edad) ? ex.categoria_edad : [ex.age_category];
        const catMatch = cats.includes(cat) || ex.age_category === cat;
        if (!catMatch) return false;

        const sP1 = scoreExercise(ex, { category: cat, objective: req.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
        const sP2 = scoreExercise(ex, { category: cat, objective: req.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
        const sGl = scoreExercise(ex, { category: cat, objective: req.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });

        return isExerciseSelectableForBlock(sP1) || isExerciseSelectableForBlock(sP2) || isExerciseSelectableForBlock(sGl);
      });

      row[req.label.split("/")[0].trim()] = validForCat.length;
    }
    catMatrix.push(row);
  }

  console.table(catMatrix);

  // ==========================================
  // 4. DETECCIÓN DE CONTRADICCIONES ENTRE METADATOS
  // ==========================================
  console.log("\n--- 3. DETECCIÓN DE CONTRADICCIONES EN LOS 285 EJERCICIOS ---");

  const contradictions: any[] = [];

  allExercises.forEach(ex => {
    const titleNorm = normalizeText(ex.nombre || "");
    const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
    const phaseNorm = normalizeText(ex.game_phase || "");
    const typeNorm = normalizeText(ex.tipo || "");
    const carga = ex.carga_fisica ?? 2;
    const opo = ex.oposicion ?? 2;
    const rep = ex.representatividad ?? 2;
    const bloque = ex.bloque_sesion;

    // 1. Título ofensivo vs Fase defensiva o viceversa
    if ((titleNorm.includes("pressing") || titleNorm.includes("presion tras perdida") || titleNorm.includes("recuperacion")) && phaseNorm.includes("build_up")) {
      contradictions.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo_contradiccion: "Título Defensivo/Presión vs Fase Ofensiva (build_up)",
        detalle: `Título contiene pressing/recuperación pero game_phase es "${ex.game_phase}"`
      });
    }

    if ((titleNorm.includes("finalizaci") || titleNorm.includes("tiro") || titleNorm.includes("remate")) && phaseNorm && !phaseNorm.includes("finishing") && !phaseNorm.includes("progression")) {
      contradictions.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo_contradiccion: "Título Finalización vs Fase no afín",
        detalle: `Título menciona tiro/finalización pero game_phase es "${ex.game_phase}"`
      });
    }

    // 2. Título 1v1 / Duelos vs Objetivo de Conservación Pura
    if ((titleNorm.includes("1c1") || titleNorm.includes("1v1") || titleNorm.includes("duelo")) && tacNorm.includes("conservacion") && !tacNorm.includes("1v1") && !tacNorm.includes("desborde")) {
      contradictions.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo_contradiccion: "Título 1v1 vs Objetivo Táctico de Conservación",
        detalle: `Título indica duelos 1v1 pero objetivo_tactico es solo [${ex.objetivo_tactico?.join(", ")}]`
      });
    }

    // 3. Carga vs Bloque de Sesión
    if (bloque === "vuelta_calma" && (carga > 2 || opo > 1)) {
      contradictions.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo_contradiccion: "Bloque Vuelta a la Calma con Carga/Oposición Excesiva",
        detalle: `Declarado en vuelta_calma pero carga_fisica=${carga} y oposicion=${opo}`
      });
    }

    // 4. Tipo Analítico vs Oposición Alta
    if (typeNorm.includes("analitico") && opo >= 3) {
      contradictions.push({
        id: ex.id,
        nombre: ex.nombre,
        tipo_contradiccion: "Tipo Analítico con Oposición Elevada (>=3)",
        detalle: `Tipo analítico debería tener oposición 0 o 1, pero tiene ${opo}`
      });
    }
  });

  console.log(`Total de contradicciones y desalineaciones detectadas: ${contradictions.length}`);
  console.table(contradictions.slice(0, 20));
}

runComplete285Audit();
