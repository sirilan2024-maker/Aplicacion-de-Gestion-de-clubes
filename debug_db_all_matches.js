import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDbMatches() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, estado, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  console.log(`\n================ ALL ${matches?.length || 0} MATCHES IN DB ================`);
  matches?.forEach((m, i) => {
    const d = new Date(m.fecha_hora);
    console.log(`${(i+1).toString().padStart(2, ' ')}. [${m.fecha_hora}] (LocalTime: ${d.toLocaleString('es-ES')}) | ${m.lugar.padStart(9, ' ')} vs ${m.rival_nombre}`);
  });
}

debugDbMatches();
