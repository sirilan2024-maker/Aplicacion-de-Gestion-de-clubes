const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Renombrando Camiseta de Entrenamiento...");
  await supabase.from('player_apparel')
    .update({ item_name: 'Camiseta de Entrenamiento (1/2)' })
    .eq('item_name', 'Camiseta de Entrenamiento');

  console.log("Renombrando Pantalón de Entrenamiento...");
  await supabase.from('player_apparel')
    .update({ item_name: 'Pantalón de Entrenamiento (1/2)' })
    .eq('item_name', 'Pantalón de Entrenamiento');

  console.log("Obteniendo (1/2) para duplicar...");
  const { data: cam1 } = await supabase.from('player_apparel').select('*').eq('item_name', 'Camiseta de Entrenamiento (1/2)');
  const { data: pan1 } = await supabase.from('player_apparel').select('*').eq('item_name', 'Pantalón de Entrenamiento (1/2)');

  console.log(`Insertando ${cam1?.length || 0} Camisetas (2/2)...`);
  if (cam1 && cam1.length > 0) {
    const cam2 = cam1.map(c => ({
      player_id: c.player_id,
      item_name: 'Camiseta de Entrenamiento (2/2)',
      size: c.size,
      delivered: false,
      delivered_at: null
    }));
    await supabase.from('player_apparel').upsert(cam2, { onConflict: 'player_id,item_name' });
  }

  console.log(`Insertando ${pan1?.length || 0} Pantalones (2/2)...`);
  if (pan1 && pan1.length > 0) {
    const pan2 = pan1.map(p => ({
      player_id: p.player_id,
      item_name: 'Pantalón de Entrenamiento (2/2)',
      size: p.size,
      delivered: false,
      delivered_at: null
    }));
    await supabase.from('player_apparel').upsert(pan2, { onConflict: 'player_id,item_name' });
  }

  console.log("¡Hecho!");
}

run();
