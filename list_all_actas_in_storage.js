import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllActas() {
  const { data: files } = await supabase.storage.from('actas-partidos').list('', { limit: 1000 });
  console.log("Archivos en raíz:", files?.map(f => f.name));

  const { data: partidoFolders } = await supabase.storage.from('actas-partidos').list('partidos', { limit: 1000 });
  console.log("Subcarpetas en partidos/:", partidoFolders?.length || 0);

  // Inspeccionar 5 PDFs de partidos/
  for (const folder of (partidoFolders || []).slice(0, 5)) {
    const filePath = `partidos/${folder.name}/acta_oficial.pdf`;
    const { data: blob, error } = await supabase.storage.from('actas-partidos').download(filePath);
    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const txt = parsed.text;
      console.log(`\n============================ ${filePath} ============================`);
      
      const gIdx = txt.indexOf("GOLES MARCADOS") !== -1 ? txt.indexOf("GOLES MARCADOS") : txt.indexOf("GOLES");
      if (gIdx !== -1) {
        console.log("--- CHUNK GOLES ---");
        console.log(txt.substring(gIdx, gIdx + 800));
      } else {
        console.log("NO SE ENCONTRÓ PALABRA 'GOLES'");
      }

      const tIdx = txt.indexOf("TARJETAS") !== -1 ? txt.indexOf("TARJETAS") : txt.indexOf("AMONESTACIONES");
      if (tIdx !== -1) {
        console.log("--- CHUNK TARJETAS ---");
        console.log(txt.substring(tIdx, tIdx + 800));
      }
    }
  }
}

listAllActas();
