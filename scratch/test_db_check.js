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

async function verify() {
  const { data: cDef } = await supabase.rpc('execute_sql_query', { 
    query_text: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'partidos_estado_check'" 
  });
  console.log('NUEVO CONSTRAINT:', cDef);

  const { data: match } = await supabase.from('partidos').select('id, estado').limit(1).single();
  const { data: uRes, error: uErr } = await supabase.from('partidos').update({ estado: 'Descanso' }).eq('id', match.id).select();
  console.log('Prueba Update a Descanso:', { uRes, uErr });

  // Dejarlo como estaba en Programado / Finalizado
  await supabase.from('partidos').update({ estado: match.estado }).eq('id', match.id);
}

verify();
