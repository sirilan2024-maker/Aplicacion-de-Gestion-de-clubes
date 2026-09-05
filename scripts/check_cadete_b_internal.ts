import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCadeteB() {
  const cadeteBTeamId = '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50';
  const { data: matches } = await supabase
    .from('partidos')
    .select('*')
    .eq('equipo_id', cadeteBTeamId)
    .order('fecha_hora', { ascending: true });

  console.log(`Total internal matches for Cadete B: ${matches?.length}`);
  matches?.forEach((m, idx) => {
    console.log(`[${idx + 1}] ID: ${m.id} | Fecha: ${m.fecha_hora} | Rival: "${m.rival_nombre}" | Lugar: ${m.lugar} | Estado: ${m.estado} | Marcador: ${m.resultado_propio} - ${m.resultado_rival}`);
  });
}

checkCadeteB().catch(console.error);
