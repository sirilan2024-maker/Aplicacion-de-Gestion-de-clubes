process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

function isPrincipleInGamePhase(principlePhase: string, targetPhaseId: string): boolean {
  const normDb = (principlePhase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const normTarget = (targetPhaseId || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (normTarget === "ataque") {
    return normDb === "ataque" || normDb === "ataqueorganizado" || normDb === "attacking" || normDb === "attackingbuildup";
  }
  if (normTarget === "defensa") {
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

async function checkClubSportingSaladar() {
  const clubId = "7ff5dbeb-2942-4576-8e74-b45a17646fb7"; // CLUB SPORTING SALADAR
  const { data: principles } = await supabase
    .from("methodology_principles")
    .select(`
      id,
      name,
      game_phase,
      description,
      methodology_subprinciples (
        id,
        name,
        methodology_behaviours (
          id,
          description
        )
      )
    `)
    .eq("club_id", clubId);

  console.log(`\nPrinciples for CLUB SPORTING SALADAR (Total: ${principles?.length}):`);
  
  const PHASES = [
    { id: "Ataque", label: "Ataque Organizado" },
    { id: "Defensa", label: "Defensa Organizada" },
    { id: "Transición Ataque-Defensa", label: "Transición Ataque-Defensa" },
    { id: "Transición Defensa-Ataque", label: "Transición Defensa-Ataque" },
    { id: "Balón Parado", label: "Balón Parado (ABP)" }
  ];

  PHASES.forEach(p => {
    const matches = principles?.filter(pr => isPrincipleInGamePhase(pr.game_phase, p.id)) || [];
    console.log(`\n=== FASE: ${p.label} (Count: ${matches.length}) ===`);
    matches.forEach(m => {
      console.log(`  - [${m.name}] (Subs: ${m.methodology_subprinciples?.length})`);
      m.methodology_subprinciples?.forEach((s: any) => {
        console.log(`      * Sub: ${s.name} (Behs: ${s.methodology_behaviours?.length})`);
      });
    });
  });
}

checkClubSportingSaladar().catch(console.error);
