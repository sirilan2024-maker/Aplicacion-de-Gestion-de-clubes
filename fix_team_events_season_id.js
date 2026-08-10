import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSeasonId() {
  console.log("=== FIXING SEASON_ID FOR TEAM_EVENTS ===");

  const { data: team } = await supabase.from('teams').select('id, season_id, club_id').eq('name', 'CADETE A').single();
  console.log("Cadete A team:", team);

  const seasonId = team.season_id;
  if (!seasonId) {
    const { data: season } = await supabase.from('seasons').select('id').eq('club_id', team.club_id).eq('is_active', true).single();
    console.log("Active season from club:", season);
  }

  const activeSeasonId = team.season_id || '97dd993a-8ea6-4c4f-a94f-01f13b63fa2b';

  const { data: updEvents, error } = await supabase
    .from('team_events')
    .update({ season_id: activeSeasonId })
    .eq('team_id', team.id)
    .select();

  if (error) {
    console.error("Error actualizando season_id:", error.message);
  } else {
    console.log(`✅ Actualizados ${updEvents?.length || 0} eventos de 'team_events' con season_id = '${activeSeasonId}'.`);
  }
}

fixSeasonId();
