import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLocalAndVisitante() {
  console.log("=== INSPECCIONANDO GOLES Y TARJETAS EN PARTIDOS LOCALES Y VISITANTES ===");

  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url')
    .not('acta_oficial_url', 'is', null)
    .limit(10);

  for (const m of matches || []) {
    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text;

    console.log(`\n======================================================================`);
    console.log(`MATCH: Sporting Saladar vs ${m.rival_nombre} | lugar: ${m.lugar}`);
    console.log(`======================================================================`);

    // Goles Chunk
    const gIdx = text.indexOf("GOLES MARCADOS") !== -1 ? text.indexOf("GOLES MARCADOS") : text.indexOf("GOLES");
    if (gIdx !== -1) {
      const endIdx = text.indexOf("TARJETAS", gIdx) !== -1 ? text.indexOf("TARJETAS", gIdx) : gIdx + 1500;
      console.log(">>> GOLES CHUNK:");
      console.log(text.substring(gIdx, endIdx));
    }

    // Tarjetas Chunk
    const tIdx = text.indexOf("TARJETAS") !== -1 ? text.indexOf("TARJETAS") : text.indexOf("AMONESTACIONES");
    if (tIdx !== -1) {
      const endIdx = text.indexOf("FIRMA DE LOS DELEGADOS", tIdx) !== -1 ? text.indexOf("FIRMA DE LOS DELEGADOS", tIdx) : tIdx + 1500;
      console.log(">>> TARJETAS CHUNK:");
      console.log(text.substring(tIdx, endIdx));
    }
  }
}

inspectLocalAndVisitante();
