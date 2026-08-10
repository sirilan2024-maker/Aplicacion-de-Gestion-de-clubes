process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectAndFixRivals() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, lugar, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  const suspicious = matches?.filter(m => 
    m.rival_nombre.toLowerCase().includes('campo') ||
    m.rival_nombre.toLowerCase().includes('ciutat') ||
    m.rival_nombre.toLowerCase().includes('mpal') ||
    m.rival_nombre.toLowerCase().includes('polideportivo') ||
    m.rival_nombre.toLowerCase().includes('pilar de hor')
  ) || [];

  console.log(`Encontrados ${suspicious.length} partidos con nombres de campo en rival_nombre:\n`);
  suspicious.forEach(m => {
    console.log(`ID: ${m.id} | Fecha: ${new Date(m.fecha_hora).toLocaleDateString('es-ES')} | Equipo: ${m.equipo?.name} | Rival erróneo: "${m.rival_nombre}"`);
  });
}

inspectAndFixRivals().catch(console.error);
