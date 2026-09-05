import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('=== 1. INTERNAL MATCHES (matches table) ===');
  const { data: matches, count: mCount } = await supabase
    .from('matches')
    .select('*, team:teams(id, name, category, ffcv_group_id, ffcv_team_id)', { count: 'exact' });
  
  console.log(`Total internal matches in DB: ${mCount}`);
  if (matches && matches.length > 0) {
    console.table(matches.map(m => ({
      id: m.id,
      equipo_id: m.equipo_id,
      team_name: m.team?.name,
      rival: m.rival || m.rival_nombre,
      jornada: m.jornada,
      fecha_hora: m.fecha_hora,
      estado: m.estado,
      resultado_propio: m.resultado_propio,
      resultado_rival: m.resultado_rival,
      ffcv_match_id: m.ffcv_match_id || (m as any).codacta || (m as any).ffcv_id || 'NONE'
    })));
  }

  console.log('\n=== 2. STANDINGS BY GROUP & MATCHDAY (ffcv_standings table) ===');
  const { data: standings } = await supabase
    .from('ffcv_standings')
    .select('ffcv_group_id, ffcv_season_id, matchday, team_name, points, position');

  const groupMatchdays = new Map<string, Set<number>>();
  for (const s of standings || []) {
    const key = `Season ${s.ffcv_season_id} | Group ${s.ffcv_group_id}`;
    if (!groupMatchdays.has(key)) groupMatchdays.set(key, new Set());
    groupMatchdays.get(key)!.add(s.matchday);
  }

  for (const [grp, jSet] of groupMatchdays.entries()) {
    const sortedJ = Array.from(jSet).sort((a, b) => a - b);
    console.log(`- ${grp}: Matchdays present in DB: [${sortedJ.join(', ')}] (Total records for group: ${standings?.filter(s => `Season ${s.ffcv_season_id} | Group ${s.ffcv_group_id}` === grp).length})`);
  }

  console.log('\n=== 3. CHECK TABLE COLUMNS OF matches ===');
  // Check sample match object keys
  const { data: sampleMatch } = await supabase.from('matches').select('*').limit(1);
  if (sampleMatch && sampleMatch.length > 0) {
    console.log('Columns in matches table:', Object.keys(sampleMatch[0]));
  }
}

inspect().catch(console.error);
