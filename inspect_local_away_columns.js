import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url').not('acta_oficial_url', 'is', null).limit(5);

  for (const m of matches) {
    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const txt = parsed.text;

    console.log(`\n======================================================================`);
    console.log(`PARTIDO ID: ${m.id} | Lugar: ${m.lugar} | Rival: ${m.rival_nombre}`);
    console.log(`======================================================================`);

    const gIdx = txt.indexOf("GOLES MARCADOS");
    if (gIdx !== -1) {
      const endIdx = txt.indexOf("TARJETAS", gIdx) !== -1 ? txt.indexOf("TARJETAS", gIdx) : gIdx + 1500;
      console.log("--- CHUNK GOLES ---");
      console.log(txt.substring(gIdx, endIdx));
    }

    const tIdx = txt.indexOf("TARJETAS");
    if (tIdx !== -1) {
      const endIdx = txt.indexOf("FIRMA DE LOS DELEGADOS", tIdx) !== -1 ? txt.indexOf("FIRMA DE LOS DELEGADOS", tIdx) : tIdx + 1500;
      console.log("--- CHUNK TARJETAS ---");
      console.log(txt.substring(tIdx, endIdx));
    }
  }
}

inspectColumns();
