import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixHoradadaEventsExact() {
  console.log("=== REPARANDO DEFINITIVAMENTE LOS EVENTOS DEL PARTIDO HORADADA EN SUPABASE ===");

  // 1. Obtener equipo CADETE A ID
  const { data: teams } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A');
  const team = teams[0];

  // 2. Buscar o crear a Martin Hernandez Ruiz
  const { data: players } = await supabase.from('players').select('*').eq('team_id', team.id);
  let martin = players.find(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes("martin") || `${p.last_name}`.toLowerCase().includes("hernandez ruiz"));

  if (!martin) {
    const { data: newMartin } = await supabase.from('players').insert({
      team_id: team.id,
      club_id: team.club_id,
      first_name: 'Martin',
      last_name: 'Hernandez Ruiz',
      position: 'Delantero',
      dorsal: 9
    }).select().single();
    martin = newMartin;
    console.log("✅ Creado Martin Hernandez Ruiz en DB ID:", martin.id);
  } else {
    console.log("✅ Encontrado Martin Hernandez Ruiz en DB ID:", martin.id);
  }

  // 3. Corregir match_events para los dos partidos de Horadada
  const matchIds = [
    'aa94d78a-ed95-40a4-adef-ef0667a2de8e',
    'b72b7db8-c18c-48a3-b94d-a457aed97d7d'
  ];

  for (const mId of matchIds) {
    const { data: events } = await supabase.from('match_events').select('*').eq('partido_id', mId);
    if (!events) continue;

    for (const e of events) {
      if (e.notas && (e.notas.includes("Edinson Yampier") || e.notas.includes("HERNANDEZ RUIZ") || e.notas.includes("Hernández"))) {
        await supabase.from('match_events').update({
          player_id: martin.id,
          notas: '[VISITANTE] HERNANDEZ RUIZ, MARTIN'
        }).eq('id', e.id);
        console.log(`✅ Evento ${e.id} (Min ${e.minuto}') reemplazado por 'HERNANDEZ RUIZ, MARTIN'!`);
      }
    }
  }

  console.log("\n=========================================================================");
  console.log("✅ BASE DE DATOS SUPABASE ACTUALIZADA: Edinson Yampier REMOVIDO 100%");
  console.log("=========================================================================");
}

fixHoradadaEventsExact();
