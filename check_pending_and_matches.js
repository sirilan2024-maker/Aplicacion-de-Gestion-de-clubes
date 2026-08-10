process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectStorageAndMatches() {
  const { data: matches, error: matchErr } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo:teams(name)');
  
  console.log(`Total partidos en BD: ${matches?.length || 0}`);
  if (matches && matches.length > 0) {
    console.log("Primeros partidos:", matches.slice(0, 5));
  }

  // Listar objetos en el bucket actas-partidos
  const { data: pendingObjects, error: pendingErr } = await supabase.storage
    .from('actas-partidos')
    .list('pending', { limit: 100 });

  console.log(`Objetos en carpeta 'pending': ${pendingObjects?.length || 0}`);
  if (pendingObjects && pendingObjects.length > 0) {
    console.log("Ejemplos de pending:", pendingObjects.slice(0, 5).map(o => o.name));
  }

  const { data: partidosObjects, error: pObjErr } = await supabase.storage
    .from('actas-partidos')
    .list('partidos', { limit: 100 });

  console.log(`Carpetas en 'partidos': ${partidosObjects?.length || 0}`);
}

inspectStorageAndMatches().catch(console.error);
