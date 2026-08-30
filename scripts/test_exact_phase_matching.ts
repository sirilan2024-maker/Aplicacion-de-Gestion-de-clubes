process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

function matchesGamePhase(dbPhase: string, selectedPhaseId: string): boolean {
  const normDb = (dbPhase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const normTarget = (selectedPhaseId || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (normTarget === "ataque") {
    // Only pure attack, NOT transitions
    return normDb === "ataque" || normDb === "ataqueorganizado" || normDb === "attacking" || normDb === "attackingbuildup";
  }
  if (normTarget === "defensa") {
    // Only pure defense, NOT transitions
    return normDb === "defensa" || normDb === "defensaorganizada" || normDb === "defending" || normDb === "defendinghighpress" || normDb === "defendingmidblock";
  }
  if (normTarget === "transicionataquedefensa") {
    return normDb === "transicionataquedefensa" || normDb === "transiciondefensiva" || normDb === "transitionatktodef";
  }
  if (normTarget === "transiciondefensaataque") {
    return normDb === "transiciondefensaataque" || normDb === "transicionofensiva" || normDb === "transitiondeftoatk";
  }
  if (normTarget === "balonparado") {
    return normDb === "balonparado" || normDb === "abp" || normDb === "setpieces";
  }
  return normDb === normTarget;
}

async function testExactMatching() {
  const { data: principles } = await supabase.from("methodology_principles").select("id, name, game_phase, curriculum_id");
  
  const PHASES = [
    { id: "Ataque", label: "Ataque Organizado" },
    { id: "Defensa", label: "Defensa Organizada" },
    { id: "Transición Ataque-Defensa", label: "Transición Ataque-Defensa" },
    { id: "Transición Defensa-Ataque", label: "Transición Defensa-Ataque" },
    { id: "Balón Parado", label: "Balón Parado (ABP)" }
  ];

  PHASES.forEach(p => {
    const matches = principles?.filter(pr => matchesGamePhase(pr.game_phase, p.id)) || [];
    console.log(`\n=== FASE: ${p.label} (Total: ${matches.length} principios) ===`);
    matches.forEach(m => console.log(`  - [${m.name}] (raw: '${m.game_phase}')`));
  });
}

testExactMatching().catch(console.error);
