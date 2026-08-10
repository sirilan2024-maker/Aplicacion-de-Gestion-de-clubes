import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function extractGoalsFromActa(text, isLocal) {
  let match = text.match(/Resultado(?:\s+final)?\s*:?\s*(\d+)\s*[-:]\s*(\d+)/i);
  
  if (!match) {
    match = text.match(/Clubes:\s*[\s\S]*?\s+(\d+)\s*-\s*(\d+)/i);
  }

  if (!match) {
    match = text.match(/celebrado\s+el[\s\S]*?\s+(\d+)\s*-\s*(\d+)/i);
  }

  if (match) {
    const golLocal = parseInt(match[1], 10);
    const golVisitante = parseInt(match[2], 10);
    if (!isNaN(golLocal) && !isNaN(golVisitante)) {
      return {
        golLocal,
        golVisitante,
        resultadoPropio: isLocal ? golLocal : golVisitante,
        resultadoRival: isLocal ? golVisitante : golLocal
      };
    }
  }
  return { golLocal: null, golVisitante: null, resultadoPropio: null, resultadoRival: null };
}

async function processAllActas() {
  console.log("Obteniendo todos los partidos de la BD...");
  const { data: partidos, error: pErr } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, fecha_hora, resultado_propio, resultado_rival, estado, acta_oficial_url');

  if (pErr) {
    console.error("Error obteniendo partidos:", pErr);
    return;
  }

  console.log(`Buscando actas para ${partidos.length} partidos...`);

  let updatedCount = 0;

  for (const partido of partidos) {
    // Buscar si existe archivo de acta en actas-partidos/partidos/<id>/acta_oficial.pdf
    const expectedPath = `partidos/${partido.id}/acta_oficial.pdf`;
    
    // Intentar descargar la acta
    const { data: fileData, error: downloadErr } = await supabase
      .storage
      .from('actas-partidos')
      .download(expectedPath);

    if (downloadErr || !fileData) {
      // Probar si el acta_oficial_url ya apuntaba a un archivo
      if (partido.acta_oficial_url) {
        const { data: altData } = await supabase.storage.from('actas-partidos').download(partido.acta_oficial_url);
        if (altData) {
          const buffer = Buffer.from(await altData.arrayBuffer());
          const pdfRes = await pdfParse(buffer);
          const goals = extractGoalsFromActa(pdfRes.text, partido.lugar === 'Local');
          if (goals.resultadoPropio !== null) {
            await supabase.from('partidos').update({
              resultado_propio: goals.resultadoPropio,
              resultado_rival: goals.resultadoRival,
              estado: 'Finalizado'
            }).eq('id', partido.id);
            console.log(`✅ Partido vs ${partido.rival_nombre} (${partido.lugar}): Marcador ${goals.resultadoPropio} - ${goals.resultadoRival}`);
            updatedCount++;
          }
        }
      }
      continue;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    try {
      const pdfRes = await pdfParse(buffer);
      const isLocal = partido.lugar === 'Local';
      const goals = extractGoalsFromActa(pdfRes.text, isLocal);
      
      if (goals.resultadoPropio !== null) {
        await supabase.from('partidos').update({
          acta_oficial_url: expectedPath,
          resultado_propio: goals.resultadoPropio,
          resultado_rival: goals.resultadoRival,
          estado: 'Finalizado'
        }).eq('id', partido.id);
        console.log(`✅ Partido vs ${partido.rival_nombre} (${partido.lugar}): Marcador ${goals.resultadoPropio} - ${goals.resultadoRival}`);
        updatedCount++;
      } else {
        console.warn(`⚠️ No se detectó marcador en el PDF del partido vs ${partido.rival_nombre}`);
      }
    } catch (err) {
      console.error(`Error parseando PDF para ${partido.rival_nombre}:`, err);
    }
  }

  console.log(`\nProceso completado. Se actualizaron ${updatedCount} partidos con los datos de sus actas.`);
}

processAllActas();
