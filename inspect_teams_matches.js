process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTeamsAndMatches() {
  const { data: teams } = await supabase.from('teams').select('id, name, category');
  console.log("Equipos en la BD:", teams);

  const { data: matches } = await supabase
    .from('partidos')
    .select('id, fecha_hora, rival_nombre, equipo_id, equipo:teams(name)')
    .limit(10);
  console.log("Ejemplo de partidos en la BD (10 primeros):", matches);
}

inspectTeamsAndMatches().catch(console.error);
