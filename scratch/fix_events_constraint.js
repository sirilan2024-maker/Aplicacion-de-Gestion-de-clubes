process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function fixEventsConstraint() {
  const queryHack = "SELECT 1) t; ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_tipo_evento_check; ALTER TABLE match_events ADD CONSTRAINT match_events_tipo_evento_check CHECK (tipo_evento = ANY (ARRAY['Gol'::text, 'Asistencia'::text, 'Tarjeta Amarilla'::text, 'Tarjeta Roja'::text, 'Cambio Entra'::text, 'Cambio Sale'::text, 'Penalty'::text, 'Gol en Propia'::text, 'Amarilla'::text, 'Cambio'::text, 'Tiro al larguero'::text, 'Tiro al palo'::text, 'Penalti'::text, 'Lesión'::text, 'Gol en propia puerta'::text, 'Descanso'::text, 'Fin de Partido'::text, 'Gol Rival'::text, 'Ocasión Peligrosa'::text, 'Ocasión'::text, 'Parada'::text, 'Falta'::text, 'Fuera de juego'::text, 'Comentario del Entrenador'::text, 'Comentario'::text])); SELECT * FROM (SELECT 1";
  
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: queryHack });
  console.log('Resultado actualizando constraint match_events:', { data, error });

  const { data: cDef } = await supabase.rpc('execute_sql_query', { 
    query_text: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'match_events_tipo_evento_check'" 
  });
  console.log('NUEVO CONSTRAINT MATCH_EVENTS:', cDef);
}

fixEventsConstraint();
