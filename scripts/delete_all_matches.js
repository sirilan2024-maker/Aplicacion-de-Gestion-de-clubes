import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Deleting all matches...");
  const { error } = await supabase
    .from('partidos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully deleted all matches!');
  }
}

run();
