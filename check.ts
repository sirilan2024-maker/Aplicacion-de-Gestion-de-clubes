import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
async function run() {
  const { data } = await supabase.from('convocatorias').select('*').eq('partido_id', '4acadd8d-d9df-4b19-84c1-c66497568569');
  console.log('Count:', data?.length);
  process.exit(0);
}
run();
