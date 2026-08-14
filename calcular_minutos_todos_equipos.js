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

async function processFullMinutesForAllTeams() {
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║ EXTRACCIÓN Y CÁLCULO MASIVO DE MINUTOS JUGADOS DESDE ALINEACIONES FFCV       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  const { data: teams } = await supabase.from('teams').select('id, name');

  let totalActasConMinutos = 0;

  for (const team of teams || []) {
    const { data: players } = await supabase.from('players').select('id, first_name, last_name, dorsal').eq('team_id', team.id);
    const { data: matches } = await supabase.from('partidos')
      .select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url')
      .eq('equipo_id', team.id)
      .not('acta_oficial_url', 'is', null);

    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`⏱️ CALCULANDO MINUTOS EQUIPO: "${team.name}" | Actas a procesar: ${matches?.length || 0}`);
    console.log(`--------------------------------------------------------------------------------`);

    for (const m of matches || []) {
      const { data: blob, error: downloadErr } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
      if (downloadErr || !blob) continue;

      const buffer = Buffer.from(await blob.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const text = parsed.text.replace(/\r/g, '');

      const { localPdf, visitantePdf } = extractLocalVisitanteNames(text);
      const isUsLocalPdf = localPdf.toLowerCase().includes("sporting") || localPdf.toLowerCase().includes("saladar");
      const ourTeamNameInPdf = isUsLocalPdf ? localPdf : visitantePdf;

      const calculatedMinutesMap = new Map();

      if (ourTeamNameInPdf && players) {
        const equipoIdx = text.indexOf(ourTeamNameInPdf);
        if (equipoIdx !== -1) {
          const chunk = text.substring(equipoIdx, equipoIdx + 4000);
          const suplentesIdx = chunk.indexOf("Jugadores/as Suplentes");
          const titularesText = suplentesIdx !== -1 ? chunk.substring(0, suplentesIdx) : chunk;
          const suplentesText = suplentesIdx !== -1 ? chunk.substring(suplentesIdx, chunk.indexOf("Cuerpo Técnico") !== -1 ? chunk.indexOf("Cuerpo Técnico") : chunk.length) : '';

          const playerRegex = /(\d{1,2})\.\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?=\s*\d{1,2}\.|\s*Jugadores|\s*Cuerpo|\s*$)/g;

          const titulares = [];
          let mMatch;
          while ((mMatch = playerRegex.exec(titularesText)) !== null) {
            const name = mMatch[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            const matchedP = matchOurPlayerStrict(name, players);
            if (matchedP) titulares.push({ dorsal: parseInt(mMatch[1]), player: matchedP });
          }

          const suplentes = [];
          while ((mMatch = playerRegex.exec(suplentesText)) !== null) {
            const name = mMatch[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            const matchedP = matchOurPlayerStrict(name, players);
            if (matchedP) suplentes.push({ dorsal: parseInt(mMatch[1]), player: matchedP });
          }

          // Sustituciones
          const sustIdx = text.indexOf("SUSTITUCIONES EFECTUADAS");
          const sustituciones = [];
          if (sustIdx !== -1) {
            const sustChunk = text.substring(sustIdx);
            const subRegex = /El\s+jugador\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+?)\s*min\.\s*(\d{1,3})\s*sustituye\s+a\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+)/gi;
            let sMatch;
            while ((sMatch = subRegex.exec(sustChunk)) !== null) {
              const minSub = parseInt(sMatch[3]);
              const pEntra = matchOurPlayerStrict(sMatch[2].trim(), players);
              const pSale = matchOurPlayerStrict(sMatch[5].trim(), players);
              sustituciones.push({ minSub, pEntra, pSale });
            }
          }

          const matchTotalMinutes = 90;
          titulares.forEach(t => calculatedMinutesMap.set(t.player.id, { minutes: matchTotalMinutes, isTitular: true }));
          suplentes.forEach(s => calculatedMinutesMap.set(s.player.id, { minutes: 0, isTitular: false }));

          sustituciones.forEach(sub => {
            if (sub.pSale && calculatedMinutesMap.has(sub.pSale.id)) {
              calculatedMinutesMap.set(sub.pSale.id, { ...calculatedMinutesMap.get(sub.pSale.id), minutes: sub.minSub });
            }
            if (sub.pEntra && calculatedMinutesMap.has(sub.pEntra.id)) {
              calculatedMinutesMap.set(sub.pEntra.id, { ...calculatedMinutesMap.get(sub.pEntra.id), minutes: matchTotalMinutes - sub.minSub });
            }
          });
        }
      }

      // Actualizar convocatorias en DB
      const { data: convocatorias } = await supabase.from('convocatorias').select('id, player_id, status').eq('partido_id', m.id);

      for (const conv of convocatorias || []) {
        const info = calculatedMinutesMap.get(conv.player_id);
        const mins = info ? info.minutes : (conv.status === 'convocado' ? 90 : 0);

        await supabase.from('convocatorias').update({ minutes_played: mins }).eq('id', conv.id);
      }

      totalActasConMinutos++;
      console.log(`  ✅ vs ${m.rival_nombre} | Jugadores con alineación detectada: ${calculatedMinutesMap.size}`);
    }
  }

  console.log(`\n================================================================================`);
  console.log(`🎉 PROCESAMIENTO COMPLETADO: MINUTOS EXTRÁIDOS Y ASIGNADOS EN ${totalActasConMinutos} ACTAS`);
  console.log(`================================================================================\n`);
}

processFullMinutesForAllTeams();
