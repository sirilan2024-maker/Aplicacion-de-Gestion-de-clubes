import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInfantilBStorage() {
  const { data: team } = await supabase.from('teams').select('id, name').ilike('name', '%INFANTIL B%').single();
  const { data: matches } = await supabase.from('partidos').select('id, rival_nombre, fecha_hora, acta_oficial_url').eq('equipo_id', team.id);

  console.log(`Equipo: ${team.name} (ID: ${team.id})`);
  console.log(`Partidos totales en DB: ${matches?.length}`);

  let matchWithActaInDb = 0;
  let matchesWithFolderInStorage = 0;

  for (const m of matches || []) {
    if (m.acta_oficial_url) {
      matchWithActaInDb++;
      console.log(`- DB tie acta: vs ${m.rival_nombre} -> ${m.acta_oficial_url}`);
    } else {
      // Probar si existe la carpeta partidos/{matchId} en storage
      const { data: files } = await supabase.storage.from('actas-partidos').list(`partidos/${m.id}`);
      if (files && files.length > 0) {
        matchesWithFolderInStorage++;
        console.log(`- ENCONTRADO ARCHIVO EN STORAGE SIN VINCULAR EN DB: partido ID ${m.id} (vs ${m.rival_nombre}):`, files);
        
        const pdfFile = files.find(f => f.name.endsWith('.pdf'));
        if (pdfFile) {
          const fullPath = `partidos/${m.id}/${pdfFile.name}`;
          console.log(`  -> Vinculando automáticamente a DB: ${fullPath}`);
          await supabase.from('partidos').update({ acta_oficial_url: fullPath }).eq('id', m.id);
        }
      }
    }
  }

  console.log(`Resultados: Con acta en DB = ${matchWithActaInDb} | Archivos encontrados en Storage = ${matchesWithFolderInStorage}`);
}

checkInfantilBStorage();
