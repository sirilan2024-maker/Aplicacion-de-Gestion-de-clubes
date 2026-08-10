process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectActaGoals() {
  const { data: files } = await supabase.storage.from('actas-partidos').list('pending', { limit: 5 });
  
  if (!files || files.length === 0) {
    console.log("No hay archivos en pending. Buscando en partidos/...");
    const { data: partidoFolders } = await supabase.storage.from('actas-partidos').list('partidos', { limit: 5 });
    if (!partidoFolders) return;
    for (const folder of partidoFolders) {
      const { data: inner } = await supabase.storage.from('actas-partidos').list(`partidos/${folder.name}`);
      if (inner && inner[0]) {
        files.push({ name: `partidos/${folder.name}/${inner[0].name}`, fullPath: true });
      }
    }
  }

  for (const f of files || []) {
    const path = f.fullPath ? f.name : `pending/${f.name}`;
    const { data: blob } = await supabase.storage.from('actas-partidos').download(path);
    if (!blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    console.log(`\n=================== ARCHIVO: ${f.name} ===================`);
    console.log(pdfData.text.substring(0, 1500));
  }
}

inspectActaGoals().catch(console.error);
