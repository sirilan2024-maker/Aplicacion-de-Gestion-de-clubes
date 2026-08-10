process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectRivals() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, lugar, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  console.log(`Total partidos en BD: ${matches?.length || 0}`);

  const suspicious = matches?.filter(m => 
    m.rival_nombre.toLowerCase().includes('campo') ||
    m.rival_nombre.toLowerCase().includes('ciutat') ||
    m.rival_nombre.toLowerCase().includes('mpal') ||
    m.rival_nombre.toLowerCase().includes('polideportivo') ||
    m.rival_nombre.toLowerCase().includes('pilar de hor')
  ) || [];

  console.log(`\nPartidos con rival sospechoso (nombre de campo en vez de equipo): ${suspicious.length}`);
  suspicious.forEach(s => {
    console.log(`- Partido ${s.id} (${s.equipo?.name} - ${new Date(s.fecha_hora).toLocaleDateString('es-ES')}): Rival actual => "${s.rival_nombre}"`);
  });
}

inspectRivals().catch(console.error);
