import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllBucketFiles() {
  const { data: root } = await supabase.storage.from('actas-partidos').list('', { limit: 100 });
  console.log("Root content:", root);

  for (const item of root || []) {
    if (!item.id) { // Es una carpeta
      const { data: sub } = await supabase.storage.from('actas-partidos').list(item.name, { limit: 100 });
      console.log(`Subfolder '${item.name}':`, sub?.map(s => s.name));
      
      for (const subItem of sub || []) {
        if (!subItem.id) { // Sub-subcarpeta
          const subPath = `${item.name}/${subItem.name}`;
          const { data: subSub } = await supabase.storage.from('actas-partidos').list(subPath, { limit: 100 });
          console.log(`  Subfolder '${subPath}':`, subSub?.map(s => s.name));
        }
      }
    }
  }

  // Ver partidos en DB sin acta vinculada
  const { data: partidos } = await supabase.from('partidos').select('id, rival_nombre, lugar, fecha_hora, resultado_propio, resultado_rival, estado, acta_oficial_url');
  const sinActa = partidos?.filter(p => !p.acta_oficial_url);
  console.log(`\nPartidos SIN ACTA (${sinActa?.length || 0}):`);
  sinActa?.forEach(p => {
    console.log(`- ID: ${p.id} | Fecha: ${p.fecha_hora?.split('T')[0]} | ${p.lugar} vs ${p.rival_nombre}`);
  });
}

listAllBucketFiles();
