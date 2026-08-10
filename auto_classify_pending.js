process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function extractAllDatesFromText(text) {
  const dates = [];
  const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g;
  let match;
  while ((match = dateRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2030) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }

  const textDateRegex = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi;
  while ((match = textDateRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = MESES[match[2].toLowerCase()];
    const year = parseInt(match[3], 10);
    if (day >= 1 && day <= 31 && month !== undefined && year >= 2020 && year <= 2030) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }

  return dates;
}

function extractCategoryFromText(text) {
  const upperText = text.toUpperCase();
  if (upperText.includes("CADETE B") || upperText.includes("CADETE \"B\"")) return "CADETE B";
  if (upperText.includes("CADETE A") || upperText.includes("CADETE \"A\"")) return "CADETE A";
  if (upperText.includes("INFANTIL A")) return "INFANTIL A";
  if (upperText.includes("INFANTIL B")) return "INFANTIL B";
  if (upperText.includes("INFANTIL C")) return "INFANTIL C";
  if (upperText.includes("JUVENIL A")) return "JUVENIL A";
  if (upperText.includes("JUVENIL B")) return "JUVENIL B";
  if (upperText.includes("SENIOR")) return "SENIOR";
  if (upperText.includes("CADETE")) return "CADETE";
  return null;
}

function normalizeStr(str) {
  return (str || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function processPendingFolder() {
  console.log("Iniciando clasificación inteligente de pendientes para Cadete B y otros...");

  const { data: pendingFiles } = await supabase.storage
    .from('actas-partidos')
    .list('pending', { limit: 300 });

  if (!pendingFiles || pendingFiles.length === 0) {
    console.log("No hay archivos en la carpeta 'pending'.");
    return;
  }

  const { data: teams } = await supabase.from("teams").select("id, name, category");
  const { data: allMatches } = await supabase
    .from("partidos")
    .select("id, fecha_hora, rival_nombre, equipo_id, acta_oficial_url, equipo:teams(name)");

  console.log(`Encontrados ${pendingFiles.length} archivos en pending. ${allMatches.length} partidos en BD.`);

  let matchedCount = 0;

  for (const fileObj of pendingFiles) {
    const pendingPath = `pending/${fileObj.name}`;
    
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from('actas-partidos')
      .download(pendingPath);

    if (dlErr || !fileBlob) continue;

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    let parsedText = "";
    try {
      const pdfData = await pdfParse(buffer);
      parsedText = pdfData.text || "";
    } catch (e) {}

    const datesFound = extractAllDatesFromText(parsedText);
    const extractedCategory = extractCategoryFromText(parsedText);

    if (!parsedText.trim() || datesFound.length === 0) continue;

    const normalizedPdfText = normalizeStr(parsedText);

    const matchingTeam = teams?.find(t => 
      extractedCategory && (
        normalizeStr(t.name).includes(normalizeStr(extractedCategory)) ||
        normalizeStr(extractedCategory).includes(normalizeStr(t.name))
      )
    );

    let bestMatch = null;
    if (allMatches && allMatches.length > 0) {
      for (const matchDate of datesFound) {
        const timeMs = matchDate.getTime();
        const minMs = timeMs - 5 * 24 * 60 * 60 * 1000; // Ampliado a ±5 días para variaciones de calendario
        const maxMs = timeMs + 5 * 24 * 60 * 60 * 1000;

        const candidates = allMatches.filter((m) => {
          const mTime = new Date(m.fecha_hora).getTime();
          const dateMatches = mTime >= minMs && mTime <= maxMs;
          const teamMatches = !matchingTeam || m.equipo_id === matchingTeam.id;
          return dateMatches && teamMatches;
        });

        if (candidates.length > 0) {
          // Buscar coincidencia por nombre normalizado de rival
          const rivalMatch = candidates.find((c) => {
            const normRival = normalizeStr(c.rival_nombre);
            if (!normRival || normRival === 'descansa') return false;
            // Coincidencia exacta o parcial de palabras clave
            const keywords = normRival.split(' ').filter(w => w.length > 3);
            return keywords.some(kw => normalizedPdfText.includes(kw));
          });

          if (rivalMatch) {
            bestMatch = rivalMatch;
            break;
          } else if (candidates.length === 1) {
            bestMatch = candidates[0];
            break;
          }
        }
      }
    }

    if (bestMatch) {
      const assignedPath = `partidos/${bestMatch.id}/acta_oficial.pdf`;
      console.log(`-> MATCH! PDF ${fileObj.name} => Partido ${bestMatch.equipo?.name} vs ${bestMatch.rival_nombre} (${new Date(bestMatch.fecha_hora).toLocaleDateString('es-ES')})`);

      await supabase.storage.from("actas-partidos").upload(assignedPath, buffer, {
        contentType: "application/pdf",
        upsert: true
      });

      await supabase.from("partidos").update({ acta_oficial_url: assignedPath }).eq("id", bestMatch.id);
      await supabase.storage.from("actas-partidos").remove([pendingPath]);
      matchedCount++;
    }
  }

  console.log(`\n¡Clasificación completada! Se enlazaron ${matchedCount} nuevas actas.`);
}

processPendingFolder().catch(console.error);
