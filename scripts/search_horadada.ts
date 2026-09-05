import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchHoradada() {
  console.log('--- Searching for "Horadada" in partidos table ---');
  const { data: matches } = await supabase
    .from('partidos')
    .select('*, equipo:teams(name, category)')
    .ilike('rival_nombre', '%Horadada%');

  console.log('Found matches in partidos:', matches);

  console.log('\n--- Searching for "Horadada" in ffcv_matches table ---');
  const { data: ffcvMatches } = await supabase
    .from('ffcv_matches')
    .select('*')
    .or('home_team_name.ilike.%Horadada%,away_team_name.ilike.%Horadada%');

  console.log('Found matches in ffcv_matches:', ffcvMatches);
}

searchHoradada().catch(console.error);
