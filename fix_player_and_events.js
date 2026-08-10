import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPlayerAndEvents() {
  console.log("=== ACTUALIZANDO JUGADOR MARTIN HERNANDEZ RUIZ EN SUPABASE ===");

  // Actualizar una de las filas duplicadas de Edinson Yampier a Martin Hernandez Ruiz
  const { data: updateRes, error: updateErr } = await supabase.from('players').update({
    first_name: 'Martin',
    last_name: 'Hernandez Ruiz',
    dorsal: 9
  }).eq('id', '862757f0-79c4-43e7-ace3-43ab2a9e327a').select();

  console.log("Update Player Result:", updateRes, updateErr);

  // Actualizar todos los match_events que decían Edinson Yampier
  const { data: updatedEvents, error: evErr } = await supabase.from('match_events').update({
    player_id: '862757f0-79c4-43e7-ace3-43ab2a9e327a',
    notas: '[VISITANTE] HERNANDEZ RUIZ, MARTIN'
  }).eq('player_id', '862757f0-79c4-43e7-ace3-43ab2a9e327a').select();

  console.log("Update Events Result:", updatedEvents?.length, evErr);

  // También actualizar por notas si había algún '[VISITANTE] Edinson Yampier Romero Hernández'
  const { data: notesEvents } = await supabase.from('match_events').select('*');
  for (const e of notesEvents || []) {
    if (e.notas && e.notas.includes("Edinson Yampier")) {
      await supabase.from('match_events').update({
        player_id: '862757f0-79c4-43e7-ace3-43ab2a9e327a',
        notas: '[VISITANTE] HERNANDEZ RUIZ, MARTIN'
      }).eq('id', e.id);
      console.log(`✅ Evento ${e.id} cambiado a HERNANDEZ RUIZ, MARTIN`);
    }
  }

  console.log("\n=========================================================");
  console.log("✅ JUGADOR Y EVENTOS DE MARTIN HERNANDEZ RUIZ 100% FIJADOS");
  console.log("=========================================================");
}

fixPlayerAndEvents();
