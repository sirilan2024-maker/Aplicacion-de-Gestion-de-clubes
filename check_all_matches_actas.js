process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllMatchesActas() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, acta_oficial_url, equipo:teams(name)')
    .order('fecha_hora', { ascending: true });

  console.log(`Total partidos en la base de datos: ${matches?.length || 0}`);

  const withActa = matches?.filter(m => Boolean(m.acta_oficial_url)) || [];
  const withoutActa = matches?.filter(m => !m.acta_oficial_url) || [];

  console.log(`Partidos CON acta_oficial_url en DB: ${withActa.length}`);
  console.log(`Partidos SIN acta_oficial_url en DB: ${withoutActa.length}`);

  let brokenUrls = 0;
  for (const m of withActa) {
    const { data, error } = await supabase.storage
      .from('actas-partidos')
      .createSignedUrl(m.acta_oficial_url, 900);

    if (error) {
      brokenUrls++;
      console.error(`❌ ERROR en partido ${m.id} (${m.equipo?.name} vs ${m.rival_nombre}): Path "${m.acta_oficial_url}" =>`, error.message);
    }
  }

  if (brokenUrls === 0) {
    console.log(`\n✅ ¡Los ${withActa.length} partidos que tienen acta en DB generan su URL firmada SIN NINGÚN ERROR!`);
  } else {
    console.log(`\n⚠️ Hay ${brokenUrls} partidos con ruta rota.`);
  }

  // Agrupar por equipo partidos con y sin acta
  const teamsMap = {};
  matches?.forEach(m => {
    const tName = m.equipo?.name || 'Sin Equipo';
    if (!teamsMap[tName]) teamsMap[tName] = { total: 0, conActa: 0, sinActa: 0 };
    teamsMap[tName].total++;
    if (m.acta_oficial_url) teamsMap[tName].conActa++;
    else teamsMap[tName].sinActa++;
  });

  console.log("\nResumen por Equipo:");
  console.table(teamsMap);
}

checkAllMatchesActas().catch(console.error);
