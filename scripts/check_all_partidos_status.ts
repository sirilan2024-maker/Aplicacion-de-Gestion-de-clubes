import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllPartidos() {
  const { data: matches } = await supabase
    .from('partidos')
    .select('*, equipo:teams(id, name)')
    .order('fecha_hora', { ascending: true });

  console.log(`Total internal matches in DB: ${matches?.length}`);
  
  const byTeam = new Map<string, any[]>();
  for (const m of matches || []) {
    const tName = m.equipo?.name || 'Unknown';
    if (!byTeam.has(tName)) byTeam.set(tName, []);
    byTeam.get(tName)!.push(m);
  }

  for (const [tName, tMatches] of byTeam.entries()) {
    console.log(`\n=== Team: ${tName} (${tMatches.length} internal matches) ===`);
    const finalizados = tMatches.filter(m => m.estado === 'Finalizado').length;
    const programados = tMatches.filter(m => m.estado === 'Programado').length;
    const conResultado = tMatches.filter(m => m.resultado_propio !== null && m.resultado_rival !== null).length;
    console.log(`  Finalizados: ${finalizados} | Programados: ${programados} | Con resultado registrado: ${conResultado}`);
    
    // Check discrepancies
    const programadosConResultado = tMatches.filter(m => m.estado === 'Programado' && (m.resultado_propio !== null || m.resultado_rival !== null));
    if (programadosConResultado.length > 0) {
      console.log(`  ⚠️ Programados pero con resultado:`, programadosConResultado.map(m => `ID ${m.id} vs ${m.rival_nombre} (${m.resultado_propio}-${m.resultado_rival})`));
    }
  }
}

checkAllPartidos().catch(console.error);
