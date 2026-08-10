process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCadeteBStatus() {
  const { data: teams } = await supabase.from('teams').select('*');
  const cadeteB = teams?.find(t => t.name.toUpperCase().includes('CADETE B') || t.name.toUpperCase().includes('CADETE "B"'));

  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url')
    .eq('equipo_id', cadeteB.id)
    .order('fecha_hora', { ascending: true });

  const total = matches?.length || 0;
  const realMatches = matches?.filter(m => !m.rival_nombre.toLowerCase().includes('descansa')) || [];
  const withActa = realMatches.filter(m => Boolean(m.acta_oficial_url));

  console.log(`Partidos de Cadete B en BD: ${total} (de los cuales ${realMatches.length} son jugados)`);
  console.log(`Partidos de Cadete B con acta enlazada: ${withActa.length} / ${realMatches.length}`);

  matches.forEach(m => {
    console.log(`- ${new Date(m.fecha_hora).toLocaleDateString('es-ES')} vs ${m.rival_nombre}: ${m.acta_oficial_url ? '🟢 OK' : '🔴 PENDIENTE/SIN ACTA'}`);
  });
}

checkCadeteBStatus().catch(console.error);
