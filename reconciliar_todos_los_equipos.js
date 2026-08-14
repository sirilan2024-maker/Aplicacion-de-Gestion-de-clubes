import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function cleanStr(str) {
  if (!str) return '';
  return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function extractLocalVisitanteNames(text) {
  const clubesIdx = text.indexOf("Clubes:");
  if (clubesIdx === -1) return { localPdf: '', visitantePdf: '' };
  const chunk = text.substring(clubesIdx, clubesIdx + 300);
  const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { localPdf: '', visitantePdf: '' };
  return {
    localPdf: lines[0].replace(/^Clubes:\s*/i, '').replace(/,\s*de.*$/i, '').trim(),
    visitantePdf: lines[1].replace(/,\s*de.*$/i, '').trim()
  };
}

function extractOfficialScore(text) {
  const idx = text.indexOf("PRIMER TIEMPOFINAL");
  if (idx === -1) return { localGoals: 0, visitanteGoals: 0 };
  const chunk = text.substring(idx, idx + 800);
  const matches = [...chunk.matchAll(/[A-ZÁÉÍÓÚÑ]+\((\d+)\)/gi)];
  if (matches.length >= 4) return { localGoals: parseInt(matches[1][1]), visitanteGoals: parseInt(matches[3][1]) };
  if (matches.length >= 2) return { localGoals: parseInt(matches[0][1]), visitanteGoals: parseInt(matches[1][1]) };
  return { localGoals: 0, visitanteGoals: 0 };
}

function extractPdfGoalsStrict(text) {
  const gIdx = text.indexOf("GOLES MARCADOS");
  if (gIdx === -1) return [];
  const endIdx = text.indexOf("TARJETAS", gIdx) !== -1 ? text.indexOf("TARJETAS", gIdx) : gIdx + 3000;
  const chunk = text.substring(gIdx, endIdx);
  const goalRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Gol\s+en\s+propia\s+puerta|Gol\s+en\s+propia|Gol\s+de\s+penalty|Gol\s+de\s+penalti|Penalty|Penalti|Gol)/gi;
  const results = [];
  let mm;
  while ((mm = goalRegex.exec(chunk)) !== null) {
    let name = mm[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const tipo = mm[3].toLowerCase().includes('propia') ? 'Gol en propia puerta' : mm[3].toLowerCase().includes('penal') ? 'Penalti' : 'Gol';
    results.push({ minuto: parseInt(mm[1]), name, tipo });
  }
  return results;
}

function extractPdfCardsStrict(text) {
  const incIdx = text.indexOf("INCIDENCIAS");
  if (incIdx === -1) return [];
  const chunk = text.substring(incIdx);
  const cardRegex = /-\s*([^:]+):\s*En\s+el\s+minuto\s*(\d+)['\+\d]*\s+el\s+jugador\s*\(\d+\)\s*([^\n]+?)\s+fue\s+amonestado/gi;
  const results = [];
  let mm;
  while ((mm = cardRegex.exec(chunk)) !== null) {
    results.push({ teamName: mm[1].trim(), minuto: parseInt(mm[2]), name: mm[3].trim() });
  }
  return results;
}

function matchOurPlayerStrict(nameRaw, players) {
  const clean = cleanStr(nameRaw);
  const words = clean.split(/[\s,]+/).filter(w => w.length > 2);

  let bestMatch = null;
  let maxScore = 0;

  for (const p of players) {
    if (cleanStr(p.first_name).includes("PRUEBA") || cleanStr(p.last_name).includes("PRUEBA")) continue;

    const fnWords = cleanStr(p.first_name).split(/\s+/).filter(w => w.length > 2);
    const lnWords = cleanStr(p.last_name).split(/\s+/).filter(w => w.length > 2);

    const matchingLn = lnWords.filter(lnW => 
      words.some(w => w === lnW || (w.length > 4 && lnW.length > 4 && (w.includes(lnW) || lnW.includes(w))))
    );

    if (matchingLn.length === 0) continue;

    let score = matchingLn.length * 50;
    const matchingFn = fnWords.filter(fnW => 
      words.some(w => w === fnW || (w.length > 3 && fnW.length > 3 && (w.includes(fnW) || fnW.includes(w))))
    );
    score += matchingFn.length * 30;

    if (score > maxScore) {
      maxScore = score;
      bestMatch = p;
    }
  }

  return maxScore >= 50 ? bestMatch : null;
}

async function auditAndProcessALLTeams() {
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║ RECONCILIACIÓN COMPLETA DE ACTAS Y ESTADÍSTICAS PARA TODOS LOS EQUIPOS CLUB  ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  const { data: teams } = await supabase.from('teams').select('id, name');

  let totalActasGlobal = 0;

  for (const team of teams || []) {
    const { data: players } = await supabase.from('players').select('id, first_name, last_name, dorsal').eq('team_id', team.id);
    const { data: matches } = await supabase.from('partidos')
      .select('id, fecha_hora, rival_nombre, lugar, resultado_propio, resultado_rival, acta_oficial_url')
      .eq('equipo_id', team.id);

    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`⚽ PROCESANDO EQUIPO: "${team.name}" | Total partidos: ${matches?.length || 0} | Jugadores: ${players?.length || 0}`);
    console.log(`--------------------------------------------------------------------------------`);

    let teamActasCount = 0;

    for (const m of matches || []) {
      if (!m.acta_oficial_url) continue;

      const { data: blob, error: downloadErr } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
      if (downloadErr || !blob) {
        console.log(`  ❌ Error al descargar PDF para vs ${m.rival_nombre}:`, downloadErr?.message);
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\r/g, '');

      const { localPdf, visitantePdf } = extractLocalVisitanteNames(text);
      const { localGoals: pdfLocal, visitanteGoals: pdfVisitante } = extractOfficialScore(text);
      const allPdfGoals = extractPdfGoalsStrict(text);
      const allPdfCards = extractPdfCardsStrict(text);

      // Determinar si nuestro equipo es Local o Visitante en este acta PDF específico
      const isUsLocalPdf = localPdf.toLowerCase().includes("sporting") || localPdf.toLowerCase().includes("saladar");
      const realLugar = isUsLocalPdf ? 'Local' : 'Visitante';
      const ourPdfGoalsCount = isUsLocalPdf ? pdfLocal : pdfVisitante;
      const rivalPdfGoalsCount = isUsLocalPdf ? pdfVisitante : pdfLocal;

      const golesLocalList = allPdfGoals.slice(0, pdfLocal);
      const golesVisitanteList = allPdfGoals.slice(pdfLocal, pdfLocal + pdfVisitante);

      const tarjetasLocalList = [];
      const tarjetasVisitanteList = [];
      for (const c of allPdfCards) {
        const isLocal = cleanStr(c.teamName).includes(cleanStr(localPdf)) || cleanStr(localPdf).includes(cleanStr(c.teamName));
        if (isLocal) tarjetasLocalList.push(c);
        else tarjetasVisitanteList.push(c);
      }

      const matchEventsToInsert = [];
      const playerStatsMap = new Map();

      const processGoal = (g, isLocalColumn) => {
        const isUsEvent = isLocalColumn ? isUsLocalPdf : !isUsLocalPdf;
        let found = isUsEvent ? matchOurPlayerStrict(g.name, players || []) : null;
        const displayName = found ? `${found.first_name} ${found.last_name}` : g.name;

        matchEventsToInsert.push({
          partido_id: m.id,
          player_id: found ? found.id : null,
          tipo_evento: g.tipo,
          minuto: isNaN(g.minuto) ? 1 : g.minuto,
          notas: isLocalColumn ? `[LOCAL] ${displayName}` : `[VISITANTE] ${displayName}`
        });

        if (isUsEvent && found && g.tipo !== 'Gol en propia puerta') {
          const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
          cur.goals += 1;
          playerStatsMap.set(found.id, cur);
        }
      };

      const processCard = (c, isLocalColumn) => {
        const isUsEvent = isLocalColumn ? isUsLocalPdf : !isUsLocalPdf;
        let found = isUsEvent ? matchOurPlayerStrict(c.name, players || []) : null;
        const displayName = found ? `${found.first_name} ${found.last_name}` : c.name;

        matchEventsToInsert.push({
          partido_id: m.id,
          player_id: found ? found.id : null,
          tipo_evento: 'Tarjeta Amarilla',
          minuto: isNaN(c.minuto) ? 1 : c.minuto,
          notas: isLocalColumn ? `[LOCAL] ${displayName}` : `[VISITANTE] ${displayName}`
        });

        if (isUsEvent && found) {
          const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
          cur.yellow += 1;
          playerStatsMap.set(found.id, cur);
        }
      };

      golesLocalList.forEach(g => processGoal(g, true));
      golesVisitanteList.forEach(g => processGoal(g, false));
      tarjetasLocalList.forEach(c => processCard(c, true));
      tarjetasVisitanteList.forEach(c => processCard(c, false));

      // Actualizar metadatos de lugar y resultado
      await supabase.from('partidos')
        .update({ lugar: realLugar, resultado_propio: ourPdfGoalsCount, resultado_rival: rivalPdfGoalsCount })
        .eq('id', m.id);

      // Reemplazar eventos del partido
      await supabase.from('match_events').delete().eq('partido_id', m.id);
      if (matchEventsToInsert.length > 0) {
        await supabase.from('match_events').insert(matchEventsToInsert);
      }

      // Resetear e insertar estadísticas en convocatorias
      await supabase.from('convocatorias')
        .update({ goals: 0, yellow_cards: 0, red_cards: 0 })
        .eq('partido_id', m.id);

      for (const [pId, stats] of playerStatsMap.entries()) {
        await supabase.from('convocatorias')
          .update({ goals: stats.goals, yellow_cards: stats.yellow, red_cards: stats.red })
          .eq('partido_id', m.id)
          .eq('player_id', pId);
      }

      teamActasCount++;
      totalActasGlobal++;
      console.log(`  ✅ vs ${m.rival_nombre} (${realLugar}) | Resultado: ${ourPdfGoalsCount}-${rivalPdfGoalsCount} | Eventos: ${matchEventsToInsert.length} | Jugadores vinculados: ${playerStatsMap.size}`);
    }

    // Recalcular estadisticas de plantilla de este equipo
    for (const p of players || []) {
      const { data: convs } = await supabase.from('convocatorias').select('goals, yellow_cards, red_cards').eq('player_id', p.id);
      let totalGoals = 0;
      let totalYellow = 0;
      let totalRed = 0;

      (convs || []).forEach(c => {
        totalGoals += (c.goals || 0);
        totalYellow += (c.yellow_cards || 0);
        totalRed += (c.red_cards || 0);
      });

      await supabase.from('players').update({
        goals: totalGoals,
        yellow_cards: totalYellow,
        red_cards: totalRed
      }).eq('id', p.id);
    }
  }

  console.log(`\n================================================================================`);
  console.log(`🎉 PROCESAMIENTO TOTAL COMPLETADO: ${totalActasGlobal} ACTAS RECONCILIADAS EN TODOS LOS EQUIPOS`);
  console.log(`================================================================================\n`);
}

auditAndProcessALLTeams();
