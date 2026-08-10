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
  const { data: partido } = await supabase
    .from('partidos')
    .select('id, rival_nombre, lugar, acta_oficial_url')
    .not('acta_oficial_url', 'is', null)
    .limit(1)
    .single();

  if (!partido || !partido.acta_oficial_url) {
    console.log("No partido with acta_oficial_url found");
    return;
  }

  console.log(`Descargando acta oficial: ${partido.acta_oficial_url} (${partido.lugar} vs ${partido.rival_nombre})...`);
  const { data: fileData } = await supabase.storage.from('actas-partidos').download(partido.acta_oficial_url);
  if (!fileData) {
    console.log("Error descargando archivo del storage");
    return;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const pdfRes = await pdfParse(buffer);
  
  console.log("\n=================== FULL TEXT OF ACTA PDF ===================");
  console.log(pdfRes.text);
}

inspectFullActa();
