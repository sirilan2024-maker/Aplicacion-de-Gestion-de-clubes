import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCadeteB() {
  const cadeteBTeamId = '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50';
  const { data: matches } = await supabase
    .from('partidos')
    .select('*')
    .eq('equipo_id', cadeteBTeamId)
    .order('fecha_hora', { ascending: true });

  console.log(`Internal matches for Cadete B: ${matches?.length}`);
  for (const m of matches || []) {
    console.log(`ID: ${m.id} | Rival: "${m.rival_nombre}" | Fecha: ${m.fecha_hora} | Lugar: ${m.lugar} | Estado: ${m.estado} | Marcador: ${m.resultado_propio} - ${m.resultado_rival} | J: ${m.jornada || '-'}`);
  }

  // Also check FFCV matches for Cadete B (group 29509514)
  console.log('\nFFCV Matches for Cadete B (Group 29509514):');
  const { data: ffcvMatches } = await supabase
    .from('ffcv_matches')
    .select('*')
    .eq('ffcv_group_id', '29509514')
    .or('home_team_name.ilike.%Saladar%,away_team_name.ilike.%Saladar%')
    .order('matchday', { ascending: true });

  console.log(`FFCV matches involving Saladar: ${ffcvMatches?.length}`);
  for (const fm of ffcvMatches || []) {
    console.log(`J${fm.matchday}: ${fm.home_team_name} (${fm.home_score}) vs ${fm.away_team_name} (${fm.away_score}) | Status: ${fm.status} | Date: ${fm.match_date} ${fm.match_time} | Match ID: ${fm.ffcv_match_id} | Codacta: ${fm.codacta}`);
  }
}

inspectCadeteB().catch(console.error);
