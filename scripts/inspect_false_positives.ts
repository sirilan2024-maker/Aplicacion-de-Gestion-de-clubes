process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectDrills() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  if (!exercises) return;

  console.log(`Total exercises: ${exercises.length}`);

  // Inspect the ones mentioned by the user
  const drillsToInspect = [
    "Robo y cambio de orientación",
    "Cambios de orientación",
    "3 Zonas con ataque en superioridad",
    "Circuito de Mantenimiento Físico-Táctico de Alta Intensidad (HIIT)",
    "Salida de Balón vs Presión Alta 11v11",
    "Dinámica de cambios de orientación",
    "Basculación y Bloque Medio 4v4 + 2 Apoyos en Amplitud"
  ];

  for (const name of drillsToInspect) {
    const drill = exercises.find(e => e.nombre?.toLowerCase().includes(name.toLowerCase()));
    if (drill) {
      console.log("\n========================================================");
      console.log(`DRILL: "${drill.nombre}"`);
      console.log(`  Tipo: ${drill.tipo}`);
      console.log(`  Game Phase: ${drill.game_phase}`);
      console.log(`  Age Category: ${drill.age_category} / ${JSON.stringify(drill.categoria_edad)}`);
      console.log(`  Dificultad: ${drill.dificultad}`);
      console.log(`  Objetivo Táctico: ${JSON.stringify(drill.objetivo_tactico)}`);
      console.log(`  Objetivo Técnico: ${JSON.stringify(drill.objetivo_tecnico)}`);
      console.log(`  Tags: ${JSON.stringify(drill.tags)}`);
      console.log(`  Descripción: ${drill.descripcion}`);
    } else {
      console.log(`NOT FOUND: ${name}`);
    }
  }

  // Let's also look for drills whose primary game_phase is defending/pressing
  console.log("\n========================================================");
  console.log("DRILLS WITH PRESSING / DEFENSE IN TITLE OR TACTICAL OBJECTIVE:");
  const pressingDrills = exercises.filter(e => {
    const text = (e.nombre + " " + (e.objetivo_tactico || []).join(" ")).toLowerCase();
    return text.includes("presion") || text.includes("pressing") || text.includes("acoso") || text.includes("recupera");
  });
  console.log(`Found ${pressingDrills.length} pressing/defense related drills:`);
  pressingDrills.slice(0, 15).forEach(d => {
    console.log(`- [${d.age_category || 'N/A'}] "${d.nombre}" (Phase: ${d.game_phase}, ObjTac: ${JSON.stringify(d.objetivo_tactico)})`);
  });
}

inspectDrills().catch(console.error);
