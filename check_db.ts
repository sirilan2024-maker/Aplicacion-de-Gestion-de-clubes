import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function main() {
  const { data, error } = await supabase.from('players').select('id, first_name, last_name, player_tutors!inner(tutor_id)').order('created_at', { ascending: false }).limit(5);
  console.log('Error:', error);
  console.log(JSON.stringify(data, null, 2));
}
main();
