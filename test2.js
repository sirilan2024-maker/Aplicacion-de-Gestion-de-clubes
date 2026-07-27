
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('players').update({ status: 'active' }).eq('id', 'efadc2c1-8a40-4312-abf6-d28943544bdb').then(res => console.log(JSON.stringify(res, null, 2)));

