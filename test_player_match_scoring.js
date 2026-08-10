import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
  const { data: team } = await supabase.from('teams').select('id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);

  const matchPlayer = (nameRaw) => {
    const clean = nameRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = clean.split(/[\s,]+/).filter(w => w.length > 2);

    let bestMatch = null;
    let maxScore = 0;

    for (const p of players) {
      const fn = (p.first_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ln = (p.last_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const fnWords = fn.split(/\s+/).filter(w => w.length > 2);
      const lnWords = ln.split(/\s+/).filter(w => w.length > 2);

      let score = 0;

      // Check last name word matches (Highest weight)
      for (const lnW of lnWords) {
        if (words.some(w => w.includes(lnW) || lnW.includes(w))) {
          score += 50;
        }
      }

      // Check first name word matches
      for (const fnW of fnWords) {
        if (words.some(w => w.includes(fnW) || fnW.includes(w))) {
          score += 20;
        }
      }

      // Requirement: Must have at least 1 LAST NAME word match to prevent cross-matching players with common first names (like "Adam", "Mohamed", "Lucas")
      if (lnWords.length > 0) {
        const hasLnMatch = lnWords.some(lnW => words.some(w => w.includes(lnW) || lnW.includes(w)));
        if (!hasLnMatch) {
          score = 0; // Rejected if last name doesn't match!
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = p;
      }
    }

    return maxScore >= 40 ? bestMatch : null;
  };

  const testCases = [
    "FAID, ADAM",
    "ZAMORA TOMAS, LUCAS",
    "FRANCO ELIAS, JHON",
    "BENSAAD BENTAYED, ADAM",
    "TORQUI HAMDOUNI, ABDERRAHIM TALAL",
    "HERNANDEZ RUIZ, MARTIN",
    "KAMAL, KARIM"
  ];

  console.log("=== PRUEBA DEL ALGORITMO PONDERADO DE MATCHING DE JUGADORES ===");
  testCases.forEach(tc => {
    const matched = matchPlayer(tc);
    console.log(`Acta: "${tc}" ➔ Matched: ${matched ? `${matched.first_name} ${matched.last_name} (ID: ${matched.id})` : '❌ NULL (Rival/Sin coincidencia)'}`);
  });
}

testMatch();
