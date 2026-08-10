process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMatchesWithActas() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  const total = matches?.length || 0;
  const withActa = matches?.filter(m => Boolean(m.acta_oficial_url)) || [];

  console.log(`Partidos totales en BD: ${total}`);
  console.log(`Partidos con acta enlazada: ${withActa.length}/${total}`);
}

verifyMatchesWithActas().catch(console.error);
