process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const CATEGORIES = [
  { id: "U6", code: "U6", slug: "querubin", name: "Querubín" },
  { id: "U7-U8", code: "U7-U8", slug: "prebenjamin", name: "Prebenjamín" },
  { id: "U9-U10", code: "U9-U10", slug: "benjamin", name: "Benjamín" },
  { id: "U11-U12", code: "U11-U12", slug: "alevin", name: "Alevín" },
  { id: "U13-U14", code: "U13-U14", slug: "infantil", name: "Infantil" },
  { id: "U15-U16", code: "U15-U16", slug: "cadete", name: "Cadete" },
  { id: "U17-U19", code: "U17-U19", slug: "juvenil", name: "Juvenil" },
  { id: "Senior", code: "Senior", slug: "senior", name: "Amateur / Senior" },
];

const GAME_PHASE_MAPPING: Record<string, string[]> = {
  "ataque": ["attacking_build_up", "attacking_progression", "attacking_finishing", "possession", "juego_medio", "rondo"],
  "defensa": ["defending", "defending_mid_block", "defending_high_press", "defensive_game"],
  "transicionataquedefensa": ["transition_atk_to_def", "defending_high_press"],
  "transiciondefensaataque": ["transition_def_to_atk", "attacking_finishing", "attacking_progression"],
  "balonparado": ["set_pieces", "abp"]
};

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function testCurrentMatching() {
  const { data: exercises } = await supabase.from("banco_ejercicios").select("*");
  const { data: principles } = await supabase.from("methodology_principles").select(`
    id, name, game_phase, description,
    methodology_subprinciples (
      id, name, description,
      methodology_behaviours (
        id, description
      )
    )
  `);

  console.log(`Ejercicios: ${exercises?.length}, Principios: ${principles?.length}`);

  // Test across stages and principles
  for (const cat of CATEGORIES) {
    console.log(`\n======================================================`);
    console.log(`STAGE: ${cat.code} (${cat.name}) - Slug: ${cat.slug}`);
    console.log(`======================================================`);

    const stageExercises = exercises?.filter(ex => {
      return ex.age_category === cat.slug ||
        ex.categoria_edad?.includes(cat.slug) ||
        ex.age_category === "general" ||
        !ex.age_category;
    });
    console.log(`Total exercises matching stage ${cat.code}: ${stageExercises?.length}`);
  }
}

testCurrentMatching().catch(console.error);
