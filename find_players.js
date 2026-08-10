import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPlayers() {
  const { data: players } = await supabase.from('players').select('id, first_name, last_name, team_id');
  console.log("PLAYERS LIST:");
  players.forEach(p => console.log(`  - [ID: ${p.id}] ${p.first_name} ${p.last_name}`));
}

findPlayers();
