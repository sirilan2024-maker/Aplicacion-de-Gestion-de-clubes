process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugStorageObjects() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  console.log(`Analizando ${matches?.length || 0} partidos...`);

  for (const m of matches || []) {
    if (!m.acta_oficial_url) {
      console.log(`Partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}): SIN ACTA EN DB (acta_oficial_url es NULL)`);
      continue;
    }

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('actas-partidos')
      .createSignedUrl(m.acta_oficial_url, 900);

    if (signedErr) {
      console.error(`❌ Partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}): ERROR Storage "${m.acta_oficial_url}":`, signedErr.message);
    } else {
      console.log(`✅ Partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}): OK! URL firmada generada:`, signedData.signedUrl.substring(0, 60) + "...");
    }
  }
}

debugStorageObjects().catch(console.error);
