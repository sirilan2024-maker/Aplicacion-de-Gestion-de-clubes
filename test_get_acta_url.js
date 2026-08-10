process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSignedUrl() {
  const { data: match } = await supabase
    .from('partidos')
    .select('id, acta_oficial_url, rival_nombre')
    .not('acta_oficial_url', 'is', null)
    .limit(1)
    .single();

  console.log("Partido con acta:", match);

  if (match && match.acta_oficial_url) {
    const { data, error } = await supabase.storage
      .from('actas-partidos')
      .createSignedUrl(match.acta_oficial_url, 900);

    console.log("Signed URL result:", { data, error });
  }
}

testSignedUrl().catch(console.error);
