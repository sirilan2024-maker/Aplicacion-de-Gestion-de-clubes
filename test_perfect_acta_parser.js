import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function parseFFCVActaGoals(pdfText) {
  let golLocal = null;
  let golVisitante = null;

  // Método 1: Parsear el bloque de Resultado FINAL en parentesis: E.g., UNO(1)DOS(2) y CERO(0)CUATRO(4)
  const resIdx = pdfText.indexOf("Resultado");
  if (resIdx !== -1) {
    const resChunk = pdfText.substring(resIdx, resIdx + 600);
    // Buscar los bloques de paréntesis de goles (ej. UNO(1)DOS(2))
    const lines = resChunk.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const numsPerLine = [];

    lines.forEach(line => {
      const parenthesized = line.match(/\((\d+)\)/g);
      if (parenthesized && parenthesized.length >= 1) {
        const nums = parenthesized.map(p => parseInt(p.replace(/[()]/g, ''), 10));
        numsPerLine.push(nums);
      }
    });

    if (numsPerLine.length >= 2) {
      // El último número de la primera fila es el gol local final
      const localNums = numsPerLine[0];
      golLocal = localNums[localNums.length - 1];

      // El último número de la segunda fila es el gol visitante final
      const visitNums = numsPerLine[1];
      golVisitante = visitNums[visitNums.length - 1];
    }
  }

  // Método 2 (Respaldo): Contar goles en el bloque "GOLES MARCADOS"
  if (golLocal === null || golVisitante === null) {
    const golesIdx = pdfText.indexOf("GOLES MARCADOS");
    if (golesIdx !== -1) {
      const endGolesIdx = pdfText.indexOf("TARJETAS", golesIdx);
      const golesChunk = endGolesIdx !== -1 
        ? pdfText.substring(golesIdx, endGolesIdx) 
        : pdfText.substring(golesIdx, golesIdx + 1500);

      // Contar ocurrencias de minutos (ej. "(40')", "(50')")
      const minuteMatches = golesChunk.match(/\(\d+['’]\)/g);
      if (minuteMatches) {
        // En FFCV Actas los goles vienen clasificados. Si no podemos distinguir lado, podemos usar minuteMatches.length
      }
    }
  }

  return { golLocal, golVisitante };
}

async function testAllActas() {
  const { data: partidos } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, equipo:teams(name)');

  console.log(`Analizando actas para ${partidos.length} partidos...`);

  let countSuccess = 0;

  for (const p of partidos) {
    const expectedPath = `partidos/${p.id}/acta_oficial.pdf`;
    const { data: fileData } = await supabase.storage.from('actas-partidos').download(expectedPath);
    if (!fileData) continue;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfRes = await pdfParse(buffer);
    const { golLocal, golVisitante } = parseFFCVActaGoals(pdfRes.text);

    const isLocal = p.lugar === 'Local';
    const resultadoPropio = isLocal ? golLocal : golVisitante;
    const resultadoRival = isLocal ? golVisitante : golLocal;

    console.log(`[Partido ${p.lugar}] ${isLocal ? p.equipo?.name : p.rival_nombre} (${golLocal}) vs ${isLocal ? p.rival_nombre : p.equipo?.name} (${golVisitante}) => Marcador registrado: ${resultadoPropio} - ${resultadoRival}`);

    if (resultadoPropio !== null && resultadoRival !== null) {
      await supabase.from('partidos').update({
        acta_oficial_url: expectedPath,
        resultado_propio: resultadoPropio,
        resultado_rival: resultadoRival,
        estado: 'Finalizado'
      }).eq('id', p.id);
      countSuccess++;
    }
  }

  console.log(`\n¡Éxito total! Se han parseado y actualizado ${countSuccess} partidos con los marcadores exactos de sus actas FFCV.`);
}

testAllActas();
