process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function checkCatalog() {
  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !catalog) {
    console.error("Error cargando catalogo:", error);
    process.exit(1);
  }
  console.log("Total catalog items:", catalog.length);
  
  // Buscar ejercicios por bloque_sesion
  const byBlock: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const ex of catalog) {
    byBlock[ex.bloque_sesion || "sin_bloque"] = (byBlock[ex.bloque_sesion || "sin_bloque"] || 0) + 1;
    byType[ex.tipo || "sin_tipo"] = (byType[ex.tipo || "sin_tipo"] || 0) + 1;
  }
  console.log("Por bloque_sesion:", byBlock);
  console.log("Por tipo:", byType);

  // Buscar ejercicios de baja carga fisica o con palabras regeneracion/vuelta_calma
  const lowLoad = catalog.filter(ex => (ex.carga_fisica ?? 2) <= 1 || (ex.bloque_sesion || "").includes("calma") || (ex.tipo || "").includes("calma") || (ex.nombre || "").toLowerCase().includes("calma") || (ex.nombre || "").toLowerCase().includes("estiramiento") || (ex.nombre || "").toLowerCase().includes("regenera"));
  console.log(`\nEjercicios de baja carga / regenerativos (${lowLoad.length}):`);
  for (const ex of lowLoad) {
    console.log(`- [${ex.id}] "${ex.nombre}" (Bloque: ${ex.bloque_sesion}, Tipo: ${ex.tipo}, Carga: ${ex.carga_fisica}, Opo: ${ex.oposicion}, Cat: ${ex.age_category})`);
  }
}

checkCatalog();
