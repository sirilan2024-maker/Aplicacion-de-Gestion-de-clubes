import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanUpDuplicateFees() {
  const { data: fees, error } = await supabase
    .from('fees')
    .select('id, concept')
    .ilike('concept', 'Inscripción Temporada%')
    .is('club_id', null);
    
  if (error) {
    console.error("Error fetching fees:", error);
    return;
  }

  console.log(`Found ${fees.length} duplicate 'Inscripción Temporada' fees without club_id. Deleting...`);
  
  if (fees.length > 0) {
    for (const fee of fees) {
      await supabase.from('fees').delete().eq('id', fee.id);
    }
  }
  console.log("Cleanup complete.");
}

cleanUpDuplicateFees();
