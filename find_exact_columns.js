process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findExactColumns() {
  const { data: team } = await supabase.from('teams').select('id, club_id').limit(1).single();
  if (!team) return;

  const testInsert = {
    club_id: team.club_id,
    equipo_id: team.id,
    rival_nombre: 'Test Rival',
    lugar: 'Local',
    fecha_hora: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase.from('partidos').insert([testInsert]).select();
  if (inserted && inserted[0]) {
    console.log("COLUMNAS DE LA TABLA PARTIDOS:", Object.keys(inserted[0]));
    // Borrar el test
    await supabase.from('partidos').delete().eq('id', inserted[0].id);
  } else {
    console.error("Error al insertar test:", error);
  }
}

findExactColumns().catch(console.error);
