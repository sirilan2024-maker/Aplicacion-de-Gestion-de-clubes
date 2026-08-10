import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFullActa() {
  const { data: partidos } = await supabase.from('partidos').select('id, rival_nombre, lugar, fecha_hora, acta_oficial_url');
  
  for (const p of partidos) {
    const expectedPath = `partidos/${p.id}/acta_oficial.pdf`;
    const { data: fileData } = await supabase.storage.from('actas-partidos').download(expectedPath);
    if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const pdfRes = await pdfParse(buffer);
      console.log(`\n=================== ACTA DEL PARTIDO vs ${p.rival_nombre} (${p.lugar}) ===================`);
      console.log(pdfRes.text);
      break;
    }
  }
}

inspectFullActa();
