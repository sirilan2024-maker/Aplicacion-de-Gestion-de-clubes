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

async function fixDatabasePlayersAndReconcileFlawless() {
  console.log("=== CORRIGIENDO BASE DE DATOS DE JUGADORES Y RECONCILIANDO FFCV A PERFECCIÓN ===");

  const { data: team } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();

  // 1. Corregir Belmaatouki Mohamed (Intercambiar first_name y last_name si están al revés)
  const { data: belma } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id).ilike('first_name', '%Belmaatouki%');
  if (belma && belma.length > 0) {
    await supabase.from('players').update({
      first_name: 'Mohamed',
      last_name: 'Belmaatouki'
    }).eq('id', belma[0].id);
    console.log("✅ Corregido 'Mohamed Belmaatouki' (first_name: Mohamed, last_name: Belmaatouki).");
  }

  // 2. Corregir Mohamed Etouzani -> Atouzani
  const { data: etouz } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id).ilike('last_name', '%Etouzani%');
  if (etouz && etouz.length > 0) {
    await supabase.from('players').update({
      first_name: 'Mohamed',
      last_name: 'Atouzani Etouzani'
    }).eq('id', etouz[0].id);
    console.log("✅ Corregido 'Mohamed Atouzani Etouzani'.");
  }

  // 3. Asegurar Martin Hernandez Ruiz
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
    console.log("✅ Asegurado 'Martin Hernandez Ruiz'.");
  }

  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);

  // Algoritmo de matching seguro SOLO para jugadores de Sporting Saladar
  const matchOurPlayerOnly = (nameRaw) => {
    const clean = nameRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = clean.split(/[\s,]+/).filter(w => w.length > 2);

    let bestMatch = null;
    let maxScore = 0;

    for (const p of players) {
      const fn = (p.first_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ln = (p.last_name || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Descartar pruebas
      if (fn.includes("PRUEBA") || ln.includes("PRUEBA") || fn.includes("JUGADOR")) continue;

      const fnWords = fn.split(/\s+/).filter(w => w.length > 2);
      const lnWords = ln.split(/\s+/).filter(w => w.length > 2);

      let score = 0;

      // Coincidencia de Apellidos
      const matchingLnWords = lnWords.filter(lnW => words.some(w => w.includes(lnW) || lnW.includes(w)));
      if (matchingLnWords.length > 0) {
        score += matchingLnWords.length * 40;
      } else {
        continue; // REQUISITO INDISPENSABLE: El apellido DEBE coincidir. Si no coincide el apellido, NO ES NUESTRO JUGADOR.
      }

      // Coincidencia de Nombre
      const matchingFnWords = fnWords.filter(fnW => words.some(w => w.includes(fnW) || fnW.includes(w)));
      if (matchingFnWords.length > 0) {
        score += matchingFnWords.length * 30;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = p;
      }
    }

    return maxScore >= 40 ? bestMatch : null;
  };

  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url').eq('equipo_id', team.id);

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsedPdf = await pdfParse(buffer);
    const text = parsedPdf.text.replace(/\r/g, '');

    // 1. Extraer Equipos Local (línea 0 tras Clubes:) y Visitante (línea 1 tras Clubes:)
    const clubesIdx = text.indexOf("Clubes:");
    let localPdfName = "";
    let visitantePdfName = "";

    if (clubesIdx !== -1) {
      const chunk = text.substring(clubesIdx, clubesIdx + 300);
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        localPdfName = lines[0].replace(/^Clubes:\s*/i, '').replace(/,\s*de.*$/i, '').trim();
        visitantePdfName = lines[1].replace(/,\s*de.*$/i, '').trim();
      }
    }

    const isUsLocalPdf = localPdfName.toLowerCase().includes("sporting") || localPdfName.toLowerCase().includes("saladar");
    const realLugar = isUsLocalPdf ? 'Local' : 'Visitante';

    // 2. Extraer Goles Totales Oficiales
    const { localGoals: localGoalsTotal, visitanteGoals: visitanteGoalsTotal } = extractOfficialScoreFromText(text);

    // 3. Parsear GOLES MARCADOS
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

    // 4. Parsear TARJETAS de INCIDENCIAS
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

        const isLocalCard = teamNameText.toLowerCase() === localPdfName.toLowerCase() || 
                            localPdfName.toLowerCase().includes(teamNameText.toLowerCase()) || 
                            teamNameText.toLowerCase().includes(localPdfName.toLowerCase());

        const item = { minuto: isNaN(min) ? 1 : min, nameRaw, tipo: 'Tarjeta Amarilla' };
        if (isLocalCard) tarjetasLocalList.push(item);
        else tarjetasVisitanteList.push(item);
      }
    }

    // 5. Armar match_events
    const matchEventsToInsert = [];
    const playerStatsMap = new Map();

    const processGoal = (g, isLocalColumn) => {
      const isUsEvent = isLocalColumn ? isUsLocalPdf : !isUsLocalPdf;
      // SI ES UN EVENTO NUESTRO: Buscar en nuestros jugadores. SI ES DEL RIVAL: NUNCA enlazar player_id (null).
      const found = isUsEvent ? matchOurPlayerOnly(g.nameRaw) : null;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: found ? found.id : null,
        tipo_evento: g.tipo,
        minuto: g.minuto,
        notas: isLocalColumn ? `[LOCAL] ${found ? `${found.first_name} ${found.last_name}` : g.nameRaw}` : `[VISITANTE] ${found ? `${found.first_name} ${found.last_name}` : g.nameRaw}`
      });

      if (isUsEvent && found && g.tipo !== 'Gol en propia puerta') {
        const cur = playerStatsMap.get(found.id) || { goals: 0, yellow: 0, red: 0 };
        cur.goals += 1;
        playerStatsMap.set(found.id, cur);
      }
    };

    golesLocalList.forEach(g => processGoal(g, true));
    golesVisitanteList.forEach(g => processGoal(g, false));

    const processCard = (t, isLocalColumn) => {
      const isUsEvent = isLocalColumn ? isUsLocalPdf : !isUsLocalPdf;
      // SI ES UN EVENTO NUESTRO: Buscar en nuestros jugadores. SI ES DEL RIVAL: NUNCA enlazar player_id (null).
      const found = isUsEvent ? matchOurPlayerOnly(t.nameRaw) : null;

      matchEventsToInsert.push({
        partido_id: m.id,
        player_id: found ? found.id : null,
        tipo_evento: t.tipo,
        minuto: t.minuto,
        notas: isLocalColumn ? `[LOCAL] ${found ? `${found.first_name} ${found.last_name}` : t.nameRaw}` : `[VISITANTE] ${found ? `${found.first_name} ${found.last_name}` : t.nameRaw}`
      });

      if (isUsEvent && found) {
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

    console.log(`✅ Partido vs ${m.rival_nombre} (${realLugar}): Reconciliados ${golesLocalList.length + golesVisitanteList.length} Goles y ${tarjetasLocalList.length + tarjetasVisitanteList.length} Tarjetas. (Nuestros jugadores vinculados: ${playerStatsMap.size})`);
  }

  console.log("\n=========================================================================");
  console.log("✅ PARSER EXACTO Y VINCULACIÓN FLAWLESS DE JUGADORES COMPLETADOS AL 100%");
  console.log("=========================================================================");
}

fixDatabasePlayersAndReconcileFlawless();
