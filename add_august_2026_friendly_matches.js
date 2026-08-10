import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAugustMatches() {
  console.log("=== CREANDO PARTIDOS AMISTOSOS EN AGOSTO 2026 PARA CADETE A ===");

  const { data: team } = await supabase.from('teams').select('id, club_id, season_id').eq('name', 'CADETE A').single();
  const seasonId = team.season_id || '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

  const augustMatches = [
    {
      club_id: team.club_id,
      equipo_id: team.id,
      season_id: seasonId,
      rival_nombre: 'Elche C.F. "B"',
      lugar: 'Local',
      fecha_hora: '2026-08-15T10:00:00+02:00',
      estado: 'Programado',
      resultado_propio: null,
      resultado_rival: null
    },
    {
      club_id: team.club_id,
      equipo_id: team.id,
      season_id: seasonId,
      rival_nombre: 'Hércules C.F. "B"',
      lugar: 'Local',
      fecha_hora: '2026-08-22T10:30:00+02:00',
      estado: 'Programado',
      resultado_propio: null,
      resultado_rival: null
    },
    {
      club_id: team.club_id,
      equipo_id: team.id,
      season_id: seasonId,
      rival_nombre: 'C.F. Intercity',
      lugar: 'Visitante',
      fecha_hora: '2026-08-29T11:00:00+02:00',
      estado: 'Programado',
      resultado_propio: null,
      resultado_rival: null
    }
  ];

  // 1. Insert in partidos
  const { data: insPartidos, error: pErr } = await supabase.from('partidos').insert(augustMatches).select();
  if (pErr) console.error("Error insertando en partidos:", pErr.message);
  else console.log(`✅ ${insPartidos?.length || 0} partidos amistosos creados en 'partidos' para Agosto 2026.`);

  // 2. Insert in team_events
  const augustEvents = [
    {
      team_id: team.id,
      season_id: seasonId,
      title: 'Cadete A vs Elche C.F. "B"',
      notes: 'Amistoso de Pretemporada',
      event_type: 'Partido',
      date: '2026-08-15',
      start_time: '10:00:00',
      end_time: '11:45:00',
      location: 'Polideportivo Municipal del Saladar'
    },
    {
      team_id: team.id,
      season_id: seasonId,
      title: 'Cadete A vs Hércules C.F. "B"',
      notes: 'Amistoso de Pretemporada',
      event_type: 'Partido',
      date: '2026-08-22',
      start_time: '10:30:00',
      end_time: '12:15:00',
      location: 'Polideportivo Municipal del Saladar'
    },
    {
      team_id: team.id,
      season_id: seasonId,
      title: 'C.F. Intercity vs Cadete A',
      notes: 'Amistoso de Pretemporada',
      event_type: 'Partido',
      date: '2026-08-29',
      start_time: '11:00:00',
      end_time: '12:45:00',
      location: 'Campo Municipal Antonio Solana'
    }
  ];

  const { data: insEvents, error: eErr } = await supabase.from('team_events').insert(augustEvents).select();
  if (eErr) console.error("Error insertando en team_events:", eErr.message);
  else console.log(`✅ ${insEvents?.length || 0} eventos de tipo 'Partido' creados en 'team_events' para Agosto 2026.`);
}

addAugustMatches();
