import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugScoreExtraction() {
  const matchIds = [
    '2362ff2a-834a-4fd0-a380-c5a2be7a17df',  // Torrevieja 1
    'cb3e0d85-d5d4-49f8-9883-809e5b420588',  // At. Rabaloche 1
  ];

  for (const mId of matchIds) {
    const { data: m } = await supabase.from('partidos').select('rival_nombre, acta_oficial_url').eq('id', mId).single();
    if (!m?.acta_oficial_url) continue;

    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.replace(/\r/g, '');

    console.log(`\n==== PARTIDO vs ${m.rival_nombre} ====`);
    const idx = text.indexOf("PRIMER TIEMPOFINAL");
    if (idx !== -1) {
      console.log("RESULTADO CHUNK:");
      console.log(text.substring(idx, idx + 500));
    } else {
      console.log("'PRIMER TIEMPOFINAL' NOT FOUND. Buscando alternativa...");
      const idx2 = text.indexOf("PRIMER TIEMPO");
      if (idx2 !== -1) console.log(text.substring(idx2, idx2 + 500));
    }
    console.log("\n---- GOLES MARCADOS ----");
    const gIdx = text.indexOf("GOLES MARCADOS");
    if (gIdx !== -1) console.log(text.substring(gIdx, gIdx + 600));
  }
}

debugScoreExtraction();
