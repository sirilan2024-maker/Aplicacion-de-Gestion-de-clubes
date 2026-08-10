process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function readAllPending() {
  const { data: pendingFiles } = await supabase.storage
    .from('actas-partidos')
    .list('pending', { limit: 200 });

  for (const f of pendingFiles || []) {
    const { data: fileBlob } = await supabase.storage
      .from('actas-partidos')
      .download(`pending/${f.name}`);

    if (!fileBlob) continue;
    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || '';
      console.log(`\n========================================`);
      console.log(`📄 Archivo: ${f.name}`);
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      lines.slice(0, 20).forEach(l => console.log("   ", l));
    } catch (e) {}
  }
}

readAllPending().catch(console.error);
