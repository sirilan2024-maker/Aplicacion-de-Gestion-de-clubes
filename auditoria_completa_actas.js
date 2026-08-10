import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function extractOfficialScore(text) {
  const idx = text.indexOf("PRIMER TIEMPOFINAL");
  if (idx === -1) return { localGoals: 0, visitanteGoals: 0 };
  const chunk = text.substring(idx, idx + 800);
  const matches = [...chunk.matchAll(/[A-ZÁÉÍÓÚÑ]+\((\d+)\)/gi)];
  if (matches.length >= 4) return { localGoals: parseInt(matches[1][1]), visitanteGoals: parseInt(matches[3][1]) };
  if (matches.length >= 2) return { localGoals: parseInt(matches[0][1]), visitanteGoals: parseInt(matches[1][1]) };
  return { localGoals: 0, visitanteGoals: 0 };
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

function extractPdfGoals(text) {
  const gIdx = text.indexOf("GOLES MARCADOS");
  if (gIdx === -1) return [];
  const endIdx = text.indexOf("TARJETAS", gIdx) !== -1 ? text.indexOf("TARJETAS", gIdx) : gIdx + 3000;
  const chunk = text.substring(gIdx, endIdx);
  const goalRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Gol\s+en\s+propia\s+puerta|Gol\s+en\s+propia|Gol\s+de\s+penalty|Gol\s+de\s+penalti|Penalty|Penalti|Gol)/gi;
  const results = [];
  let m;
  while ((m = goalRegex.exec(chunk)) !== null) {
    let name = m[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const tipo = m[3].toLowerCase().includes('propia') ? 'Gol en propia puerta' : m[3].toLowerCase().includes('penal') ? 'Penalti' : 'Gol';
    results.push({ minuto: parseInt(m[1]), name, tipo });
  }
  return results;
}

function extractPdfCards(text) {
  const incIdx = text.indexOf("INCIDENCIAS");
  if (incIdx === -1) return [];
  const chunk = text.substring(incIdx);
  const cardRegex = /-\s*([^:]+):\s*En\s+el\s+minuto\s*(\d+)['\+\d]*\s+el\s+jugador\s*\(\d+\)\s*([^\n]+?)\s+fue\s+amonestado/gi;
  const results = [];
  let m;
  while ((m = cardRegex.exec(chunk)) !== null) {
    results.push({ teamName: m[1].trim(), minuto: parseInt(m[2]), name: m[3].trim() });
  }
  return results;
}

async function fullComprehensiveAudit() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║   AUDITORÍA COMPLETA DE COHERENCIA DE ACTAS FFCV - CADETE A     ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  const { data: team } = await supabase.from('teams').select('id, name').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name, dorsal').eq('team_id', team.id);
  const { data: matches } = await supabase.from('partidos')
    .select('id, fecha_hora, rival_nombre, lugar, resultado_propio, resultado_rival, acta_oficial_url')
    .eq('equipo_id', team.id);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.replace(/\r/g, '');

    const { localPdf, visitantePdf } = extractLocalVisitanteNames(text);
    const { localGoals: pdfLocal, visitanteGoals: pdfVisitante } = extractOfficialScore(text);
    const allPdfGoals = extractPdfGoals(text);
    const allPdfCards = extractPdfCards(text);

    const isUsLocalPdf = localPdf.toLowerCase().includes("sporting") || localPdf.toLowerCase().includes("saladar");
    const pdfOurGoals = isUsLocalPdf ? pdfLocal : pdfVisitante;
    const pdfRivalGoals = isUsLocalPdf ? pdfVisitante : pdfLocal;

    // Goles de NUESTRO equipo según posición en el acta
    const ourPdfGoals = isUsLocalPdf ? allPdfGoals.slice(0, pdfLocal) : allPdfGoals.slice(pdfLocal);
    const ourPdfCards = allPdfCards.filter(c => {
      const isLocal = localPdf.toLowerCase().includes(c.teamName.toLowerCase()) || c.teamName.toLowerCase().includes(localPdf.toLowerCase());
      return isUsLocalPdf ? isLocal : !isLocal;
    });

    // Consultar los match_events en la DB
    const { data: dbEvents } = await supabase.from('match_events').select('*').eq('partido_id', m.id);

    const dbOurGoals = (dbEvents || []).filter(e => {
      const isLocal = e.notas?.startsWith('[LOCAL]');
      const isVisitante = e.notas?.startsWith('[VISITANTE]');
      return (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Penalti')
        && (isUsLocalPdf ? isLocal : isVisitante);
    });

    const dbOurCards = (dbEvents || []).filter(e => {
      const isLocal = e.notas?.startsWith('[LOCAL]');
      const isVisitante = e.notas?.startsWith('[VISITANTE]');
      return (e.tipo_evento === 'Tarjeta Amarilla' || e.tipo_evento === 'Tarjeta Roja')
        && (isUsLocalPdf ? isLocal : isVisitante);
    });

    const dbRivalGoals = (dbEvents || []).filter(e => {
      const isLocal = e.notas?.startsWith('[LOCAL]');
      const isVisitante = e.notas?.startsWith('[VISITANTE]');
      return (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Penalti')
        && (isUsLocalPdf ? isVisitante : isLocal);
    });

    // Verificar eventos con player_id de nuestro equipo en la columna rival (ERROR CRÍTICO)
    const ourPlayerIds = new Set(players.map(p => p.id));
    const rivalEventsWithOurPlayers = (dbEvents || []).filter(e => {
      const isRival = isUsLocalPdf ? e.notas?.startsWith('[VISITANTE]') : e.notas?.startsWith('[LOCAL]');
      return isRival && e.player_id && ourPlayerIds.has(e.player_id);
    });

    // Verificar si hay player_id en eventos de nuestro equipo que NO pertenecen a nuestra plantilla
    const ourEventsWithWrongPlayer = (dbEvents || []).filter(e => {
      const isOurs = isUsLocalPdf ? e.notas?.startsWith('[LOCAL]') : e.notas?.startsWith('[VISITANTE]');
      return isOurs && e.player_id && !ourPlayerIds.has(e.player_id);
    });

    // Verificar discrepancias numéricas
    const goalDiscrepancy = dbOurGoals.length !== pdfOurGoals;
    const cardDiscrepancy = dbOurCards.length !== ourPdfCards.length;
    const lugarDiscrepancy = (isUsLocalPdf ? 'Local' : 'Visitante') !== m.lugar;
    const resultDiscrepancy = m.resultado_propio !== pdfOurGoals || m.resultado_rival !== pdfRivalGoals;

    const hasErrors = rivalEventsWithOurPlayers.length > 0 || ourEventsWithWrongPlayer.length > 0 || lugarDiscrepancy || resultDiscrepancy;
    const hasWarnings = goalDiscrepancy || cardDiscrepancy;

    if (hasErrors || hasWarnings) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`⚠️  PARTIDO: vs ${m.rival_nombre} | ID: ${m.id}`);
      console.log(`   Acta PDF: Local="${localPdf}" | Visitante="${visitantePdf}"`);
      console.log(`   Nuestro equipo es: ${isUsLocalPdf ? 'LOCAL' : 'VISITANTE'}`);
      console.log(`   DB lugar="${m.lugar}" → PDF="${isUsLocalPdf ? 'Local' : 'Visitante'}"`);

      if (lugarDiscrepancy) {
        console.log(`   ❌ ERROR: Lugar incorrecto en DB (DB="${m.lugar}", PDF="${isUsLocalPdf ? 'Local' : 'Visitante'}")`);
        totalErrors++;
      }
      if (resultDiscrepancy) {
        console.log(`   ❌ ERROR: Resultado incorrecto en DB (DB: ${m.resultado_propio}-${m.resultado_rival}, PDF: ${pdfOurGoals}-${pdfRivalGoals})`);
        totalErrors++;
      }
      if (goalDiscrepancy) {
        console.log(`   ⚠️  AVISO: Goles nuestros en DB (${dbOurGoals.length}) ≠ Goles en PDF (${pdfOurGoals})`);
        totalWarnings++;
      }
      if (cardDiscrepancy) {
        console.log(`   ⚠️  AVISO: Tarjetas nuestras en DB (${dbOurCards.length}) ≠ Tarjetas en PDF (${ourPdfCards.length})`);
        totalWarnings++;
      }
      if (rivalEventsWithOurPlayers.length > 0) {
        console.log(`   ❌ ERROR CRÍTICO: Jugadores NUESTROS asignados en la columna del RIVAL:`);
        rivalEventsWithOurPlayers.forEach(e => {
          const p = players.find(pl => pl.id === e.player_id);
          console.log(`      - ${e.tipo_evento} Min ${e.minuto}' → ${p?.first_name} ${p?.last_name} (Notas: ${e.notas})`);
        });
        totalErrors += rivalEventsWithOurPlayers.length;
      }
      if (ourEventsWithWrongPlayer.length > 0) {
        console.log(`   ❌ ERROR: player_id asignado en evento NUESTRO que no es de nuestra plantilla:`);
        ourEventsWithWrongPlayer.forEach(e => console.log(`      - ${e.tipo_evento} Min ${e.minuto}' player_id=${e.player_id} Notas: ${e.notas}`));
        totalErrors += ourEventsWithWrongPlayer.length;
      }
    } else {
      console.log(`✅ OK  vs ${m.rival_nombre} (${m.lugar}) | Goles: ${dbOurGoals.length}/${pdfOurGoals} | Tarjetas: ${dbOurCards.length}/${ourPdfCards.length}`);
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log("✅ AUDITORÍA COMPLETA: 0 ERRORES | 0 AVISOS → ACTAS 100% COHERENTES");
  } else {
    console.log(`📋 RESUMEN: ${totalErrors} Errores Críticos | ${totalWarnings} Avisos`);
    if (totalErrors === 0) console.log("✅ Sin errores críticos. Sólo hay diferencias de recuento a investigar.");
  }
  console.log(`${'═'.repeat(70)}\n`);
}

fullComprehensiveAudit();
