require('dotenv').config({ path: '.env.local' })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await supabase
    .from('partidos')
    .select(`
      *,
      equipo:teams (id, name, category, logo_url)
    `)
    .order('fecha_hora', { ascending: true })
    
  console.log(`Total matches: ${data ? data.length : 0}`, 'Error:', error)
  if (data) {
    console.log('Sample match:', data[0])
  }
  
  const { data: rawData } = await supabase.from('partidos').select('*')
  console.log(`Raw matches count: ${rawData ? rawData.length : 0}`)
}

test()
