import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { parseFFCVActaEvents } from './src/lib/acta-events-parser.ts';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function reconcileExactLocalVisitante() {
  console.log("=== RECONCILIANDO ESTRICTAMENTE LOCAL / VISITANTE Y JUGADORES ===");

  const { data: team } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);
  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url, resultado_propio, resultado_rival').eq('equipo_id', team.id);

  console.log(`Jugadores de plantilla: ${players.length}`);

  // Normalizar nombres de plantilla para matching
  const playerListClean = players.map(p => ({
    id: p.id,
    fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    fn: (p.first_name || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    ln: (p.last_name || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }));

  const matchPlayerName = (nameRaw) => {
    const cleaned = nameRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return playerListClean.find(p => {
      if (p.ln && cleaned.includes(p.ln)) return true;
      if (p.fn && cleaned.includes(p.fn) && p.fn.length > 3) return true;
      return false;
    });
  };

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsedPdf = await pdfParse(buffer);
    const text = parsedPdf.text;

    // Detectar quién es Local en el PDF
    // Formato FFCV: "EquipoSporting Saladar "A"EquipoRival"
    let pdfIsUsLocal = m.lugar === 'Local';
    const gIdx = text.indexOf("GOLES MARCADOS") !== -1 ? text.indexOf("GOLES MARCADOS") : text.indexOf("GOLES");
    if (gIdx !== -1) {
      const headerLine = text.substring(gIdx, gIdx + 200);
      const eqMatches = [...headerLine.matchAll(/Equipo([^\n\r\(\)]+)/g)];
      if (eqMatches.length >= 2) {
        const firstTeam = eqMatches[0][1].trim();
        pdfIsUsLocal = firstTeam.toLowerCase().includes("sporting") || firstTeam.toLowerCase().includes("saladar");
      }
    }

    const realLugar = pdfIsUsLocal ? 'Local' : 'Visitante';

    // Parsear eventos del PDF
    const { goles, tarjetas } = parseFFCVActaEvents(text, pdfIsUsLocal, 'CADETE A');

    // Separar goles propios vs goles rivales
    let golesPropioCount = 0;
    let golesRivalCount = 0;

    const matchEventsToInsert = [];
    const playerStatsMap = new Map(); // playerId -> { goals: 0, yellow: 0, red: 0 }

    for (const g of goles) {
      const found = matchPlayerName(g.nameRaw);
      const isOurPlayer = Boolean(found);

      if (isOurPlayer && g.tipo !== 'Gol en propia puerta') {
        golesPropioCount++;
        const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
        cur.goals += 1;
        playerStatsMap.set(found.id, cur);
      } else if (!isOurPlayer && g.tipo !== 'Gol en propia puerta') {
        golesRivalCount++;
      } else if (isOurPlayer && g.tipo === 'Gol en propia puerta') {
        golesRivalCount++; // Gol en propia de nuestro jugador suma al rival
      } else if (!isOurPlayer && g.tipo === 'Gol en propia puerta') {
        golesPropioCount++; // Gol en propia del rival suma a nosotros
      }

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: found ? found.id : null,
        tipo_evento: g.tipo,
        minuto: g.minuto,
        notas: found ? `Gol marcado por ${found.fullName}` : `Gol: ${g.nameRaw}`
      });
    }

    for (const t of tarjetas) {
      const found = matchPlayerName(t.nameRaw);
      if (found) {
        const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
        if (t.tipo === 'Tarjeta Amarilla') cur.yellow += 1;
        else cur.red += 1;
        playerStatsMap.set(found.id, cur);
      }

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: found ? found.id : null,
        tipo_evento: t.tipo,
        minuto: t.minuto,
        notas: found ? `${t.tipo} a ${found.fullName}` : `${t.tipo}: ${t.nameRaw}`
      });
    }

    // Actualizar partido en DB
    await supabase.from('partidos').update({
      lugar: realLugar,
      resultado_propio: golesPropioCount,
      resultado_rival: golesRivalCount
    }).eq('id', m.id);

    // Reemplazar match_events
    await supabase.from('match_events').delete().eq('partido_id', m.id);
    if (matchEventsToInsert.length > 0) {
      await supabase.from('match_events').insert(matchEventsToInsert);
    }

    // Actualizar convocatorias para este partido
    for (const [pId, stats] of playerStatsMap.entries()) {
      await supabase.from('convocatorias').update({
        goals: stats.goals,
        yellow_cards: stats.yellow,
        red_cards: stats.red
      }).eq('partido_id', m.id).eq('player_id', pId);
    }

    console.log(`Partido ID: ${m.id} vs ${m.rival_nombre}:`);
    console.log(`  - Lugar real: ${realLugar} | Marcador: ${pdfIsUsLocal ? `${golesPropioCount} - ${golesRivalCount}` : `${golesRivalCount} - ${golesPropioCount}`}`);
    console.log(`  - Goles Sporting: ${golesPropioCount} | Goles Rival: ${golesRivalCount}`);
  }

  console.log("\n✅ RECONCILIACIÓN ESTRICTA Y CLASIFICACIÓN FINALIZADA CON ÉXITO.");
}

reconcileExactLocalVisitante();
