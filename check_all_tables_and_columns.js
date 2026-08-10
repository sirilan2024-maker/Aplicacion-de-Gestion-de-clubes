import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data: convData, count: convCount } = await supabase.from('convocatorias').select('*', { count: 'exact' });
  console.log(`Tabla 'convocatorias': ${convCount} filas.`);
  if (convData && convData.length > 0) {
    console.log("Keys en convocatorias:", Object.keys(convData[0]));
    console.log("Fila de ejemplo convocatorias:", convData[0]);
  }

  const { data: eventsData, count: eventsCount } = await supabase.from('match_events').select('*', { count: 'exact' });
  console.log(`Tabla 'match_events': ${eventsCount} filas.`);
  if (eventsData && eventsData.length > 0) {
    console.log("Keys en match_events:", Object.keys(eventsData[0]));
    console.log("Fila de ejemplo match_events:", eventsData[0]);
  }
}

checkTables();
