import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: metrics } = await supabase.from('club_metrics').select('id, name, club_id');
  console.log("Metrics:", metrics.filter(m => m.name.toLowerCase().includes('rpe') || m.name.toLowerCase().includes('minutos')));
  
  const { data: evData } = await supabase.from('team_events').select('id, event_type');
  console.log("Events:", evData.filter(e => e.event_type === 'Entrenamiento').length);
  
  const { data: ptm } = await supabase.from('player_training_metrics').select('*');
  console.log("Training Metrics:", ptm);
  
}

check();
