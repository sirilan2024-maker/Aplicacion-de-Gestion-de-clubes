const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_schema_info_or_something_invalid');
  console.log("If this fails, let's just query information_schema");
  
  // Actually, we can use the PostgREST API to inspect
  // Better yet, I can just query the `registration_requests` table to see if it exists
  const { data: t1, error: e1 } = await supabase.from('registration_requests').select('*').limit(1);
  console.log('registration_requests table:', e1 ? e1.message : 'exists');

  const { data: t2, error: e2 } = await supabase.from('player_tutors').select('*').limit(1);
  console.log('player_tutors table:', e2 ? e2.message : 'exists');
  if (t2 && t2.length > 0) console.log('player_tutors sample:', t2[0]);

  const { data: t3, error: e3 } = await supabase.from('players').select('*').limit(1);
  console.log('players table:', e3 ? e3.message : 'exists');
  if (t3 && t3.length > 0) console.log('players sample:', t3[0]);
}

checkSchema();
