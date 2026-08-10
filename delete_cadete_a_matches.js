process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteCadeteAMatches() {
  console.log("Buscando el equipo CADETE A...");

  // 1. Obtener ID del equipo Cadete A
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', '%CADETE A%');

  if (teamErr || !teams || teams.length === 0) {
    console.error("No se encontró el equipo CADETE A:", teamErr?.message);
    return;
  }

  const cadeteAId = teams[0].id;
  console.log(`Equipo encontrado: "${teams[0].name}" (ID: ${cadeteAId})`);

  // 2. Obtener partidos de Cadete A
  const { data: partidos, error: fetchErr } = await supabase
    .from('partidos')
    .select('id, acta_oficial_url')
    .eq('equipo_id', cadeteAId);

  if (fetchErr) {
    console.error("Error consultando partidos:", fetchErr);
    return;
  }

  if (!partidos || partidos.length === 0) {
    console.log("El equipo CADETE A no tiene partidos en la base de datos.");
    return;
  }

  const partidoIds = partidos.map(p => p.id);
  console.log(`Encontrados ${partidoIds.length} partidos para eliminar.`);

  // 3. Eliminar eventos de directo (match_events)
  await supabase.from('match_events').delete().in('partido_id', partidoIds);
  console.log("-> match_events borrados.");

  // 4. Eliminar convocatorias
  await supabase.from('convocatorias').delete().in('partido_id', partidoIds);
  console.log("-> convocatorias borradas.");

  // 5. Eliminar actas de storage asociadas
  for (const p of partidos) {
    if (p.acta_oficial_url) {
      await supabase.storage.from('actas-partidos').remove([p.acta_oficial_url]);
    }
  }
  console.log("-> Actas del storage eliminadas.");

  // 6. Eliminar partidos de la tabla partidos
  const { error: delErr } = await supabase
    .from('partidos')
    .delete()
    .eq('equipo_id', cadeteAId);

  if (delErr) {
    console.error("Error eliminando partidos:", delErr.message);
  } else {
    console.log(`\n✅ ¡Se han borrado los ${partidoIds.length} partidos del CADETE A exitosamente!`);
  }
}

deleteCadeteAMatches().catch(console.error);
