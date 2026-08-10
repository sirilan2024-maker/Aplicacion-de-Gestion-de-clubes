import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  const { data: files, error } = await supabase.storage.from('actas-partidos').list('');
  console.log("Archivos en storage 'actas-partidos':", files);
  
  const { data: partidos } = await supabase.from('partidos').select('id, rival_nombre, lugar, fecha_hora, resultado_propio, resultado_rival, estado, acta_oficial_url');
  console.log(`Partidos en DB: ${partidos?.length || 0}`);
  const conActa = partidos?.filter(p => p.acta_oficial_url);
  console.log(`Partidos con acta vinculada: ${conActa?.length || 0}`);
}

checkStorage();
