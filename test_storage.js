import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const res = await supabase.storage.getBucket('recibos_pagos');
  console.log("Bucket info:", res);
  
  const { data, error } = await supabase.storage.from('recibos_pagos').createSignedUrl('test.pdf', 60, { download: true });
  console.log("Signed URL:", { data, error });
}
test();
