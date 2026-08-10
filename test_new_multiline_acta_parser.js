import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function parseGoalsAndCards(txt) {
  const goles = [];
  const tarjetas = [];

  // 1. SECCIÓN GOLES MARCADOS
  const gIdx = txt.indexOf("GOLES MARCADOS");
  if (gIdx !== -1) {
    const endIdx = txt.indexOf("TARJETAS", gIdx) !== -1 ? txt.indexOf("TARJETAS", gIdx) : gIdx + 3000;
    const goalsChunk = txt.substring(gIdx, endIdx);

    // Multiline regex for goals
    const goalRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Gol\s+en\s+propia\s+puerta|Gol\s+en\s+propia|Gol\s+de\s+penalty|Gol\s+de\s+penalti|Penalty|Penalti|Gol)/gi;
    let match;
    while ((match = goalRegex.exec(goalsChunk)) !== null) {
      const min = parseInt(match[1], 10);
      let nameRaw = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tipoRaw = match[3].trim();

      // Clean nameRaw (remove headers if attached)
      nameRaw = nameRaw.replace(/^Equipo[^\s]+\s*/i, '').trim();

      goles.push({
        minuto: isNaN(min) ? 1 : min,
        nameRaw,
        tipo: tipoRaw
      });
    }
  }

  // 2. SECCIÓN TARJETAS
  const tIdx = txt.indexOf("TARJETAS");
  if (tIdx !== -1) {
    const endIdx = txt.indexOf("FIRMA DE LOS DELEGADOS", tIdx) !== -1 ? txt.indexOf("FIRMA DE LOS DELEGADOS", tIdx) : tIdx + 3000;
    const tarjChunk = txt.substring(tIdx, endIdx);

    const cardRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Amarilla|Roja|Doble Amarilla)/gi;
    let match;
    while ((match = cardRegex.exec(tarjChunk)) !== null) {
      const min = parseInt(match[1], 10);
      let nameRaw = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tipoRaw = match[3].trim();

      nameRaw = nameRaw.replace(/^Equipo[^\s]+\s*/i, '').trim();

      tarjetas.push({
        minuto: isNaN(min) ? 1 : min,
        nameRaw,
        tipo: tipoRaw
      });
    }
  }

  return { goles, tarjetas };
}

async function testAllActas() {
  const { data: partidoFolders } = await supabase.storage.from('actas-partidos').list('partidos', { limit: 1000 });
  console.log(`Encontradas ${partidoFolders?.length || 0} carpetas de partidos con actas.`);

  let totalGolesExtraidos = 0;
  let totalTarjetasExtraidas = 0;

  for (const folder of partidoFolders || []) {
    const filePath = `partidos/${folder.name}/acta_oficial.pdf`;
    const { data: blob } = await supabase.storage.from('actas-partidos').download(filePath);
    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const { goles, tarjetas } = parseGoalsAndCards(parsed.text);

      totalGolesExtraidos += goles.length;
      totalTarjetasExtraidas += tarjetas.length;

      console.log(`\n📄 ACTA: ${folder.name}`);
      console.log(`   ⚽ Goles (${goles.length}):`, goles.map(g => `[Min ${g.minuto}] ${g.nameRaw} (${g.tipo})`));
      console.log(`   🟨 Tarjetas (${tarjetas.length}):`, tarjetas.map(t => `[Min ${t.minuto}] ${t.nameRaw} (${t.tipo})`));
    }
  }

  console.log(`\n==================================================`);
  console.log(`TOTAL GOLES EXTRAÍDOS: ${totalGolesExtraidos}`);
  console.log(`TOTAL TARJETAS EXTRAÍDAS: ${totalTarjetasExtraidas}`);
}

testAllActas();
