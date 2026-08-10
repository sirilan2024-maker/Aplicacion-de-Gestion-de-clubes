import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPlayers() {
  const { data: team } = await supabase.from('teams').select('id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name, dorsal').eq('team_id', team.id);

  console.log(`Jugadores del Cadete A (${players?.length || 0}):`);
  players?.forEach(p => {
    console.log(`- ID: ${p.id} | Dorsal: ${p.dorsal} | Nombre: "${p.first_name}" | Apellidos: "${p.last_name}"`);
  });
}

inspectPlayers();
