import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTeams() {
  console.log("=== CHECKING ALL TEAMS, PARTIDOS AND TEAM_EVENTS ===");

  const { data: teams } = await supabase.from('teams').select('id, name, club_id, season_id');
  console.log("Equipos en DB:", teams);

  for (const t of teams || []) {
    const { data: partidos } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar').eq('equipo_id', t.id);
    const { data: events } = await supabase.from('team_events').select('id, event_type, date, season_id').eq('team_id', t.id);

    const partidoEvents = events?.filter(e => e.event_type === 'Partido') || [];
    const entrenamientos = events?.filter(e => e.event_type === 'Entrenamiento') || [];

    console.log(`Equipo '${t.name}' (ID: ${t.id}):`);
    console.log(`  - Partidos en tabla 'partidos': ${partidos?.length || 0}`);
    console.log(`  - Eventos 'Partido' en 'team_events': ${partidoEvents.length}`);
    console.log(`  - Eventos 'Entrenamiento' en 'team_events': ${entrenamientos.length}`);
  }
}

checkAllTeams();
