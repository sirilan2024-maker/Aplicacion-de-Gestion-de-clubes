process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log("Verificando columna 'acta_oficial_url'...");
  const { data: partido, error: pErr } = await supabase
    .from('partidos')
    .select('id, acta_oficial_url')
    .limit(1);

  if (pErr) console.error("Error partidos:", pErr);
  else console.log("Partidos OK:", partido);

  console.log("Verificando RPC 'reconcile_match_and_close'...");
  if (partido && partido.length > 0) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('reconcile_match_and_close', {
      p_partido_id: partido[0].id,
      p_stats: [],
      p_new_status: partido[0].estado || 'Programado'
    });
    if (rpcErr) console.error("Error RPC:", rpcErr);
    else console.log("RPC reconcile_match_and_close OK:", rpcRes);
  }
}

verifyMigration().catch(console.error);
