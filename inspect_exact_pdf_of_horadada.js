import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectHoradadaPDF() {
  const matchId = 'b72b7db8-c18c-48a3-b94d-a457aed97d7d';
  const { data: match } = await supabase.from('partidos').select('*').eq('id', matchId).single();
  console.log("Partido DB record:", match);

  const { data: blob } = await supabase.storage.from('actas-partidos').download(match.acta_oficial_url);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const parsed = await pdfParse(buffer);
  
  console.log("\n==================== TODO EL TEXTO DEL PDF ====================");
  console.log(parsed.text);
}

inspectHoradadaPDF();
