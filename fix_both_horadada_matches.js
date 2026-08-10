import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBothHoradadaMatches() {
  console.log("=== INSPECCIONANDO Y CORRIGIENDO LOS PARTIDOS CONTRA HORADADA ===");

  const matchIds = [
    'aa94d78a-ed95-40a4-adef-ef0667a2de8e',
    'b72b7db8-c18c-48a3-b94d-a457aed97d7d'
  ];

  // Buscar Martin Hernandez Ruiz en la DB
  const { data: martin } = await supabase.from('players').select('id, first_name, last_name').ilike('last_name', '%Hernandez Ruiz%').single();
  console.log("Martin Hernandez Ruiz ID en DB:", martin?.id);

  for (const mId of matchIds) {
    const { data: events } = await supabase.from('match_events').select('*').eq('partido_id', mId);
    console.log(`\nMatch ID: ${mId} (Total eventos: ${events ? events.length : 0}):`);
    
    if (events) {
      for (const e of events) {
        console.log(`  - Min: ${e.minuto}' | Tipo: ${e.tipo_evento} | PlayerID: ${e.player_id} | Notas: "${e.notas}"`);
        
        // Si notas contiene Edinson Yampier o Martin
        if (e.notas && (e.notas.includes("Edinson Yampier") || e.notas.includes("HERNANDEZ RUIZ") || e.notas.includes("Hernández"))) {
          await supabase.from('match_events').update({
            player_id: martin.id,
            notas: '[VISITANTE] HERNANDEZ RUIZ, MARTIN'
          }).eq('id', e.id);
          console.log(`  ---> ✅ ACTUALIZADO ID ${e.id} a '[VISITANTE] HERNANDEZ RUIZ, MARTIN' con player_id=${martin.id}`);
        }
      }
    }
  }

  console.log("\n=======================================================");
  console.log("✅ AMBOS PARTIDOS CONTRA HORADADA CORREGIDOS CON ÉXITO");
  console.log("=======================================================");
}

fixBothHoradadaMatches();
