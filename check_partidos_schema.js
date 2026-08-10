process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartidosSchema() {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error consultando partidos:", error);
  } else {
    console.log("Columnas existentes en la tabla partidos:");
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      // Probar insertar una fila vacía con rollback o consultar rpc
      console.log("Tabla partidos vacía. Insertando test ficticio...");
      const { error: testErr } = await supabase.from('partidos').insert([{ rival_nombre: 'Test' }]);
      console.log("Error test:", testErr?.message);
    }
  }
}

checkPartidosSchema().catch(console.error);
