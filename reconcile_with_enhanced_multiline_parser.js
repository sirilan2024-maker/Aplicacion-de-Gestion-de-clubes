import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { parseFFCVActaEvents } from './src/lib/acta-events-parser.ts';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function reconcileAllActasEnhanced() {
  console.log("=== RECONCILIANDO TODAS LAS ACTAS CON EL PARSER MULTILÍNEA ROBUSTO ===");

  const { data: team } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);
  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url').eq('equipo_id', team.id);

  console.log(`Cargados ${players.length} jugadores y ${matches.length} partidos de Cadete A.`);

  let totalGolesInsertados = 0;
  let totalTarjetasInsertadas = 0;

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsedPdf = await pdfParse(buffer);
    const { goles, tarjetas } = parseFFCVActaEvents(parsedPdf.text, m.lugar === 'Local', 'CADETE A');

    // Limpiar match_events anteriores de este partido
    await supabase.from('match_events').delete().eq('partido_id', m.id);

    const matchEventsToInsert = [];
    const playerStatsMap = new Map(); // playerId -> { goals: 0, yellow: 0, red: 0 }

    // Helper para emparejar por nombre
    const findMatchingPlayer = (nameRaw) => {
      const cleaned = nameRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return players.find(p => {
        const fn = (p.first_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ln = (p.last_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cleaned.includes(ln) || (fn && cleaned.includes(fn));
      });
    };

    // Procesar goles
    for (const g of goles) {
      const found = findMatchingPlayer(g.nameRaw);
      const playerId = found ? found.id : null;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: playerId,
        tipo_evento: g.tipo,
        minuto: g.minuto,
        notas: found ? `Gol marcado por ${found.first_name} ${found.last_name}` : `Gol: ${g.nameRaw}`
      });

      if (playerId && g.tipo !== 'Gol en propia puerta') {
        const cur = playerStatsMap.get(playerId) || { goals: 0, yellow: 0, red: 0 };
        cur.goals += 1;
        playerStatsMap.set(playerId, cur);
      }
    }

    // Procesar tarjetas
    for (const t of tarjetas) {
      const found = findMatchingPlayer(t.nameRaw);
      const playerId = found ? found.id : null;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: playerId,
        tipo_evento: t.tipo,
        minuto: t.minuto,
        notas: found ? `${t.tipo} a ${found.first_name} ${found.last_name}` : `${t.tipo}: ${t.nameRaw}`
      });

      if (playerId) {
        const cur = playerStatsMap.get(playerId) || { goals: 0, yellow: 0, red: 0 };
        if (t.tipo === 'Tarjeta Amarilla') cur.yellow += 1;
        else cur.red += 1;
        playerStatsMap.set(playerId, cur);
      }
    }

    // Insertar en match_events
    if (matchEventsToInsert.length > 0) {
      await supabase.from('match_events').insert(matchEventsToInsert);
      totalGolesInsertados += goles.length;
      totalTarjetasInsertadas += tarjetas.length;
    }

    // Actualizar convocatorias para este partido
    for (const [pId, stats] of playerStatsMap.entries()) {
      await supabase.from('convocatorias').update({
        goals: stats.goals,
        yellow_cards: stats.yellow,
        red_cards: stats.red
      }).eq('partido_id', m.id).eq('player_id', pId);
    }
  }

  console.log(`\n✅ RECONCILIACIÓN COMPLETA FINALIZADA:`);
  console.log(`   - Goles registrados en 'match_events': ${totalGolesInsertados}`);
  console.log(`   - Tarjetas registradas en 'match_events': ${totalTarjetasInsertadas}`);
}

reconcileAllActasEnhanced();
