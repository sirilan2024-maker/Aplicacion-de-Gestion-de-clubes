process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAllActasUrls() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo:teams(name)')
    .not('acta_oficial_url', 'is', null);

  console.log(`Partidos con acta_oficial_url en la BD: ${matches?.length || 0}`);

  for (const m of matches || []) {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('actas-partidos')
      .createSignedUrl(m.acta_oficial_url, 900);

    if (signedErr) {
      console.error(`❌ Error en partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}) - Path "${m.acta_oficial_url}":`, signedErr.message);
    } else {
      console.log(`✅ OK partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}):`, signedData.signedUrl);
    }
  }
}

testAllActasUrls().catch(console.error);
