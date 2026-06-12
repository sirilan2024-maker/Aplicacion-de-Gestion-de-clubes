import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Assigning existing teams to active season...");
  
  // 1. Find active season
  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id, club_id')
    .eq('is_active', true)
    .limit(1)
    .single();
    
  if (seasonError || !activeSeason) {
    console.error('Error finding active season:', seasonError);
    return;
  }
  
  // 2. Update all teams in that club that don't have a season_id
  const { data, error } = await supabase
    .from('equipos')
    .update({ season_id: activeSeason.id })
    .is('season_id', null)
    .eq('club_id', activeSeason.club_id);
    
  if (error) {
    console.error('Error updating teams:', error);
  } else {
    console.log('Successfully assigned teams to active season!');
  }
}

run();
