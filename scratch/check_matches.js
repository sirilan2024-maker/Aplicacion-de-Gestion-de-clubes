require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('partidos').select('id, estado, equipo_id, lugar, resultado_propio, resultado_rival, live_timer_started_at, live_timer_elapsed_seconds').gte('created_at', oneHourAgo).order('created_at', { ascending: false });
  console.log("Latest Partidos:", error ? error : JSON.stringify(data, null, 2));
}
run();
