process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCadeteAMatches() {
  const { data: cadeteTeam } = await supabase.from('teams').select('id, name').ilike('name', '%CADETE A%').single();
  console.log("Equipo Cadete A:", cadeteTeam);

  const { data: matches, error } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, equipo_id, equipo:teams(name)');
  
  console.log("Total partidos en DB ahora:", matches?.length || 0);

  if (cadeteTeam) {
    const cadeteMatches = matches?.filter(m => m.equipo_id === cadeteTeam.id);
    console.log(`Partidos de ${cadeteTeam.name}:`, cadeteMatches?.length || 0);
  }
}

checkCadeteAMatches().catch(console.error);
