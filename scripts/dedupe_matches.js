import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: partidos, error } = await supabase
    .from('partidos')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  const seen = new Set();
  const toDelete = [];
  
  for (const p of partidos) {
    // Generate a unique key based on team, rival, and date (ignoring time for safety, or including time)
    const key = `${p.equipo_id}-${p.rival_nombre}-${p.fecha_hora}`;
    if (seen.has(key)) {
      toDelete.push(p.id);
    } else {
      seen.add(key);
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`Found ${toDelete.length} duplicates. Deleting...`);
    const { error: delError } = await supabase
      .from('partidos')
      .delete()
      .in('id', toDelete);
      
    if (delError) {
      console.error('Error deleting:', delError);
    } else {
      console.log('Successfully deleted duplicates!');
    }
  } else {
    console.log('No duplicates found.');
  }
}

run();
