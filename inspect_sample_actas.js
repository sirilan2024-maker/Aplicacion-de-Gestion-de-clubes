import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSampleActasText() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, acta_oficial_url, equipo:teams(name)')
    .not('acta_oficial_url', 'is', null)
    .limit(10);

  for (const m of matches || []) {
    const { data: blob } = await supabase.storage.from('actas-partidos').download(m.acta_oficial_url);
    if (!blob) continue;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text.replace(/\r/g, '');

    console.log(`\n======================================================`);
    console.log(`Equipo: ${m.equipo?.name} vs ${m.rival_nombre} (DB lugar: ${m.lugar})`);
    console.log(`PDF Path: ${m.acta_oficial_url}`);
    
    const clubesIdx = text.indexOf("Clubes:");
    if (clubesIdx !== -1) {
      console.log("--- CHUNK Clubes: ---");
      console.log(text.substring(clubesIdx, clubesIdx + 300));
    } else {
      console.log("--- PRIMEROS 500 CHARS ---");
      console.log(text.substring(0, 500));
    }
  }
}

inspectSampleActasText();
