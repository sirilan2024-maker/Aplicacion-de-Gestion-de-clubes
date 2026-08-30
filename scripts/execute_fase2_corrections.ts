process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { inferDrillBlock, normalizeDrillType } from "./diagnostic_normalization";
import { normalizeText } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function executePhase2Corrections() {
  console.log("================================================================================");
  console.log("EJECUTANDO FASE 2: CORRECCIÓN METODOLÓGICA DEL CATÁLOGO (285 EJERCICIOS)");
  console.log("================================================================================\n");

  // 1. CARGA INICIAL Y BACKUP DE SEGURIDAD
  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !exercises) {
    console.error("❌ Error al cargar banco_ejercicios:", error);
    process.exit(1);
  }

  console.log(`1. Total de ejercicios leídos para backup: ${exercises.length}`);
  fs.writeFileSync("scripts/backup_banco_ejercicios_pre_fase2.json", JSON.stringify(exercises, null, 2));
  console.log("   ✅ Backup guardado en scripts/backup_banco_ejercicios_pre_fase2.json\n");

  // Cargar principios de metodología existentes para vincular los 86 nuevos si procede
  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase");
  const { data: subprinciples } = await supabase.from("methodology_subprinciples").select("id, name, principle_id");

  const appliedChanges: any[] = [];
  const skippedChanges: any[] = [];

  // Mapeo de principios canónicos a UUIDs existentes
  const principleMap: Record<string, string> = {};
  (principles || []).forEach(p => {
    const norm = normalizeText(p.name);
    if (norm.includes("circulac") || norm.includes("posesion")) principleMap["circulacion"] = p.id;
    if (norm.includes("basculac") || norm.includes("defensiva")) principleMap["basculacion"] = p.id;
    if (norm.includes("presion alta")) principleMap["presion alta"] = p.id;
    if (norm.includes("salida de balon") || norm.includes("iniciacion")) principleMap["salida de balon"] = p.id;
    if (norm.includes("transicion defensiva") || norm.includes("tras perdida")) principleMap["transicion defensiva"] = p.id;
    if (norm.includes("transicion ofensiva") || norm.includes("contraataque")) principleMap["transicion ofensiva"] = p.id;
    if (norm.includes("finalizac")) principleMap["finalizacion"] = p.id;
    if (norm.includes("progresion")) principleMap["progresion"] = p.id;
    if (norm.includes("balon parado") || norm.includes("abp")) principleMap["balon parado"] = p.id;
  });

  console.log("Principios mapeados para vinculación:", Object.keys(principleMap).length);

  // 2. CORRECCIONES DEMOSTRADAS
  console.log("--- 2. APLICANDO CORRECCIONES EN BASE DE DATOS ---");

  for (const ex of exercises) {
    const isOriginal = !ex.created_at || !ex.created_at.startsWith("2026-08-26");
    const isNew = Boolean(ex.created_at && ex.created_at.startsWith("2026-08-26"));
    const titleNorm = normalizeText(ex.nombre || "");
    const tacNorm = (ex.objetivo_tactico || []).map((t: string) => normalizeText(t)).join(" ");

    const updates: Record<string, any> = {};

    // A) LIMPIEZA DE SUFIJO COMERCIAL EN TÍTULOS (77 casos)
    const COMMERCIAL_SUFFIX = " - Accede a 2600+ ejercicios como este en Fútbol Sesión";
    if (ex.nombre && ex.nombre.includes(COMMERCIAL_SUFFIX)) {
      const cleanTitle = ex.nombre.replace(COMMERCIAL_SUFFIX, "").trim();
      updates.nombre = cleanTitle;
    }

    // B) CORRECCIÓN DE LOS 2 FALSOS NEGATIVOS DEMOSTRADOS
    if (ex.id === "2ba02f88-4c6b-467f-a0d8-9029471aef23") {
      updates.game_phase = "transition_atk_to_def";
      updates.objetivo_tactico = Array.from(new Set([...(ex.objetivo_tactico || []), "presión tras pérdida", "transición defensiva"]));
    }
    if (ex.id === "a97c4bfa-9d7a-4cb9-a403-40a70d257516") {
      updates.game_phase = "attacking_finishing";
      updates.objetivo_tactico = Array.from(new Set([...(ex.objetivo_tactico || []), "finalización", "remate"]));
    }

    // C) CORRECCIÓN DE LOS 22 FALSOS POSITIVOS (Finalización/1v1 etiquetados como conservación)
    const isFinishingTitle = titleNorm.includes("finalizaci") || titleNorm.includes("tiro") || titleNorm.includes("remate") || titleNorm.includes("disparo");
    const is1v1Title = titleNorm.includes("1c1") || titleNorm.includes("1v1") || titleNorm.includes("1 c 1");

    if (isFinishingTitle && tacNorm.includes("conservaci") && !tacNorm.includes("finalizac") && !tacNorm.includes("tiro")) {
      updates.objetivo_tactico = ["finalización", "remate", "definición"];
      updates.game_phase = "attacking_finishing";
      if (principleMap["finalizacion"]) updates.principle_id = principleMap["finalizacion"];
    } else if (is1v1Title && tacNorm.includes("conservaci") && !tacNorm.includes("1v1") && !tacNorm.includes("desborde")) {
      updates.objetivo_tactico = ["1v1 ofensivo", "desborde", "duelos"];
      updates.game_phase = "attacking_progression";
      if (principleMap["progresion"]) updates.principle_id = principleMap["progresion"];
    }

    // D) RESOLUCIÓN DE bloque_sesion NULL (178 casos)
    if (!ex.bloque_sesion) {
      const inf = inferDrillBlock(ex);
      if (inf.recommendedBlock && (inf.recommendedBlock as string) !== "NULL_AMBIGUO") {
        updates.bloque_sesion = inf.recommendedBlock;
      }
    }

    // E) ENRIQUECIMIENTO DE LOS 86 NUEVOS (Categorías y principios no contradictorios)
    if (isNew) {
      // Si no tiene principle_id y es de posesión
      if (!ex.principle_id && (tacNorm.includes("conservaci") || tacNorm.includes("posesion") || updates.bloque_sesion === "principal")) {
        if (!updates.principle_id && principleMap["circulacion"]) {
          updates.principle_id = principleMap["circulacion"];
        }
      }

      // Categorías de edad aplicables
      if (ex.age_category === "senior" && (!ex.categoria_edad || ex.categoria_edad.length <= 1)) {
        updates.categoria_edad = ["infantil", "cadete", "juvenil", "senior"];
      }
    }

    // APLICAR UPDATE SI HAY CAMBIOS
    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from("banco_ejercicios")
        .update(updates)
        .eq("id", ex.id);

      if (updateErr) {
        skippedChanges.push({
          id: ex.id,
          nombre: ex.nombre,
          motivo: updateErr.message,
          updatesIntentados: updates
        });
      } else {
        appliedChanges.push({
          id: ex.id,
          nombreAnterior: ex.nombre,
          nombreNuevo: updates.nombre || ex.nombre,
          cambios: updates
        });
      }
    }
  }

  console.log(`\n--- 3. RESUMEN DE EJECUCIÓN ---`);
  console.log(`• Cambios aplicados con éxito: ${appliedChanges.length}`);
  console.log(`• Cambios omitidos por error: ${skippedChanges.length}`);

  // 4. ACTUALIZAR MANIFIESTO DE NORMALIZACIÓN
  const manifestData = {
    updated_at: new Date().toISOString(),
    total_exercises: exercises.length,
    applied_changes_count: appliedChanges.length,
    skipped_changes_count: skippedChanges.length,
    applied_changes: appliedChanges,
    skipped_changes: skippedChanges
  };

  fs.writeFileSync("scripts/normalization_manifest_285.json", JSON.stringify(manifestData, null, 2));
  console.log("   ✅ Manifiesto actualizado en scripts/normalization_manifest_285.json\n");
}

executePhase2Corrections();
