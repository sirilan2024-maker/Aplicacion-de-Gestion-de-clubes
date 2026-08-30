process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { evaluateTacticalAffinity } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function runTagContaminationSuite() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS: TAG CONTAMINATION & MASSIVE TAG ARRAYS DAMPENING");
  console.log("================================================================================");

  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  if (!exercises) throw new Error("No se pudieron cargar ejercicios de la base de datos");

  // CASO 1: Comprobar que un ejercicio con array inflado de 8+ tags (ej. "3 Zonas con ataque en superioridad")
  // no obtiene ALTA en Presión Alta solo por tener "pressing" en el array de tags.
  const tresZonas = exercises.find(e => e.nombre?.includes("3 Zonas con ataque en superioridad"));
  if (tresZonas) {
    const res = evaluateTacticalAffinity(tresZonas, { name: "Presión Alta", game_phase: "Defensa" }, "senior", "Senior");
    console.log(`- Test 1 (Array inflado con tag 'pressing'): "${tresZonas.nombre}"`);
    console.log(`  Resultado: ${res === null ? "DESCARTADO" : `Nivel ${res.compatibilityLevel}, Score: ${res.score}`}`);
    if (res !== null && res.compatibilityLevel === "ALTA") {
      throw new Error("FAIL: 3 Zonas con ataque en superioridad no puede ser ALTA en Presión Alta");
    }
    console.log("  ✅ PASS: No produce ALTA artificial por tag secundario");
  }

  // CASO 2: Tarea con tag 'pressing' pero título sobre cambio de orientación ("Robo y cambio de orientación")
  const roboDrill = exercises.find(e => e.nombre === "Robo y cambio de orientación");
  if (roboDrill) {
    const res = evaluateTacticalAffinity(roboDrill, { name: "Presión Alta", game_phase: "Defensa" }, "senior", "Senior");
    console.log(`- Test 2 (Tag contradictorio con título): "${roboDrill.nombre}" en Presión Alta`);
    console.log(`  Resultado: ${res === null ? "DESCARTADO" : `Nivel ${res.compatibilityLevel}`}`);
    if (res !== null && res.compatibilityLevel === "ALTA") {
      throw new Error("FAIL: Robo y cambio de orientación no puede ser ALTA en Presión Alta");
    }
    console.log("  ✅ PASS: El filtro negativo/contradictorio impide contaminación por tag 'pressing'");
  }

  // CASO 3: Ejercicio sintético con 15 tags genéricos
  const syntheticBloatedExercise = {
    id: "synthetic-01",
    nombre: "Ejercicio Técnico General de Pases y Finalización",
    age_category: "senior",
    dificultad: 3,
    tipo: "analitico",
    game_phase: "attacking_build_up",
    objetivo_tactico: [
      "desmarques", "espacios libres", "posesión/ritmo de juego", "cambios de orientación",
      "pressing", "paredes", "marcaje zonal", "coberturas", "amplitud", "profundidad",
      "tercer hombre", "basculación", "salida de balón", "vigilancia", "superioridad"
    ],
    descripcion: "Circuito analítico general con múltiples postas técnicas."
  };

  const resBloated = evaluateTacticalAffinity(syntheticBloatedExercise, { name: "Circulación Rápida y Cambio de Orientación", game_phase: "Ataque" }, "senior", "Senior");
  console.log(`- Test 3 (Ejercicio sintético con 15 tags genéricos):`);
  console.log(`  Resultado: ${resBloated === null ? "DESCARTADO" : `Nivel ${resBloated.compatibilityLevel}, Score: ${resBloated.score}`}`);
  if (resBloated !== null && resBloated.compatibilityLevel === "ALTA") {
    throw new Error("FAIL: Ejercicio con título no afín y 15 tags no debe ser ALTA");
  }
  console.log("  ✅ PASS: Amortiguación de evidencia en arrays masivos previene ALTA automática");

  console.log("\n🏆 SUITE TAG CONTAMINATION: 100% PASS");
}

runTagContaminationSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
