process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRLS() {
  // We can simulate Juan by using an rpc that executes dynamic SQL under Juan's context
  // Wait, I can just create a temporary function that acts as Juan
  const func = 
  CREATE OR REPLACE FUNCTION test_insert_as_juan() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS 
  DECLARE
    res jsonb;
  BEGIN
    SET LOCAL role authenticated;
    SET LOCAL request.jwt.claim.sub TO 'c1184045-f383-49b3-a93e-0248257b0995';
    SET LOCAL request.jwt.claim.role TO 'authenticated';
    
    INSERT INTO public.match_events (partido_id, tipo_evento, minuto, notas)
    VALUES ('a6589b9f-764f-495d-bfa4-2316be8907e1', 'TEST', 10, 'Test by Juan')
    RETURNING to_jsonb(match_events.*) INTO res;
    
    RETURN res;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
  END;
  ;
  ;
  
  await supabase.rpc('run_sql', { sql_query: func }); // wait, run_sql is not defined!
}
testRLS();
