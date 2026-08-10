import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAndFixHoradadaDb() {
  console.log("=== INSPECCIONANDO Y CORRIGIENDO BASE DE DATOS SUPABASE DEL PARTIDO HORADADA ===");

  const { data: team } = await supabase.from('teams').select('id').eq('name', 'CADETE A').single();
  
  // Buscar a Martin Hernandez Ruiz en la plantilla
  const { data: martin } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id).ilike('last_name', '%Hernandez Ruiz%').single();
  console.log("Martin en DB:", martin);

  // Buscar partido Horadada
  const { data: match } = await supabase.from('partidos').select('id, rival_nombre').eq('equipo_id', team.id).ilike('rival_nombre', '%Horadada%').single();
  console.log("Partido Horadada ID:", match.id);

  // Consultar match_events del partido Horadada
  const { data: events } = await supabase.from('match_events').select('*').eq('partido_id', match.id);
  console.log("Eventos Actuales en DB para Horadada:");
  events.forEach(e => console.log(`  - ID: ${e.id} | Min: ${e.minuto}' | Tipo: ${e.tipo_evento} | PlayerID: ${e.player_id} | Notas: ${e.notas}`));

  // Corregir explícitamente cualquier row de Edinson Yampier o HERNANDEZ RUIZ a Martin Hernandez Ruiz
  for (const e of events) {
    if (e.notas && (e.notas.includes("Edinson Yampier") || e.notas.includes("HERNANDEZ RUIZ"))) {
      await supabase.from('match_events').update({
        player_id: martin.id,
        notas: e.notas.startsWith('[LOCAL]') ? '[LOCAL] HERNANDEZ RUIZ, MARTIN' : '[VISITANTE] HERNANDEZ RUIZ, MARTIN'
      }).eq('id', e.id);
      console.log(`✅ Evento ID ${e.id} actualizado explícitamente a Martin Hernandez Ruiz!`);
    }
  }

  // Verificar la tabla tras la corrección
  const { data: updatedEvents } = await supabase.from('match_events').select('*').eq('partido_id', match.id);
  console.log("\nEventos Tras la Corrección Directa en DB:");
  updatedEvents.forEach(e => console.log(`  - Min: ${e.minuto}' | Tipo: ${e.tipo_evento} | PlayerID: ${e.player_id} | Notas: ${e.notas}`));
}

inspectAndFixHoradadaDb();
