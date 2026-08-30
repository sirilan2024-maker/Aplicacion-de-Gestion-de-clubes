require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const oldSeasonId = '1f95102d-1d00-43fa-9e4c-408681a03e7f';
  
  // Fetch all archived players
  const { data: archivedPlayers } = await supabase.from('players')
    .select('id, club_id')
    .eq('status', 'inactive');
    
  if (!archivedPlayers || archivedPlayers.length === 0) {
    console.log('No archived players found.');
    return;
  }
  
  console.log(`Found ${archivedPlayers.length} archived players.`);
  
  // Fetch existing history for the old season
  const { data: existingHistory } = await supabase.from('player_season_history')
    .select('player_id')
    .eq('season_id', oldSeasonId);
    
  const existingSet = new Set((existingHistory || []).map(h => h.player_id));
  
  const toInsert = archivedPlayers
    .filter(p => !existingSet.has(p.id))
    .map(p => ({
      player_id: p.id,
      season_id: oldSeasonId,
      club_id: p.club_id,
      team_id: null,
      status: 'inactive'
    }));
    
  if (toInsert.length === 0) {
    console.log('All archived players already have a history record for the old season.');
    return;
  }
  
  console.log(`Inserting ${toInsert.length} history records...`);
  
  const { error } = await supabase.from('player_season_history').insert(toInsert);
  if (error) {
    console.error('Error inserting history:', error);
  } else {
    console.log('Successfully inserted history records!');
  }
}

run();
