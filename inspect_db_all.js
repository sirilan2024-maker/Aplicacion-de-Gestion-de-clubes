import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDbAll() {
  const { data: teams } = await supabase.from('teams').select('id, name');
  console.log("Equipos:", teams);

  const { data: players } = await supabase.from('players').select('id, team_id, first_name, last_name');
  console.log("\nTodos los jugadores en DB:");
  players.forEach(p => console.log(`  - [ID: ${p.id}] TeamID: ${p.team_id} | ${p.first_name} ${p.last_name}`));

  const { data: matches } = await supabase.from('partidos').select('id, equipo_id, rival_nombre, lugar');
  console.log("\nTodos los partidos:");
  matches.forEach(m => console.log(`  - [ID: ${m.id}] EquipoID: ${m.equipo_id} | vs ${m.rival_nombre} (${m.lugar})`));
}

inspectDbAll();
