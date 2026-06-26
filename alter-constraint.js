const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function check() {
  const alterSql = `
    ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_tipo_evento_check;
    ALTER TABLE match_events ADD CONSTRAINT match_events_tipo_evento_check CHECK (tipo_evento = ANY (ARRAY['Gol'::text, 'Asistencia'::text, 'Tarjeta Amarilla'::text, 'Tarjeta Roja'::text, 'Cambio Entra'::text, 'Cambio Sale'::text, 'Penalty'::text, 'Gol en Propia'::text, 'Amarilla'::text, 'Cambio'::text, 'Tiro al larguero'::text, 'Tiro al palo'::text, 'Penalti'::text, 'Lesión'::text, 'Gol en propia puerta'::text, 'Descanso'::text, 'Fin de Partido'::text, 'Gol Rival'::text]));
  `;
  const { error } = await supabase.rpc('execute_sql_query', { query_text: alterSql });
  if (error) console.error("Error alterando constraint:", error);
  else console.log("Constraint alterado con éxito. 'Gol Rival' ahora está permitido.");
}

check();
