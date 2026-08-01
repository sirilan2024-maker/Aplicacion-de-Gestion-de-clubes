require('dotenv').config({ path: '.env.local' })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await supabase.from('teams').select('id, name')
  console.log('All Teams data:', data, 'error:', error)
}

test()
