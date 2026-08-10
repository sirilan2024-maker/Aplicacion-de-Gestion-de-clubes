process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetMatches(seasonId = null) {
  console.log("Iniciando borrado de partidos...");

  // 1. Obtener IDs de partidos a borrar
  let query = supabase.from('partidos').select('id');
  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }
  const { data: partidos, error: fetchErr } = await query;

  if (fetchErr) {
    console.error("Error obteniendo partidos:", fetchErr);
    return;
  }

  if (!partidos || partidos.length === 0) {
    console.log("No se encontraron partidos para borrar.");
    return;
  }

  const partidoIds = partidos.map(p => p.id);
  console.log(`Se eliminarán ${partidoIds.length} partidos y sus datos vinculados.`);

  // 2. Eliminar eventos de directo (match_events)
  console.log("Eliminando match_events...");
  const { error: evErr } = await supabase
    .from('match_events')
    .delete()
    .in('partido_id', partidoIds);

  if (evErr) console.error("Error al borrar match_events:", evErr.message);
  else console.log("-> match_events borrados.");

  // 3. Eliminar convocatorias
  console.log("Eliminando convocatorias...");
  const { error: convErr } = await supabase
    .from('convocatorias')
    .delete()
    .in('partido_id', partidoIds);

  if (convErr) console.error("Error al borrar convocatorias:", convErr.message);
  else console.log("-> convocatorias borradas.");

  // 4. Eliminar partidos
  console.log("Eliminando partidos...");
  const { error: matchErr } = await supabase
    .from('partidos')
    .delete()
    .in('id', partidoIds);

  if (matchErr) console.error("Error al borrar partidos:", matchErr.message);
  else console.log("-> partidos borrados exitosamente.");

  // 5. Vaciar bucket de actas (actas-partidos)
  console.log("Limpiando bucket 'actas-partidos'...");
  try {
    const { data: pendingObjects } = await supabase.storage.from('actas-partidos').list('pending', { limit: 1000 });
    if (pendingObjects && pendingObjects.length > 0) {
      const paths = pendingObjects.map(o => `pending/${o.name}`);
      await supabase.storage.from('actas-partidos').remove(paths);
      console.log(`-> Eliminados ${paths.length} archivos de 'pending/'.`);
    }

    const { data: partidosObjects } = await supabase.storage.from('actas-partidos').list('partidos', { limit: 1000 });
    if (partidosObjects && partidosObjects.length > 0) {
      for (const folder of partidosObjects) {
        const { data: innerFiles } = await supabase.storage.from('actas-partidos').list(`partidos/${folder.name}`);
        if (innerFiles && innerFiles.length > 0) {
          const innerPaths = innerFiles.map(f => `partidos/${folder.name}/${f.name}`);
          await supabase.storage.from('actas-partidos').remove(innerPaths);
        }
      }
      console.log(`-> Limpiadas carpetas de actas asignadas en 'partidos/'.`);
    }
  } catch (stErr) {
    console.error("Error al vaciar actas-partidos:", stErr);
  }

  console.log("\n¡Limpieza completada con éxito!");
}

// Ejecutar para todos los partidos si se llama directamente
const argSeason = process.argv[2] || null;
resetMatches(argSeason).catch(console.error);
