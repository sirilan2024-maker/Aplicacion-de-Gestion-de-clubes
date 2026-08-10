import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlayers() {
  const { data: team } = await supabase.from('teams').select('id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);

  console.log("=== JUGADORES DE CADETE A EN LA BASE DE DATOS ===");
  players.forEach((p, i) => {
    console.log(`${i+1}. [ID: ${p.id}] first_name: "${p.first_name}" | last_name: "${p.last_name}"`);
  });

  const testNames = [
    "HERNANDEZ RUIZ, MARTIN",
    "LA GRAND, NOAH",
    "ZAPATA GARCÍA, VÍCTOR",
    "TORQUI HAMDOUNI, ABDERRAHIM TALAL",
    "FRANCO ELIAS, JHON",
    "BENSAAD BENTAYED, ADAM",
    "GONZALEZ SANCHEZ, ALVARO",
    "RABHI KHARKHACH, ISMAIL",
    "MHAMDI KRIM, HAMZA",
    "VICENTE CARACENA, MANUEL"
  ];

  console.log("\n=== PRUEBA DE COINCIDENCIA CON NOMBRES DEL ACTA ===");
  testNames.forEach(rawName => {
    const rawClean = rawName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Test match logic
    const matched = players.find(p => {
      const fn = (p.first_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ln = (p.last_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Split rawName into parts
      const nameParts = rawClean.split(/[\s,]+/).filter(Boolean);

      // Check if both fn or ln match parts
      if (ln && rawClean.includes(ln)) return true;
      if (fn && rawClean.includes(fn) && fn.length > 2) return true;

      return false;
    });

    console.log(`Acta Name: "${rawName}" ➔ Matched: ${matched ? `${matched.first_name} ${matched.last_name} (ID: ${matched.id})` : '❌ NO MATCH (RIVAL)'}`);
  });
}

debugPlayers();
