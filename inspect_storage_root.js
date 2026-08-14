import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectAllStorageBucketsAndRoot() {
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('=== BUCKETS EXISTENTES ===', buckets);

  for (const b of buckets || []) {
    const { data: files } = await supabase.storage.from(b.name).list('');
    console.log(`\nBucket "${b.name}" raíz:`, files?.map(f => f.name));
  }
}

inspectAllStorageBucketsAndRoot();
