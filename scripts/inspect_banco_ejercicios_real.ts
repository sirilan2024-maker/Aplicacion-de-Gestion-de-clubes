process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectBancoEjercicios() {
  console.log("=== INSPECCIÓN EXHAUSTIVA DE BANCO_EJERCICIOS ===");

  const { data: exercises, error } = await supabase
    .from("banco_ejercicios")
    .select("*")
    .order("id", { ascending: true });

  if (error || !exercises) {
    console.error("Error al obtener banco_ejercicios:", error);
    return;
  }

  console.log(`\n1. Total ejercicios en banco_ejercicios: ${exercises.length}`);

  // SHA256 verification
  const stringified = JSON.stringify(exercises);
  const sha256 = crypto.createHash("sha256").update(stringified).digest("hex");
  console.log(`SHA256 (JSON stringified): ${sha256}`);

  // Columns in first row
  const sample = exercises[0];
  console.log("\n2. Columnas presentes en banco_ejercicios:");
  console.log(Object.keys(sample));

  // Distributions
  const gamePhases: Record<string, number> = {};
  const ageCategories: Record<string, number> = {};
  const tipos: Record<string, number> = {};
  let withTacticalObj = 0;
  let withTechnicalObj = 0;
  let withTags = 0;
  let withPrincipleId = 0;
  let withSubprincipleId = 0;

  exercises.forEach((ex) => {
    const gp = String(ex.game_phase || "NULL");
    gamePhases[gp] = (gamePhases[gp] || 0) + 1;

    const ac = String(ex.age_category || "NULL");
    ageCategories[ac] = (ageCategories[ac] || 0) + 1;

    const t = String(ex.tipo || "NULL");
    tipos[t] = (tipos[t] || 0) + 1;

    if (ex.objetivo_tactico && ex.objetivo_tactico.length > 0) withTacticalObj++;
    if (ex.objetivo_tecnico && ex.objetivo_tecnico.length > 0) withTechnicalObj++;
    if (ex.tags && ex.tags.length > 0) withTags++;
    if (ex.principle_id) withPrincipleId++;
    if (ex.subprinciple_id) withSubprincipleId++;
  });

  console.log("\n3. Distribución de 'game_phase':", gamePhases);
  console.log("\n4. Distribución de 'age_category':", ageCategories);
  console.log("\n5. Distribución de 'tipo':", tipos);
  console.log(`\n6. Ejercicios con objetivo_tactico: ${withTacticalObj}/${exercises.length}`);
  console.log(`7. Ejercicios con objetivo_tecnico: ${withTechnicalObj}/${exercises.length}`);
  console.log(`8. Ejercicios con tags: ${withTags}/${exercises.length}`);
  console.log(`9. Ejercicios con principle_id: ${withPrincipleId}/${exercises.length}`);
  console.log(`10. Ejercicios con subprinciple_id: ${withSubprincipleId}/${exercises.length}`);

  // Sample items across different categories and phases
  console.log("\n11. Muestra de 5 ejercicios:");
  exercises.slice(0, 5).forEach((ex, i) => {
    console.log(`\n--- Ejercicio #${i + 1}: ${ex.nombre} ---`);
    console.log(`ID: ${ex.id}`);
    console.log(`game_phase: ${ex.game_phase}`);
    console.log(`age_category: ${ex.age_category} | categoria_edad: ${JSON.stringify(ex.categoria_edad)}`);
    console.log(`tipo: ${ex.tipo} | dificultad: ${ex.dificultad}`);
    console.log(`objetivo_tactico: ${JSON.stringify(ex.objetivo_tactico)}`);
    console.log(`objetivo_tecnico: ${JSON.stringify(ex.objetivo_tecnico)}`);
    console.log(`tags: ${JSON.stringify(ex.tags)}`);
  });
}

inspectBancoEjercicios().catch(console.error);
