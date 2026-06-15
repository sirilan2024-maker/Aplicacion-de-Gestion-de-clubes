import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: players, error } = await supabase.from('players').select('id, first_name, last_name, team_id, club_id');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Total players in DB: ${players.length}`);
  
  const withoutTeam = players.filter(p => !p.team_id);
  console.log(`Players without team_id: ${withoutTeam.length}`);
  
  const withTeam = players.filter(p => p.team_id);
  console.log(`Players with team_id: ${withTeam.length}`);

  if (withTeam.length > 0) {
    console.log(`Sample player with team:`, withTeam[0]);
  }
}

main();
