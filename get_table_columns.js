process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getPartidosColumns() {
  // Intentar un insert fallido a propósito para ver el esquema completo o un select de 0 filas
  const { data, error } = await supabase.from('partidos').select('*').limit(0);
  console.log("Error o respuesta:", error);

  // Probar qué columna existe para ubicación (lugar_campo, ubicacion, etc.)
  const testObj = {
    club_id: '00000000-0000-0000-0000-000000000000',
    equipo_id: '00000000-0000-0000-0000-000000000000',
    rival_nombre: 'Test',
    fecha_hora: new Date().toISOString(),
    lugar: 'Local'
  };

  const { error: insErr } = await supabase.from('partidos').insert([testObj]);
  console.log("Insert test error message:", insErr?.message);
}

getPartidosColumns().catch(console.error);
