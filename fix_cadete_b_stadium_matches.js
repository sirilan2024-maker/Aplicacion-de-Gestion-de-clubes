process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRivalsInDB() {
  console.log("Corrigiendo nombres de rivales erróneos (campos de fútbol) en la BD...");

  // 1. Cadete B - 22/11/2025 y 13/12/2025 => At. Crevillente "A"
  const { data: cadeteBMatches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, equipo:teams(name)')
    .eq('rival_nombre', 'Ciutat del Futbol Juanfran Torres F');

  console.log(`Partidos con rival 'Ciutat del Futbol Juanfran Torres F': ${cadeteBMatches?.length || 0}`);
  for (const m of cadeteBMatches || []) {
    console.log(`-> Actualizando partido ${m.id} (${m.equipo?.name} - ${new Date(m.fecha_hora).toLocaleDateString('es-ES')}) => Rival: 'At. Crevillente "A"'`);
    await supabase.from('partidos').update({ rival_nombre: 'At. Crevillente "A"' }).eq('id', m.id);
  }

  // 2. Partidos con 'Campo Mpal. José Villaescusa Carrasco Pilar de Hor' => C.D. Horadada Thiar "B" / "A"
  const { data: horadadaMatches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, equipo:teams(name)')
    .eq('rival_nombre', 'Campo Mpal. José Villaescusa Carrasco Pilar de Hor');

  console.log(`Partidos con rival 'Campo Mpal. José Villaescusa...': ${horadadaMatches?.length || 0}`);
  for (const m of horadadaMatches || []) {
    const isTeamA = m.equipo?.name?.includes('A');
    const newRival = isTeamA ? 'C.D. Horadada Thiar "B"' : 'C.D. Horadada Thiar "A"';
    console.log(`-> Actualizando partido ${m.id} (${m.equipo?.name} - ${new Date(m.fecha_hora).toLocaleDateString('es-ES')}) => Rival: '${newRival}'`);
    await supabase.from('partidos').update({ rival_nombre: newRival }).eq('id', m.id);
  }

  console.log("¡Corrección de rivales finalizada!");
}

fixRivalsInDB().catch(console.error);
