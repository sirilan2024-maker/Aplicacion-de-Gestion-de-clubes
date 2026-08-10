process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectCadeteB() {
  // Buscar equipo Cadete B
  const { data: teams } = await supabase.from('teams').select('*');
  const cadeteB = teams?.find(t => t.name.toUpperCase().includes('CADETE B') || t.name.toUpperCase().includes('CADETE "B"'));

  console.log("Equipos encontrados en DB:", teams?.map(t => ({ id: t.id, name: t.name })));
  console.log("Equipo Cadete B identificado:", cadeteB);

  // Consultar partidos de Cadete B
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo_id, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  const cadeteBMatches = matches?.filter(m => cadeteB && m.equipo_id === cadeteB.id) || [];
  console.log(`\nTotal partidos de Cadete B en DB: ${cadeteBMatches.length}`);
  cadeteBMatches.forEach(m => {
    console.log(`- Match ${m.id} (${new Date(m.fecha_hora).toLocaleDateString('es-ES')} vs ${m.rival_nombre}): Acta => ${m.acta_oficial_url || 'NULL (SIN ACTA)'}`);
  });

  // Consultar archivos en pending/
  const { data: pendingFiles } = await supabase.storage
    .from('actas-partidos')
    .list('pending', { limit: 100 });

  console.log(`\nArchivos actualmente en la carpeta 'pending': ${pendingFiles?.length || 0}`);
  if (pendingFiles && pendingFiles.length > 0) {
    console.log("Ejemplos en pending:", pendingFiles.slice(0, 10).map(f => f.name));
  }
}

inspectCadeteB().catch(console.error);
