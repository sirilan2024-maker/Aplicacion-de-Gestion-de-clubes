require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjjfgncvtpshddqlxbdx.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


async function run() {
  // Get active season
  const { data: activeSeason } = await supabase.from('seasons').select('id, club_id').eq('is_active', true).single();
  if (!activeSeason) {
    console.log("No active season found");
    return;
  }

  // Get active players missing from history in this season
  const { data: activePlayers } = await supabase.from('players').select('*').eq('status', 'active');
  let inserted = 0;

  for (let player of activePlayers) {
    const { data: history } = await supabase
      .from('player_season_history')
      .select('id')
      .eq('player_id', player.id)
      .eq('season_id', activeSeason.id)
      .maybeSingle();

    if (!history) {
      await supabase.from('player_season_history').insert({
        player_id: player.id,
        club_id: player.club_id,
        season_id: activeSeason.id,
        team_id: player.team_id,
        status: player.status
      });
      inserted++;
    } else {
      await supabase.from('player_season_history').update({
        team_id: player.team_id,
        status: player.status
      }).eq('id', history.id);
    }
  }
  
  console.log(`Backfill complete. Inserted/Updated ${inserted} active players into history for season ${activeSeason.id}.`);
}

run().catch(console.error);
