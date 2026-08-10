import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectActaTexts() {
  console.log("=== INSPECCIONANDO FORMATOS DE TEXTO DE LAS ACTAS FFCV ===");

  const { data: list } = await supabase.storage.from('actas-partidos').list('', { limit: 100 });
  console.log(`Encontrados ${list?.length || 0} archivos en 'actas-partidos'.`);

  for (const item of (list || []).slice(0, 5)) {
    if (item.name.endsWith('.pdf')) {
      const { data: fileBlob } = await supabase.storage.from('actas-partidos').download(item.name);
      if (fileBlob) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        try {
          const parsed = await pdfParse(buffer);
          const txt = parsed.text;
          console.log(`\n------------------ ARCHIVO: ${item.name} ------------------`);

          // Imprimir fragmentos de GOLES y TARJETAS
          const gIdx = txt.indexOf("GOLES");
          if (gIdx !== -1) {
            console.log("=== SECCIÓN GOLES ===");
            console.log(txt.substring(gIdx, gIdx + 600));
          }

          const tIdx = txt.indexOf("TARJETAS") !== -1 ? txt.indexOf("TARJETAS") : txt.indexOf("AMONESTACIONES");
          if (tIdx !== -1) {
            console.log("=== SECCIÓN TARJETAS ===");
            console.log(txt.substring(tIdx, tIdx + 600));
          }
        } catch (e) {
          console.error(`Error leyendo ${item.name}:`, e.message);
        }
      }
    }
  }
}

inspectActaTexts();
