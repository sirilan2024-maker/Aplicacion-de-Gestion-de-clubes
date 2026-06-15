const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://qjjfgncvtpshddqlxbdx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q'
);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'players';" 
  });
  console.log("RLS Policies for players:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

run();
