import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPartidos() {
  console.log('=== INTERNAL PARTIDOS (table: partidos) ===');
  const { data: partidos, count } = await supabase
    .from('partidos')
    .select('*, equipo:teams(id, name, category, ffcv_group_id, ffcv_team_id)', { count: 'exact' });

  console.log(`Total internal partidos in DB: ${count}`);
  
  if (partidos && partidos.length > 0) {
    console.log('\nSample columns:', Object.keys(partidos[0]));
    console.log('\nList of internal partidos:');
    for (const p of partidos) {
      console.log(`[${p.equipo?.name}] ID: ${p.id} | Rival: ${p.rival_nombre} | Fecha: ${p.fecha_hora} | Lugar: ${p.lugar} | Estado: ${p.estado} | Propio: ${p.resultado_propio} - Rival: ${p.resultado_rival} | J: ${p.jornada || '-'}`);
    }
  }
}

inspectPartidos().catch(console.error);
