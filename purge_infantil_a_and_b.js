import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeInfantilAandB() {
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║ ELIMINACIÓN DE PARTIDOS, ACTAS Y EVENTOS DE INFANTIL A E INFANTIL B          ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  // Obtener IDs de los equipos Infantil A e Infantil B
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .or('name.ilike.%INFANTIL A%,name.ilike.%INFANTIL B%');

  console.log("📌 Equipos identificados para purga:", teams);

  for (const team of teams || []) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`🗑️ PROCESANDO PURGA PARA EQUIPO: "${team.name}" (ID: ${team.id})`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Obtener partidos de este equipo
    const { data: matches } = await supabase
      .from('partidos')
      .select('id, rival_nombre, acta_oficial_url')
      .eq('equipo_id', team.id);

    console.log(`   Partidos encontrados: ${matches?.length || 0}`);

    const matchIds = (matches || []).map(m => m.id);

    if (matchIds.length > 0) {
      // 2. Eliminar eventos de partidos (match_events)
      const { count: deletedEventsCount } = await supabase
        .from('match_events')
        .delete({ count: 'exact' })
        .in('partido_id', matchIds);

      console.log(`   - Eventos eliminados (match_events): ${deletedEventsCount || 0}`);

      // 3. Eliminar convocatorias asociadas (convocatorias)
      const { count: deletedConvsCount } = await supabase
        .from('convocatorias')
        .delete({ count: 'exact' })
        .in('partido_id', matchIds);

      console.log(`   - Convocatorias eliminadas: ${deletedConvsCount || 0}`);

      // 4. Eliminar archivos PDF del Storage (actas-partidos)
      let pdfsDeletedCount = 0;
      for (const m of matches || []) {
        if (m.acta_oficial_url) {
          const { error: deleteStorageErr } = await supabase.storage
            .from('actas-partidos')
            .remove([m.acta_oficial_url]);

          if (!deleteStorageErr) pdfsDeletedCount++;
        }
        
        // También limpiar carpeta por si acaso
        const { data: folderFiles } = await supabase.storage
          .from('actas-partidos')
          .list(`partidos/${m.id}`);

        if (folderFiles && folderFiles.length > 0) {
          const pathsToRemove = folderFiles.map(f => `partidos/${m.id}/${f.name}`);
          await supabase.storage.from('actas-partidos').remove(pathsToRemove);
        }
      }

      console.log(`   - Archivos PDF borrados de Storage: ${pdfsDeletedCount}`);

      // 5. Eliminar partidos de la tabla partidos
      const { count: deletedMatchesCount } = await supabase
        .from('partidos')
        .delete({ count: 'exact' })
        .eq('equipo_id', team.id);

      console.log(`   - Partidos borrados de DB: ${deletedMatchesCount || 0}`);
    }

    // 6. Resetear estadísticas de goles, tarjetas amonestadas de la plantilla del equipo
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', team.id);

    if (players && players.length > 0) {
      const playerIds = players.map(p => p.id);
      await supabase
        .from('players')
        .update({ goals: 0, yellow_cards: 0, red_cards: 0 })
        .in('id', playerIds);

      console.log(`   - Estadísticas reseteadas para ${players.length} jugadores de la plantilla.`);
    }
  }

  console.log(`\n================================================================================`);
  console.log(`🎉 PURGA DE INFANTIL A E INFANTIL B COMPLETADA CON ÉXITO.`);
  console.log(`================================================================================\n`);
}

purgeInfantilAandB();
