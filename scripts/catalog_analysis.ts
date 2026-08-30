process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwhvszbspvmsfgrbepox.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

async function catalogDeepAnalysis() {
  const { data: exercises } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("nombre");

  if (!exercises) return;

  console.log(`=== ANÁLISIS DE METADATOS DE LOS 199 EJERCICIOS ===\n`);

  // 1. Todos los objetivos tácticos únicos
  const allTacObjs: Record<string, number> = {};
  exercises.forEach(ex => {
    (ex.objetivo_tactico || []).forEach((t: string) => {
      const norm = t.toLowerCase().trim();
      allTacObjs[norm] = (allTacObjs[norm] || 0) + 1;
    });
  });

  const sortedTac = Object.entries(allTacObjs).sort((a, b) => b[1] - a[1]);
  console.log(`Total de objetivos tácticos distintos registrados: ${sortedTac.length}`);
  console.log("Top 30 objetivos tácticos en la base de datos:");
  console.table(sortedTac.slice(0, 30));

  // 2. Fases de juego registradas
  const allPhases: Record<string, number> = {};
  exercises.forEach(ex => {
    const p = ex.game_phase || "NULL";
    allPhases[p] = (allPhases[p] || 0) + 1;
  });
  console.log("\nFases de juego (game_phase):");
  console.table(allPhases);

  // 3. Tipos registrados
  const allTipos: Record<string, number> = {};
  exercises.forEach(ex => {
    const t = ex.tipo || "NULL";
    allTipos[t] = (allTipos[t] || 0) + 1;
  });
  console.log("\nTipos (tipo):");
  console.table(allTipos);

  // 4. Bloque de sesión registrados
  const allBloques: Record<string, number> = {};
  exercises.forEach(ex => {
    const b = ex.bloque_sesion || "NULL";
    allBloques[b] = (allBloques[b] || 0) + 1;
  });
  console.log("\nBloque de sesión (bloque_sesion):");
  console.table(allBloques);

  // 5. Carga física y oposición
  const cargaDist: Record<string, number> = {};
  const oposicionDist: Record<string, number> = {};
  exercises.forEach(ex => {
    cargaDist[String(ex.carga_fisica)] = (cargaDist[String(ex.carga_fisica)] || 0) + 1;
    oposicionDist[String(ex.oposicion)] = (oposicionDist[String(ex.oposicion)] || 0) + 1;
  });
  console.log("\nCarga física (carga_fisica):");
  console.table(cargaDist);
  console.log("\nOposición (oposicion):");
  console.table(oposicionDist);
}

catalogDeepAnalysis();
