require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('partidos').select('id, resultado_propio').limit(1);
  console.log("Anon Partidos fetch:", error ? error : data);
  
  const { data: events, error: eventsError } = await supabase.from('match_events').select('id').limit(1);
  console.log("Anon MatchEvents fetch:", eventsError ? eventsError : events);
}
run();
