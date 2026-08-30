// ============================================================================
// BLINDAJE DE SEGURIDAD CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN (P17-C9)
// ============================================================================
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_EXECUTION !== 'true') {
  console.error('\n[SEGURIDAD CRÍTICA] Ejecución abortada.');
  console.error('Este script genera datos de prueba/seed y está terminantemente PROHIBIDO en producción.');
  console.error('Para ejecutarlo en un entorno de desarrollo aislado, define explícitamente:');
  console.error('  ALLOW_SEED_EXECUTION=true y asegúrate de no apuntar a producción.\n');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncConvocatoriasAndStats() {
  console.log("=== SINCRONIZANDO CONVOCATORIAS Y ESTADÍSTICAS DEL CLUB (SCHEMA EXACTO) ===");

  const { data: partidos } = await supabase
    .from('partidos')
    .select('id, equipo_id, estado')
    .eq('estado', 'Finalizado');

  console.log(`Encontrados ${partidos?.length || 0} partidos finalizados.`);

  let convInserted = 0;

  for (const partido of partidos || []) {
    // Obtener jugadores del equipo
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', partido.equipo_id);

    // Obtener match_events del partido
    const { data: events } = await supabase
      .from('match_events')
      .select('*')
      .eq('partido_id', partido.id);

    if (players && players.length > 0) {
      const convocatoriasToInsert = [];

      for (const player of players) {
        const playerEvents = (events || []).filter(e => e.player_id === player.id);
        const golesCount = playerEvents.filter(e => e.tipo_evento === 'Gol').length;
        const amarillasCount = playerEvents.filter(e => e.tipo_evento === 'Tarjeta Amarilla').length;
        const rojasCount = playerEvents.filter(e => e.tipo_evento === 'Tarjeta Roja').length;

        const convocado = playerEvents.length > 0;
        const minutos = convocado ? 80 : 0;

        convocatoriasToInsert.push({
          partido_id: partido.id,
          player_id: player.id,
          status: 'convocado',
          goals: golesCount,
          yellow_cards: amarillasCount,
          red_cards: rojasCount,
          minutes_played: minutos
        });
      }

      await supabase.from('convocatorias').delete().eq('partido_id', partido.id);
      const { data: insData, error: insErr } = await supabase.from('convocatorias').insert(convocatoriasToInsert).select();
      if (!insErr) {
        convInserted += insData?.length || 0;
      } else {
        console.warn(`Error insertando convocatorias para partido ${partido.id}:`, insErr.message);
      }
    }
  }

  console.log(`✅ Convocatorias sincronizadas con éxito: ${convInserted} registros de convocatorias creados para partidos finalizados.`);
}

syncConvocatoriasAndStats();
