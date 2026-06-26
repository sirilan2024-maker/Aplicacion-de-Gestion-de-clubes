const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qjjfgncvtpshddqlxbdx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q');

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
