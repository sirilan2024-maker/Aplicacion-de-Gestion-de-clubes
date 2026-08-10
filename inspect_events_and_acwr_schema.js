import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchemas() {
  const { data: teamEvents } = await supabase.from('team_events').select('*').limit(1);
  console.log("team_events sample row keys:", Object.keys(teamEvents?.[0] || {}));

  const { data: attendance } = await supabase.from('attendance').select('*').limit(1);
  console.log("attendance sample row keys:", Object.keys(attendance?.[0] || {}));

  const { data: ptm } = await supabase.from('player_training_metrics').select('*').limit(1);
  console.log("player_training_metrics sample row keys:", Object.keys(ptm?.[0] || {}));

  const { data: metrics } = await supabase.from('club_metrics').select('*');
  console.log("club_metrics:", metrics);
}

inspectSchemas();
