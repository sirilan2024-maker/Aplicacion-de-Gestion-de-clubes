import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTeamsJ1() {
  const { data: teams } = await supabase.from('teams').select('id, name, ffcv_group_id, ffcv_team_id').order('name');
  
  for (const t of teams || []) {
    if (!t.ffcv_group_id) continue;
    const { data: ffcvJ1 } = await supabase
      .from('ffcv_matches')
      .select('*')
      .eq('ffcv_group_id', t.ffcv_group_id)
      .eq('matchday', 1)
      .or(`home_team_name.ilike.%Saladar%,away_team_name.ilike.%Saladar%`);

    const { data: internalFirst } = await supabase
      .from('partidos')
      .select('*')
      .eq('equipo_id', t.id)
      .order('fecha_hora', { ascending: true })
      .limit(1);

    console.log(`\n=== Team: ${t.name} ===`);
    console.log('FFCV J1 Match:', ffcvJ1?.map(m => `${m.home_team_name} (${m.home_score}) vs ${m.away_team_name} (${m.away_score}) [Fecha: ${m.match_date} ${m.match_time}, codacta: ${m.codacta}]`));
    console.log('Internal First Match in partidos:', internalFirst?.map(m => `Rival: "${m.rival_nombre}" [Lugar: ${m.lugar}, Fecha: ${m.fecha_hora}, Score: ${m.resultado_propio}-${m.resultado_rival}, Estado: ${m.estado}]`));
  }
}

checkAllTeamsJ1().catch(console.error);
