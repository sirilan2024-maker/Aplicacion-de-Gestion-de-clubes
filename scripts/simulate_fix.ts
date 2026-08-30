process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import { generateMethodologySessionProposal } from "../src/lib/methodology/methodologySessionGenerator";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function simulateFix() {
  const { data: rawCatalog } = await supabase.from("banco_ejercicios").select("*");
  if (!rawCatalog) return;

  // Simular la ampliación de categorías para ejercicios tácticos colectivos
  const seniorApplicableIds = new Set([
    "5203664c-c54e-4b5f-942e-99d579192208",
    "78cda51b-b2e7-44cb-8d0b-a6020c1723e9",
    "527ad0aa-5e6a-4b80-a907-57f513115e55",
    "b4c9c28d-ea67-48d1-a57a-44f0b6d94d3c",
    "278b1ce3-ef5d-48a8-9433-a6f87647ac51",
    "d249670f-17ec-4008-b8d7-040e940004a0",
    "8401f26e-524e-4712-aa2f-2834e9a79b98",
    "4daec208-8d51-4d86-b679-da04eab50974",
    "83e8366c-03b1-41a7-878d-342575a3e0f7",
    "51552028-c1bf-4527-a04f-2d0c4805d3bd",
    "affd884c-992f-484c-ae2e-1a49e084b40e",
    "2ba02f88-4c6b-467f-a0d8-9029471aef23"
  ]);

  const catalog = rawCatalog.map(ex => {
    if (seniorApplicableIds.has(ex.id)) {
      return {
        ...ex,
        categoria_edad: ["infantil", "cadete", "juvenil", "senior"]
      };
    }
    return ex;
  });

  const planner = SessionPlannerService.getInstance();

  const testPrompts = [
    "Sesión de posesión y circulación para Infantil",
    "Sesión de presión tras pérdida para Senior, 75 minutos",
    "Sesión de presión alta para Senior, 75 minutos",
    "Sesión de transición defensiva para Senior, 75 minutos"
  ];

  console.log("=== TEST CON SessionPlannerService (Natural Language Prompt) ===");
  for (const p of testPrompts) {
    const res = await planner.generateSession(p, catalog);
    const s = res.session;
    console.log(`\nPrompt: "${p}"`);
    console.log(`Resultado: ${s?.drills.length}/5 bloques | ${s?.calculatedDurationMinutes} min | Coherence: ${s?.coherenceScore}% | Valid: ${res.success}`);
    s?.drills.forEach(d => {
      console.log(`  - [${d.phase}] ${d.exercise?.nombre} (${d.allocatedDurationMin} min)`);
    });
  }

  console.log("\n=== TEST CON generateMethodologySessionProposal (UI Builder Context) ===");
  for (const tc of [
    { name: "Posesión Infantil", category: "infantil", objective: "posesión y circulación", duration: 75 },
    { name: "Presión tras pérdida Senior", category: "senior", objective: "presión tras pérdida", duration: 75 },
    { name: "Presión alta Senior", category: "senior", objective: "presión alta", duration: 75 },
    { name: "Transición defensiva Senior", category: "senior", objective: "transición defensiva", duration: 75 }
  ]) {
    const prop = generateMethodologySessionProposal({
      teamId: "team-1",
      category: tc.category,
      objective: tc.objective,
      secondaryObjectives: [],
      microcycleDay: "MD-3",
      durationMinutes: tc.duration,
      numPlayers: 16,
      intensityLoad: 3,
      allExercises: catalog
    });

    const blockCount = Object.values(prop.blocks).filter(b => b.exercise !== null).length;
    console.log(`\nCaso: ${tc.name}`);
    console.log(`Resultado: ${blockCount}/5 bloques | ${prop.totalDurationMin} min`);
    Object.entries(prop.blocks).forEach(([bKey, b]) => {
      console.log(`  - [${bKey}] ${b.exercise ? b.exercise.nombre : "❌ NULL"} (${b.durationMin} min)`);
    });
  }
}

simulateFix();
