process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const GAME_PHASES = [
  { id: "Ataque", label: "Ataque Organizado" },
  { id: "Defensa", label: "Defensa Organizada" },
  { id: "Transición Ataque-Defensa", label: "Transición Ataque-Defensa" },
  { id: "Transición Defensa-Ataque", label: "Transición Defensa-Ataque" },
  { id: "Balón Parado", label: "Balón Parado (ABP)" }
];

function normalizePhase(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ""); // keep only alphanumeric
}

async function testMatching() {
  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase, curriculum_id");
  
  GAME_PHASES.forEach(gp => {
    const normTarget = normalizePhase(gp.id);
    const matches = principles?.filter(p => {
      const normP = normalizePhase(p.game_phase);
      return normP === normTarget || normP.includes(normTarget) || normTarget.includes(normP);
    });
    console.log(`Phase '${gp.label}' [ID: '${gp.id}', Norm: '${normTarget}'] => Matched ${matches?.length} principles:`);
    matches?.forEach(m => console.log(`   - '${m.name}' (raw phase: '${m.game_phase}', currId: ${m.curriculum_id})`));
  });
}

testMatching().catch(console.error);
