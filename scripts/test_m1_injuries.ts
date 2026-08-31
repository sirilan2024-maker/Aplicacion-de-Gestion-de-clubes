process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLUB_ID = "7ff5dbeb-2942-4576-8e74-b45a17646fb7";

async function runM1Verification() {
  console.log("=================================================================");
  console.log("=== M1: VERIFICACIÓN Y TEST SUITE DE HISTORIAL DE LESIONES    ===");
  console.log("=================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${label}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Verificar existencia de la tabla player_injuries
  const { data: tableCheck, error: tableErr } = await supabase
    .from("player_injuries")
    .select("id")
    .limit(1);

  assert(!tableErr, "Tabla player_injuries accesible y operativa en Supabase", tableErr?.message);

  // 2. Verificar columnas de la tabla player_injuries en el schema
  const { data: cols } = await supabase.rpc("execute_sql_query", {
    query_text: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'player_injuries' ORDER BY ordinal_position"
  });

  const colMap = new Map((cols || []).map((c: any) => [c.column_name, c.data_type]));
  assert(colMap.has("id"), "Campo 'id' (UUID PK) existe");
  assert(colMap.has("club_id"), "Campo 'club_id' (UUID FK) existe");
  assert(colMap.has("player_id"), "Campo 'player_id' (UUID FK) existe");
  assert(colMap.has("injury_date"), "Campo 'injury_date' (DATE) existe");
  assert(colMap.has("injury_type"), "Campo 'injury_type' (VARCHAR) existe");
  assert(colMap.has("notes"), "Campo 'notes' (TEXT) existe");
  assert(colMap.has("expected_return_date"), "Campo 'expected_return_date' (DATE) existe");
  assert(colMap.has("status"), "Campo 'status' (VARCHAR) existe");
  assert(colMap.has("body_view"), "Campo M1.1 'body_view' (VARCHAR) existe");
  assert(colMap.has("body_region"), "Campo M1.1 'body_region' (VARCHAR) existe");
  assert(colMap.has("body_side"), "Campo M1.1 'body_side' (VARCHAR) existe");
  assert(colMap.has("body_structure"), "Campo M1.1 'body_structure' (VARCHAR) existe");
  assert(colMap.has("laterality"), "Campo M1.1 'laterality' (VARCHAR) existe");
  assert(colMap.has("severity"), "Campo M1.1 'severity' (VARCHAR) existe");
  assert(colMap.has("estimated_min_days"), "Campo M1.1 'estimated_min_days' (INT) existe");
  assert(colMap.has("estimated_max_days"), "Campo M1.1 'estimated_max_days' (INT) existe");
  assert(colMap.has("estimated_return_from"), "Campo M1.1 'estimated_return_from' (DATE) existe");
  assert(colMap.has("estimated_return_to"), "Campo M1.1 'estimated_return_to' (DATE) existe");
  assert(colMap.has("actual_return_date"), "Campo M1.1 'actual_return_date' (DATE) existe");
  assert(colMap.has("created_at"), "Campo 'created_at' (TIMESTAMPTZ) existe");
  assert(colMap.has("updated_at"), "Campo 'updated_at' (TIMESTAMPTZ) existe");

  // 2.2 Verificar tabla player_injury_updates
  const { data: updateCols } = await supabase.rpc("execute_sql_query", {
    query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'player_injury_updates'"
  });
  const updateColSet = new Set((updateCols || []).map((c: any) => c.column_name));
  assert(updateColSet.has("id"), "player_injury_updates: 'id' PK existe");
  assert(updateColSet.has("injury_id"), "player_injury_updates: 'injury_id' FK existe");
  assert(updateColSet.has("update_date"), "player_injury_updates: 'update_date' existe");
  assert(updateColSet.has("notes"), "player_injury_updates: 'notes' existe");
  assert(updateColSet.has("new_expected_return_date"), "player_injury_updates: 'new_expected_return_date' existe");
  assert(updateColSet.has("created_by"), "player_injury_updates: 'created_by' existe");

  // 3. Verificar Check Constraint de status (activa | recuperado)
  const { data: constraints } = await supabase.rpc("execute_sql_query", {
    query_text: "SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'public.player_injuries'::regclass AND contype = 'c'"
  });

  const checkDef = (constraints || []).map((c: any) => c.def).join(" ");
  assert(
    checkDef.includes("activa") && checkDef.includes("recuperado"),
    "Check constraint 'status IN (activa, recuperado)' activo y verificado"
  );

  // 4. Verificar RLS habilitado en player_injuries
  const { data: rlsStatus } = await supabase.rpc("execute_sql_query", {
    query_text: "SELECT relrowsecurity FROM pg_class WHERE relname = 'player_injuries'"
  });

  assert(rlsStatus?.[0]?.relrowsecurity === true, "RLS (Row Level Security) activado en player_injuries");

  // 5. Verificar que players.status NO ha sido alterado
  const { count: activePlayers } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("club_id", CLUB_ID)
    .eq("status", "active");

  assert(activePlayers === 171, `Campo players.status intacto (los 171 jugadores mantienen su status 'active')`);

  // 6. Comprobación del motor de estimación de recuperación
  const { estimateRecovery } = await import("../src/lib/injuries/recovery-guidelines");
  const isquiosEst = estimateRecovery({
    injuryType: "Rotura muscular",
    structure: "Isquiotibiales",
    severity: "Moderada",
    injuryDate: "2026-08-30"
  });
  assert(isquiosEst.hasEstimation === true, "Motor de estimación: reconoce Rotura muscular en Isquiotibiales (Moderada)");
  assert(isquiosEst.minDays === 21 && isquiosEst.maxDays === 42, "Motor de estimación: plazo 21–42 días correcto según BJSM");
  assert(isquiosEst.source?.includes("BJSM") === true, "Motor de estimación: cita correctamente la fuente deportiva (BJSM)");

  const tobilloEst = estimateRecovery({
    injuryType: "Esguince",
    structure: "Tobillo",
    severity: "Leve",
    injuryDate: "2026-08-30"
  });
  assert(tobilloEst.hasEstimation === true, "Motor de estimación: reconoce Esguince de Tobillo Leve");
  assert(tobilloEst.minDays === 7 && tobilloEst.maxDays === 14, "Motor de estimación: plazo 7–14 días correcto según FIFA");

  // 6.2 Comprobación de miembros superiores (Hombro, Codo, Brazo, Muñeca, Mano)
  const codoEst = estimateRecovery({
    injuryType: "Esguince",
    structure: "Codo",
    severity: "Leve",
    injuryDate: "2026-08-30"
  });
  assert(codoEst.hasEstimation === true, "Motor de estimación: reconoce Esguince de Codo Leve");
  assert(codoEst.minDays === 7 && codoEst.maxDays === 16, "Codo: plazo 7–16 días según FIFA Football Medicine Manual");

  const hombroEst = estimateRecovery({
    injuryType: "Esguince",
    structure: "Articulación acromioclavicular",
    severity: "Moderada",
    injuryDate: "2026-08-30"
  });
  assert(hombroEst.hasEstimation === true, "Motor de estimación: reconoce Esguince Acromioclavicular Moderado");
  assert(hombroEst.minDays === 14 && hombroEst.maxDays === 35, "Hombro: plazo 14–35 días según BJSM / UEFA Studies");

  const munecaEst = estimateRecovery({
    injuryType: "Esguince",
    structure: "Muñeca",
    severity: "Leve",
    injuryDate: "2026-08-30"
  });
  assert(munecaEst.hasEstimation === true, "Motor de estimación: reconoce Esguince de Muñeca Leve");

  const bicepsEst = estimateRecovery({
    injuryType: "Distensión muscular",
    structure: "Bíceps",
    severity: "Leve",
    injuryDate: "2026-08-30"
  });
  assert(bicepsEst.hasEstimation === true, "Motor de estimación: reconoce Distensión muscular en Bíceps");

  // 6.3 Ausencia de estimación segura cuando no existe evidencia médica o gravedad no definida
  const unkEst = estimateRecovery({
    injuryType: "Fractura",
    structure: "Dedos",
    severity: "Por determinar"
  });
  assert(unkEst.hasEstimation === false, "Motor de estimación: retorna hasEstimation: false seguro ante caso no tabulado");

  // 6.4 Verificación del asset 3D GLTF oficial
  const fs = await import("fs");
  const path = await import("path");
  const glbPath = path.join(process.cwd(), "public", "models", "athlete_anatomy.glb");
  assert(fs.existsSync(glbPath), "Asset GLTF: athlete_anatomy.glb existe en public/models/");
  
  if (fs.existsSync(glbPath)) {
    const glbStats = fs.statSync(glbPath);
    assert(glbStats.size > 500000 && glbStats.size < 5000000, `Tamaño del GLB optimizado para web (${(glbStats.size / 1024).toFixed(1)} KB)`);
    const glbBuf = fs.readFileSync(glbPath);
    const magic = glbBuf.readUInt32LE(0);
    assert(magic === 0x46546c67, "Encabezado del archivo GLB es un binario glTF 2.0 válido (0x46546c67)");
  }

  // 6.5 Verificación del catálogo de piezas 3D y catálogo 2D
  const { MANNEQUIN_PIECES } = await import("../src/components/features/players/AnatomicalMannequin3D");
  assert(Boolean(MANNEQUIN_PIECES.codo_der), "Catálogo 3D: Codo derecho registrado");
  assert(Boolean(MANNEQUIN_PIECES.codo_izq), "Catálogo 3D: Codo izquierdo registrado");
  assert(Boolean(MANNEQUIN_PIECES.brazo_der), "Catálogo 3D: Brazo derecho (bíceps/tríceps) registrado");
  assert(Boolean(MANNEQUIN_PIECES.muneca_der), "Catálogo 3D: Muñeca derecha registrada");
  assert(Boolean(MANNEQUIN_PIECES.mano_der), "Catálogo 3D: Mano/dedos derechos registrados");
  assert(Boolean(MANNEQUIN_PIECES.muslo_post_der), "Catálogo 3D: Muslo posterior derecho (isquios) registrado");
  assert(Boolean(MANNEQUIN_PIECES.gluteo_der), "Catálogo 3D: Glúteo derecho registrado");
  assert(Boolean(MANNEQUIN_PIECES.gluteo_izq), "Catálogo 3D: Glúteo izquierdo registrado");

  const { ANATOMICAL_REGIONS, buildDisplayLabel } = await import("../src/components/features/players/AnatomicalBodyMap");
  const hasArmRegion = ANATOMICAL_REGIONS.some(r => r.region === "Brazo");
  const hasElbowRegion = ANATOMICAL_REGIONS.some(r => r.region === "Codo");
  const hasWristRegion = ANATOMICAL_REGIONS.some(r => r.region === "Muñeca");
  assert(hasArmRegion && hasElbowRegion && hasWristRegion, "Catálogo 2D / accesibilidad: contiene Brazo, Codo y Muñeca");

  const labelTest = buildDisplayLabel("Codo", "derecha");
  assert(labelTest === "Codo derecho/a", "Generador de etiquetas: formatea lateralidad correctamente");

  // 7. Comprobación de no-regresión de datos de producción
  const { count: attendanceCount } = await supabase.from("attendance").select("id", { count: "exact", head: true });
  assert(attendanceCount === 3003, `Attendance permanece exactamente en 3.003 (actual: ${attendanceCount})`);

  const { count: playersCount } = await supabase.from("players").select("id", { count: "exact", head: true }).eq("club_id", CLUB_ID);
  assert(playersCount === 171, `Players del club permanece exactamente en 171 (actual: ${playersCount})`);

  const { count: eventsCount } = await supabase.from("team_events").select("id", { count: "exact", head: true });
  assert(eventsCount === 664, `Team events permanece exactamente en 664 (actual: ${eventsCount})`);

  const { count: partidosCount } = await supabase.from("partidos").select("id", { count: "exact", head: true });
  assert(partidosCount === 386, `Partidos federativos permanece exactamente en 386 (actual: ${partidosCount})`);

  const { count: convocatoriasCount } = await supabase.from("convocatorias").select("id", { count: "exact", head: true });
  assert(convocatoriasCount === 3648, `Convocatorias permanece exactamente en 3.648 (actual: ${convocatoriasCount})`);

  console.log("-----------------------------------------------------------------");
  console.log(`RESULTADO SUITE M1.1: ${passed} PASADOS, ${failed} FALLIDOS`);
  console.log("=================================================================");

  if (failed > 0) process.exit(1);
}

runM1Verification();

