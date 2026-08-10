process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function parseSpanishDate(str) {
  if (!str) return null;
  // DD de MMMM de YYYY
  const textMatch = str.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const month = MESES[textMatch[2].toLowerCase()];
    const year = parseInt(textMatch[3], 10);
    if (day >= 1 && day <= 31 && month !== undefined && year >= 2020) {
      return new Date(year, month, day);
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const numMatch = str.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10) - 1;
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  return null;
}

function parseFFCVActaText(text) {
  // 1. Extraer Fecha
  let fecha = null;
  const fechaMatch = text.match(/celebrado\s+el\s*([0-9]{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+\s+de\s+[0-9]{4}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
  if (fechaMatch) {
    fecha = parseSpanishDate(fechaMatch[1]);
  }

  // 2. Extraer Clubes (Local y Visitante)
  let localTeam = null;
  let awayTeam = null;
  
  const clubesMatch = text.match(/Clubes:\s*([^\n,]+)(?:,\s*de[^\n]+)?\s*\n\s*([^\n,]+)(?:,\s*de[^\n]+)?/i);
  if (clubesMatch) {
    localTeam = clubesMatch[1].trim();
    awayTeam = clubesMatch[2].trim();
  }

  // 3. Extraer Campo
  let campo = null;
  const campoMatch = text.match(/Campo:\s*([^\n]+)/i);
  if (campoMatch) {
    campo = campoMatch[1].trim();
  }

  return { fecha, localTeam, awayTeam, campo };
}

async function testFFCVParser() {
  const { data: pendingFiles } = await supabase.storage
    .from('actas-partidos')
    .list('pending', { limit: 10 });

  console.log("Probando parser FFCV estricto sobre PDFs...");

  for (const f of pendingFiles || []) {
    const { data: fileBlob } = await supabase.storage
      .from('actas-partidos')
      .download(`pending/${f.name}`);

    if (!fileBlob) continue;
    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    try {
      const pdfData = await pdfParse(buffer);
      const parsed = parseFFCVActaText(pdfData.text || '');
      console.log(`\n📄 Archivo: ${f.name}`);
      console.log(`   - Fecha extraída:`, parsed.fecha ? parsed.fecha.toLocaleDateString('es-ES') : "NO ENCONTRADA");
      console.log(`   - Equipo Local:`, parsed.localTeam || "NO ENCONTRADO");
      console.log(`   - Equipo Visitante:`, parsed.awayTeam || "NO ENCONTRADO");
      console.log(`   - Campo:`, parsed.campo || "NO ENCONTRADO");
    } catch (e) {
      console.error("Error parseando:", e);
    }
  }
}

testFFCVParser().catch(console.error);
