import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  console.log('Migrating Camiseta de Entrenamiento...')
  const { data: d1, error: e1 } = await supabase
    .from('player_apparel')
    .update({ item_name: 'Camiseta de Entrenamiento (1/2)' })
    .eq('item_name', 'Camiseta de Entrenamiento')
  
  if (e1) console.error('Error 1:', e1)
  else console.log('Done 1')

  console.log('Migrating Pantalón de Entrenamiento...')
  const { data: d2, error: e2 } = await supabase
    .from('player_apparel')
    .update({ item_name: 'Pantalón de Entrenamiento (1/2)' })
    .eq('item_name', 'Pantalón de Entrenamiento')
    
  if (e2) console.error('Error 2:', e2)
  else console.log('Done 2')

  // Let's also migrate apparel_stock just in case they added stock for the old names
  console.log('Migrating stock...')
  await supabase.from('apparel_stock').update({ item_name: 'Camiseta de Entrenamiento (1/2)' }).eq('item_name', 'Camiseta de Entrenamiento')
  await supabase.from('apparel_stock').update({ item_name: 'Pantalón de Entrenamiento (1/2)' }).eq('item_name', 'Pantalón de Entrenamiento')
  console.log('Stock done')
}

migrate()
