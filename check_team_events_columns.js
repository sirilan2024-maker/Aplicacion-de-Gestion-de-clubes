import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvSchema() {
  const { data: ev } = await supabase.from('team_events').select('*').limit(1);
  if (ev && ev.length > 0) {
    console.log("Keys de team_events:", Object.keys(ev[0]));
  } else {
    // Probar insertar una fila mínima para ver errores
    const { error } = await supabase.from('team_events').insert({ title: 'test', event_type: 'Partido', date: '2025-10-01' });
    console.log("Error insert test:", error);
  }
}

checkEvSchema();
