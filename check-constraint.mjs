import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const statuses = ['Inactivo', 'Baja', 'Archivado', 'archivado', 'inactive', 'Lesionado', 'Sancionado'];
  
  for (const s of statuses) {
    const { error: insErr } = await supabase.from('players').insert({ 
      club_id: '8114f057-df45-42cf-9b37-de12285514f7', 
      first_name: 'test', 
      last_name: 'test',
      status: s
    });
    if (insErr) {
      console.log(`Failed for ${s}: ${insErr.message}`);
    } else {
      console.log(`SUCCESS for ${s}!`);
      // cleanup
      await supabase.from('players').delete().eq('status', s).eq('first_name', 'test');
    }
  }
}

main();
