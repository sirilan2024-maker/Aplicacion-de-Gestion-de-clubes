process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { evaluatePureTacticalAffinity, PRINCIPLE_TAXONOMY, getPrincipleTaxonomyKey, normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import { scoreExercise, isExerciseSelectableForBlock } from "../src/lib/methodology/recommendationEngine";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function printMatrixOnly() {
  const { data: allExercises } = await supabase.from("banco_ejercicios").select("*");
  if (!allExercises) return;

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

  const affinityMatrix = [];

  for (const req of targetRequests) {
    let directCount = 0, compCount = 0, secCount = 0, notPertCount = 0;
    let act = 0, p1 = 0, p2 = 0, glob = 0, calm = 0;

    const taxDef = PRINCIPLE_TAXONOMY[req.pKey];

    allExercises.forEach(ex => {
      const pure = evaluatePureTacticalAffinity(ex, { name: req.label, game_phase: req.label });
      const titleNorm = normalizeText(ex.nombre || "");
      const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");
      const tagsNorm = (ex.tags || []).map((t: string) => normalizeText(t)).join(" ");

      let isDir = false, isComp = false, isSec = false;

      if (pure && pure.hasMeaningfulAffinity) {
        if (pure.affinityType === "DIRECT") isDir = true;
        else isComp = true;
      } else if (taxDef) {
        const hasExact = taxDef.primaryExactPhrases.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasPrimary = taxDef.primaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)));
        const hasSec = taxDef.secondaryTacticalConcepts.some(p => titleNorm.includes(normalizeText(p)) || tacNorm.includes(normalizeText(p)) || tagsNorm.includes(normalizeText(p)));

        if (hasExact || hasPrimary) isComp = true;
        else if (hasSec) isSec = true;
      }

      if (isDir) directCount++;
      else if (isComp) compCount++;
      else if (isSec) secCount++;
      else notPertCount++;

      const sAct = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "activacion", numPlayers: 14, durationMinutes: 15, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP1 = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "principal_1", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sP2 = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "principal_2", numPlayers: 14, durationMinutes: 25, microcycleDay: "MD-3", intensityLoad: 3 });
      const sGl = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "global", numPlayers: 14, durationMinutes: 20, microcycleDay: "MD-3", intensityLoad: 3 });
      const sCa = scoreExercise(ex, { category: ex.age_category || "senior", objective: req.label, targetBlock: "vuelta_calma", numPlayers: 14, durationMinutes: 10, microcycleDay: "MD-3", intensityLoad: 3 });

      if (isExerciseSelectableForBlock(sAct)) act++;
      if (isExerciseSelectableForBlock(sP1)) p1++;
      if (isExerciseSelectableForBlock(sP2)) p2++;
      if (isExerciseSelectableForBlock(sGl)) glob++;
      if (isExerciseSelectableForBlock(sCa)) calm++;
    });

    affinityMatrix.push({
      Peticion: req.label,
      DIRECTO: directCount,
      COMPATIBLE: compCount,
      SECUNDARIO: secCount,
      NO_PERT: notPertCount,
      TotalUtil: directCount + compCount + secCount,
      Act: act,
      P1: p1,
      P2: p2,
      Glob: glob,
      Calm: calm
    });
  }

  console.log(JSON.stringify(affinityMatrix, null, 2));
}

printMatrixOnly();
