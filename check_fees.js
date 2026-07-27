import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFees() {
  const { data: players } = await supabase.from('players').select('id, first_name, last_name, payment_plan, payment_method').order('created_at', { ascending: false }).limit(2);
  console.log("Latest players:", players);
  
  if (players && players.length > 0) {
    for (const p of players) {
      console.log(`\nFees for ${p.first_name} ${p.last_name}:`);
      const { data: fees } = await supabase.from('fees').select('id, concept, amount_cents, estado, club_id, player_id').eq('player_id', p.id);
      console.log(fees);
    }
  }
}
checkFees();
