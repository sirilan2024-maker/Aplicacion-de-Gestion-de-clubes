import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVisibility() {
  console.log("=== DEBUGGING EVENTS VISIBILITY ===");

  const { data: team } = await supabase.from('teams').select('*').eq('name', 'CADETE A').single();
  console.log("Cadete A team:", { id: team.id, name: team.name, season_id: team.season_id, club_id: team.club_id });

  const { data: activeSeason } = await supabase.from('seasons').select('*').eq('club_id', team.club_id).eq('is_active', true).single();
  console.log("Active season:", activeSeason);

  const { data: events, count } = await supabase
    .from('team_events')
    .select('id, title, event_type, date, start_time, season_id, team_id', { count: 'exact' })
    .eq('team_id', team.id);

  console.log(`Total team_events for Cadete A in DB: ${count}`);
  console.log("Sample 5 team_events:", events?.slice(0, 5));

  // Check event types breakdown
  const partidosCount = events?.filter(e => e.event_type === 'Partido').length;
  const entrenamientosCount = events?.filter(e => e.event_type === 'Entrenamiento').length;
  console.log(`Partidos: ${partidosCount} | Entrenamientos: ${entrenamientosCount}`);

  // Check season_id matching
  const matchingSeasonCount = events?.filter(e => e.season_id === activeSeason?.id).length;
  console.log(`Events matching activeSeason.id ('${activeSeason?.id}'): ${matchingSeasonCount}`);

  // Check dates range
  const dates = (events || []).map(e => e.date).sort();
  console.log(`Dates range in DB: ${dates[0]} to ${dates[dates.length - 1]}`);

  // Check events for August 2026 (current month)
  const aug2026Events = events?.filter(e => e.date?.startsWith('2026-08'));
  console.log(`Events in August 2026: ${aug2026Events?.length || 0}`);
  if (aug2026Events && aug2026Events.length > 0) {
    console.log("Sample August 2026 events:", aug2026Events.slice(0, 5));
  }
}

debugVisibility();
