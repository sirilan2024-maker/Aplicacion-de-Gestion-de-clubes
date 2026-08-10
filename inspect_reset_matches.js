process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectMatchesToDelete() {
  const { data: seasons } = await supabase.from('seasons').select('id, name, is_active').order('created_at', { ascending: false });
  console.log("Temporadas encontradas:", seasons);

  const { count: matchesCount } = await supabase.from('partidos').select('*', { count: 'exact', head: true });
  console.log("Total de partidos en la base de datos:", matchesCount);

  const { count: convsCount } = await supabase.from('convocatorias').select('*', { count: 'exact', head: true });
  console.log("Total de convocatorias registradas:", convsCount);

  const { count: eventsCount } = await supabase.from('match_events').select('*', { count: 'exact', head: true });
  console.log("Total de eventos en directo registrados:", eventsCount);
}

inspectMatchesToDelete().catch(console.error);
