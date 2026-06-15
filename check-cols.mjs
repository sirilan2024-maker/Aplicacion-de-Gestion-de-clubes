import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('players').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(Object.keys(data[0]));
  }
}

main();
