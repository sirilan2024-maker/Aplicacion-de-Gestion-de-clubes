import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function extractOfficialScoreFromText(text) {
  const idx = text.indexOf("PRIMER TIEMPOFINAL");
  if (idx === -1) return { localGoals: 0, visitanteGoals: 0 };
  const chunk = text.substring(idx, idx + 800);

  const matches = [...chunk.matchAll(/[A-ZÁÉÍÓÚÑ]+\((\d+)\)/gi)];
  if (matches.length >= 4) {
    return {
      localGoals: parseInt(matches[1][1], 10),
      visitanteGoals: parseInt(matches[3][1], 10)
    };
  } else if (matches.length >= 2) {
    return {
      localGoals: parseInt(matches[0][1], 10),
      visitanteGoals: parseInt(matches[1][1], 10)
    };
  }
  return { localGoals: 0, visitanteGoals: 0 };
}

async function fixAllActaParsersExact() {
  console.log("=== REPARANDO PARSER EXÁCTO Y RECONCILIACIÓN FFCV DE ACTAS ===");

  const { data: team } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();

  // Asegurar Martin Hernandez Ruiz
  const { data: existingMartin } = await supabase.from('players').select('id').eq('team_id', team.id).ilike('last_name', '%Hernandez Ruiz%');
  if (!existingMartin || existingMartin.length === 0) {
    await supabase.from('players').insert({
      team_id: team.id,
      club_id: team.club_id,
      first_name: 'Martin',
      last_name: 'Hernandez Ruiz',
      position: 'Delantero',
      dorsal: 9
    });
  }

  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);

  const matchPlayer = (nameRaw) => {
    const clean = nameRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return players.find(p => {
      const fn = (p.first_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ln = (p.last_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (ln && clean.includes(ln)) return true;
      if (fn && clean.includes(fn) && fn.length > 3) return true;
      return false;
    });
  };

  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url').eq('equipo_id', team.id);

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsedPdf = await pdfParse(buffer);
    const text = parsedPdf.text.replace(/\r/g, '');

    // 1. Extraer Equipos Local y Visitante
    const clubesMatch = text.match(/Clubes:\s*([^\n\r,]+)[^\n\r]*[\n\r]+\s*([^\n\r,]+)/i);
    let localPdfName = "";
    let visitantePdfName = "";

    if (clubesMatch) {
      localPdfName = clubesMatch[1].trim();
      visitantePdfName = clubesMatch[2].trim();
    }

    const isUsLocalPdf = localPdfName.toLowerCase().includes("sporting") || localPdfName.toLowerCase().includes("saladar");
    const realLugar = isUsLocalPdf ? 'Local' : 'Visitante';

    // 2. Extraer Goles Totales
    const { localGoals: localGoalsTotal, visitanteGoals: visitanteGoalsTotal } = extractOfficialScoreFromText(text);

    // 3. Extraer Goles de GOLES MARCADOS
    const gIdx = text.indexOf("GOLES MARCADOS");
    const allGolesRaw = [];
    if (gIdx !== -1) {
      const endIdx = text.indexOf("TARJETAS", gIdx) !== -1 ? text.indexOf("TARJETAS", gIdx) : gIdx + 3000;
      const goalsChunk = text.substring(gIdx, endIdx);

      const goalRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Gol\s+en\s+propia\s+puerta|Gol\s+en\s+propia|Gol\s+de\s+penalty|Gol\s+de\s+penalti|Penalty|Penalti|Gol)/gi;
      let match;
      while ((match = goalRegex.exec(goalsChunk)) !== null) {
        const min = parseInt(match[1], 10);
        let nameRaw = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().replace(/^Equipo[^\s]+\s*/i, '').trim();
        const tipoRaw = match[3].toLowerCase();
        let tipo = 'Gol';
        if (tipoRaw.includes('propia')) tipo = 'Gol en propia puerta';
        else if (tipoRaw.includes('penal')) tipo = 'Penalti';

        allGolesRaw.push({ minuto: isNaN(min) ? 1 : min, nameRaw, tipo });
      }
    }

    const golesLocalList = allGolesRaw.slice(0, localGoalsTotal || allGolesRaw.length);
    const golesVisitanteList = allGolesRaw.slice(localGoalsTotal || allGolesRaw.length);

    // 4. Extraer Tarjetas desde INCIDENCIAS por equipo
    const tarjetasLocalList = [];
    const tarjetasVisitanteList = [];

    const incIdx = text.indexOf("INCIDENCIAS");
    if (incIdx !== -1) {
      const incChunk = text.substring(incIdx);
      const cardRegex = /-\s*([^:]+):\s*En\s+el\s+minuto\s*(\d+)['\+\d]*\s+el\s+jugador\s*\(\d+\)\s*([^\n]+?)\s+fue\s+amonestado/gi;
      let cMatch;
      while ((cMatch = cardRegex.exec(incChunk)) !== null) {
        const teamNameText = cMatch[1].trim();
        const min = parseInt(cMatch[2], 10);
        const nameRaw = cMatch[3].trim();

        const isUsCard = teamNameText.toLowerCase().includes("sporting") || teamNameText.toLowerCase().includes("saladar");
        const item = { minuto: min, nameRaw, tipo: 'Tarjeta Amarilla' };

        if (isUsCard) {
          if (isUsLocalPdf) tarjetasLocalList.push(item);
          else tarjetasVisitanteList.push(item);
        } else {
          if (isUsLocalPdf) tarjetasVisitanteList.push(item);
          else tarjetasLocalList.push(item);
        }
      }
    }

    // 5. Armar match_events
    const matchEventsToInsert = [];
    const playerStatsMap = new Map();

    const processGoal = (g, isLocalEvent) => {
      const found = matchPlayer(g.nameRaw);
      const belongToUs = isLocalEvent ? isUsLocalPdf : !isUsLocalPdf;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: belongToUs && found ? found.id : null,
        tipo_evento: g.tipo,
        minuto: g.minuto,
        notas: belongToUs && found ? `Gol marcado por ${found.first_name} ${found.last_name}` : `Gol: ${g.nameRaw}`
      });

      if (belongToUs && found && g.tipo !== 'Gol en propia puerta') {
        const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
        cur.goals += 1;
        playerStatsMap.set(found.id, cur);
      }
    };

    golesLocalList.forEach(g => processGoal(g, true));
    golesVisitanteList.forEach(g => processGoal(g, false));

    const processCard = (t, isLocalEvent) => {
      const found = matchPlayer(t.nameRaw);
      const belongToUs = isLocalEvent ? isUsLocalPdf : !isUsLocalPdf;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: belongToUs && found ? found.id : null,
        tipo_evento: t.tipo,
        minuto: t.minuto,
        notas: belongToUs && found ? `${t.tipo} a ${found.first_name} ${found.last_name}` : `${t.tipo}: ${t.nameRaw}`
      });

      if (belongToUs && found) {
        const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
        if (t.tipo === 'Tarjeta Amarilla') cur.yellow += 1;
        else cur.red += 1;
        playerStatsMap.set(found.id, cur);
      }
    };

    tarjetasLocalList.forEach(t => processCard(t, true));
    tarjetasVisitanteList.forEach(t => processCard(t, false));

    // Actualizar partido DB
    const resPropio = isUsLocalPdf ? localGoalsTotal : visitanteGoalsTotal;
    const resRival = isUsLocalPdf ? visitanteGoalsTotal : localGoalsTotal;

    await supabase.from('partidos').update({
      lugar: realLugar,
      resultado_propio: resPropio,
      resultado_rival: resRival
    }).eq('id', m.id);

    // Reemplazar match_events
    await supabase.from('match_events').delete().eq('partido_id', m.id);
    if (matchEventsToInsert.length > 0) {
      await supabase.from('match_events').insert(matchEventsToInsert);
    }

    // Actualizar convocatorias
    for (const [pId, stats] of playerStatsMap.entries()) {
      await supabase.from('convocatorias').update({
        goals: stats.goals,
        yellow_cards: stats.yellow,
        red_cards: stats.red
      }).eq('partido_id', m.id).eq('player_id', pId);
    }

    console.log(`✅ Partido vs ${m.rival_nombre} (PDF: ${localPdfName} vs ${visitantePdfName}): Marcador DB ${resPropio} - ${resRival} (${realLugar}). Goles Sporting: ${resPropio}, Rival: ${resRival}.`);
  }

  console.log("\n=======================================================");
  console.log("✅ PARSER EXACTO Y RECONCILIACIÓN FFCV COMPLETADOS 100%");
  console.log("=======================================================");
}

fixAllActaParsersExact();
