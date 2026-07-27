import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPastInscriptionFees() {
  const { data: fees, error } = await supabase.from('fees').select('id, concept, profile_id, player_id').ilike('concept', 'Inscripción Temporada%');
  if (error) {
    console.error("Error fetching fees:", error);
    return;
  }

  let updated = 0;
  for (const fee of fees) {
    if (!fee.player_id) {
      // try to extract player name from concept: "Inscripción Temporada - First Last"
      // or just query players by tutor_id = profile_id? 
      // If a tutor has multiple kids, it's hard without the name.
      // Let's use the name from the concept.
      const match = fee.concept.match(/Inscripción Temporada.* - (.*)/);
      if (match) {
        const fullName = match[1].trim();
        const firstSpace = fullName.indexOf(' ');
        let firstName = fullName, lastName = '';
        if (firstSpace !== -1) {
           firstName = fullName.substring(0, firstSpace);
           lastName = fullName.substring(firstSpace + 1);
        }
        
        // Find player
        const { data: players } = await supabase.from('players').select('id').eq('tutor_id', fee.profile_id).ilike('first_name', firstName);
        if (players && players.length === 1) {
          await supabase.from('fees').update({ player_id: players[0].id }).eq('id', fee.id);
          updated++;
        }
      }
    }
  }
  console.log(`Updated ${updated} inscription fees.`);
}

fixPastInscriptionFees();
