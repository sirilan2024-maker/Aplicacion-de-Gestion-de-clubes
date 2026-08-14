import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectAllTeamsAndActas() {
  const { data: teams } = await supabase.from('teams').select('id, name');
  console.log('=== RESUMEN DE EQUIPOS Y ACTAS ===');
  
  for (const t of teams || []) {
    const { data: matches } = await supabase
      .from('partidos')
      .select('id, rival_nombre, lugar, acta_oficial_url, resultado_propio, resultado_rival')
      .eq('equipo_id', t.id);

    const withActa = (matches || []).filter(m => m.acta_oficial_url);
    console.log(`\n📌 Equipo: "${t.name}" (ID: ${t.id})`);
    console.log(`   Total partidos: ${matches?.length || 0} | Con PDF de Acta: ${withActa.length}`);
    
    if (withActa.length > 0) {
      console.log('   Partidos con acta:');
      withActa.forEach(m => {
        console.log(`     - vs ${m.rival_nombre} (${m.lugar}) -> PDF: ${m.acta_oficial_url}`);
      });
    }
  }
}

inspectAllTeamsAndActas();
