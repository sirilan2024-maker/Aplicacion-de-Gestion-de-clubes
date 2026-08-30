process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyze86Details() {
  const { data: exercises } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("created_at", { ascending: true });

  if (!exercises) return;

  const new86 = exercises.filter(ex => ex.created_at && ex.created_at.startsWith("2026-08-26"));
  console.log(`=== DETALLE DE LOS 86 EJERCICIOS NUEVOS ===\n`);

  // Top 10 nombres de muestra
  console.log("Muestra de 10 ejercicios nuevos:");
  console.table(new86.slice(0, 10).map(e => ({
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    bloque: e.bloque_sesion,
    fase: e.game_phase,
    cat: e.age_category,
    carga: e.carga_fisica,
    opo: e.oposicion,
    objs: (e.objetivo_tactico || []).join(", ")
  })));

  // Distribución de tipos
  const typeCount: Record<string, number> = {};
  new86.forEach(e => { typeCount[e.tipo || "NULL"] = (typeCount[e.tipo || "NULL"] || 0) + 1; });
  console.log("\nTipos en los 86 nuevos:");
  console.table(typeCount);

  // Distribución de bloque_sesion
  const blockCount: Record<string, number> = {};
  new86.forEach(e => { blockCount[e.bloque_sesion || "NULL"] = (blockCount[e.bloque_sesion || "NULL"] || 0) + 1; });
  console.log("\nBloques en los 86 nuevos:");
  console.table(blockCount);

  // Distribución de categorías
  const catCount: Record<string, number> = {};
  new86.forEach(e => {
    const cats = Array.isArray(e.categoria_edad) ? e.categoria_edad : [e.age_category];
    cats.forEach((c: string) => { catCount[c || "NULL"] = (catCount[c || "NULL"] || 0) + 1; });
  });
  console.log("\nCategorías en los 86 nuevos:");
  console.table(catCount);

  // Objetivos tácticos en los 86
  const tacCount: Record<string, number> = {};
  new86.forEach(e => {
    (e.objetivo_tactico || []).forEach((t: string) => {
      tacCount[t.toLowerCase()] = (tacCount[t.toLowerCase()] || 0) + 1;
    });
  });
  console.log("\nTop objetivos tácticos en los 86 nuevos:");
  console.table(Object.entries(tacCount).sort((a, b) => b[1] - a[1]).slice(0, 20));
}

analyze86Details();
