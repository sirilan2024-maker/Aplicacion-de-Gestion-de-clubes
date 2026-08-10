import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchPlayerInList(nameRaw, playersList) {
  if (!nameRaw || !playersList || playersList.length === 0) return null;
  const normTarget = normalizeName(nameRaw);
  const targetTokens = normTarget.split(' ').filter(w => w.length > 2);

  let bestPlayer = null;
  let maxScore = 0;

  for (const player of playersList) {
    const fullName = normalizeName(`${player.last_name} ${player.first_name}`);
    const revName = normalizeName(`${player.first_name} ${player.last_name}`);
    const playerTokens = [...fullName.split(' '), ...revName.split(' ')].filter(w => w.length > 2);

    let score = 0;
    targetTokens.forEach(token => {
      if (playerTokens.some(pt => pt.includes(token) || token.includes(pt))) {
        score += 1;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestPlayer = player;
    }
  }

  return maxScore >= 1 ? bestPlayer : null;
}

async function reconcileAllActasAndStats() {
  console.log("=== INICIANDO EXTRACCIÓN DETALLADA DE ACTAS Y CONCILIACIÓN ESTADÍSTICA ===\n");

  const { data: partidos } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, equipo_id, acta_oficial_url, resultado_propio, resultado_rival')
    .not('acta_oficial_url', 'is', null);

  console.log(`Encontrados ${partidos?.length || 0} partidos con acta oficial vinculada.`);

  let totalGoalsExtracted = 0;
  let totalCardsExtracted = 0;
  let totalMatchesProcessed = 0;

  for (const partido of partidos || []) {
    const isUsLocal = partido.lugar === 'Local';
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Procesando Partido ID: ${partido.id} | Fecha: ${partido.fecha_hora?.split('T')[0]} | ${partido.lugar} vs ${partido.rival_nombre}`);

    // Obtener jugadores del equipo
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal')
      .eq('team_id', partido.equipo_id);

    // Descargar acta PDF
    const { data: fileData } = await supabase.storage.from('actas-partidos').download(partido.acta_oficial_url);
    if (!fileData) continue;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfRes = await pdfParse(buffer);
    const text = pdfRes.text.replace(/\r/g, '');

    // 1. EXTRAER GOLES
    const matchEventsToInsert = [];
    const resIdx = text.indexOf("GOLES MARCADOS");
    if (resIdx !== -1) {
      const endIdx = text.indexOf("TARJETAS", resIdx);
      const goalsChunk = text.substring(resIdx, endIdx !== -1 ? endIdx : resIdx + 2000);

      const goalLines = goalsChunk.match(/\(\d+['\+\d]*\)\s*([^\n\(\)]+?)(Gol|Gol en propia|Penalty|penalty)/gi);
      goalLines?.forEach(gl => {
        const match = gl.match(/\((\d+)['\+\d]*\)\s*([^\n\(\)]+?)(Gol|Gol en propia|Penalty|penalty)/i);
        if (match) {
          const minutoStr = match[1].replace(/['+]/g, '');
          const minuto = parseInt(minutoStr, 10);
          const nameRaw = match[2].trim();
          const tipoStr = match[3].toLowerCase();

          let tipo_evento = 'Gol';
          if (tipoStr.includes('propia')) tipo_evento = 'Gol en propia puerta';
          else if (tipoStr.includes('penalty')) tipo_evento = 'Gol';

          const matchedPlayer = matchPlayerInList(nameRaw, teamPlayers);

          matchEventsToInsert.push({
            partido_id: partido.id,
            player_id: matchedPlayer ? matchedPlayer.id : null,
            tipo_evento: tipo_evento,
            minuto: isNaN(minuto) ? 1 : minuto,
            notas: matchedPlayer ? `Gol por ${matchedPlayer.first_name} ${matchedPlayer.last_name}` : `Gol por ${nameRaw}`
          });

          if (matchedPlayer) totalGoalsExtracted++;
        }
      });
    }

    // 2. EXTRAER TARJETAS
    const tarjIdx = text.indexOf("TARJETAS");
    if (tarjIdx !== -1) {
      const endIdx = text.indexOf("FIRMA DE LOS DELEGADOS", tarjIdx);
      const tarjChunk = text.substring(tarjIdx, endIdx !== -1 ? endIdx : tarjIdx + 2000);

      const cardLines = tarjChunk.match(/\(\d+['\+\d]*\)\s*([^\n\(\)]+?)(Amarilla|Roja|Doble Amarilla)/gi);
      cardLines?.forEach(cl => {
        const match = cl.match(/\((\d+)['\+\d]*\)\s*([^\n\(\)]+?)(Amarilla|Roja|Doble Amarilla)/i);
        if (match) {
          const minutoStr = match[1].replace(/['+]/g, '');
          const minuto = parseInt(minutoStr, 10);
          const nameRaw = match[2].trim();
          const cardStr = match[3].toLowerCase();

          const tipo_evento = cardStr.includes('roja') || cardStr.includes('doble') ? 'Tarjeta Roja' : 'Tarjeta Amarilla';
          const matchedPlayer = matchPlayerInList(nameRaw, teamPlayers);

          if (matchedPlayer) {
            matchEventsToInsert.push({
              partido_id: partido.id,
              player_id: matchedPlayer.id,
              tipo_evento: tipo_evento,
              minuto: isNaN(minuto) ? 1 : minuto,
              notas: `${tipo_evento} a ${matchedPlayer.first_name} ${matchedPlayer.last_name}`
            });
            totalCardsExtracted++;
          }
        }
      });
    }

    // Limpiar e insertar match_events actualizados para el partido
    await supabase.from('match_events').delete().eq('partido_id', partido.id);
    if (matchEventsToInsert.length > 0) {
      await supabase.from('match_events').insert(matchEventsToInsert);
    }

    // 3. ACTUALIZAR CONVOCATORIAS DEL PARTIDO CON MINUTOS Y EVENTOS
    // Se estima titutalidad y 80 min por defecto para jugadores que han registrado goles o tarjetas o convocatoria
    const { data: convocatorias } = await supabase.from('convocatorias').select('*').eq('partido_id', partido.id);

    if (convocatorias && convocatorias.length > 0) {
      for (const conv of convocatorias) {
        const playerEvents = matchEventsToInsert.filter(e => e.player_id === conv.player_id);
        const golesCount = playerEvents.filter(e => e.tipo_evento === 'Gol').length;
        const amarillasCount = playerEvents.filter(e => e.tipo_evento === 'Tarjeta Amarilla').length;
        const rojasCount = playerEvents.filter(e => e.tipo_evento === 'Tarjeta Roja').length;

        const minutos = conv.status === 'convocado' || playerEvents.length > 0 ? 80 : 0;
        const esTitular = conv.status === 'convocado' || playerEvents.length > 0;

        await supabase.from('convocatorias').update({
          minutos_jugados: minutos,
          es_titular: esTitular,
          goles: golesCount,
          tarjetas_amarillas: amarillasCount,
          tarjetas_rojas: rojasCount
        }).eq('id', conv.id);
      }
    }

    totalMatchesProcessed++;
    console.log(`  ✅ Eventos extraídos para ${partido.lugar} vs ${partido.rival_nombre}: ${matchEventsToInsert.length} eventos insertados en BBDD.`);
  }

  console.log(`\n================================================================------`);
  console.log(`🎉 RECONCILIACIÓN COMPLETADA:`);
  console.log(`- Partidos procesados: ${totalMatchesProcessed}`);
  console.log(`- Goles atribuidos a jugadores: ${totalGoalsExtracted}`);
  console.log(`- Tarjetas atribuidas a jugadores: ${totalCardsExtracted}`);
}

reconcileAllActasAndStats();
