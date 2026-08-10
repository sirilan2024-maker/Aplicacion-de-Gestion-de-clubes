import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditAllActas() {
  console.log("=================================================================");
  console.log("=== AUDITORÍA COMPLETA DE LAS 24 ACTAS Y EVENTOS DE PARTIDOS ===");
  console.log("=================================================================\n");

  const { data: team } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();
  const { data: players } = await supabase.from('players').select('id, first_name, last_name').eq('team_id', team.id);
  const { data: matches } = await supabase.from('partidos').select('id, fecha_hora, rival_nombre, lugar, acta_oficial_url, resultado_propio, resultado_rival').eq('equipo_id', team.id);

  console.log(`Total Partidos con Acta: ${matches.filter(m => m.acta_oficial_url).length}`);
  console.log(`Jugadores en Plantilla: ${players.length}\n`);

  for (const m of matches) {
    if (!m.acta_oficial_url) continue;

    const { data: events } = await supabase
      .from('match_events')
      .select('id, player_id, tipo_evento, minuto, notas')
      .eq('partido_id', m.id);

    console.log(`-----------------------------------------------------------------`);
    console.log(`PARTIDO: vs ${m.rival_nombre} (${m.lugar}) | Resultado: Propio ${m.resultado_propio} - Rival ${m.resultado_rival}`);
    console.log(`-----------------------------------------------------------------`);

    const localEvents = (events || []).filter(e => e.notas?.startsWith('[LOCAL]'));
    const visitanteEvents = (events || []).filter(e => e.notas?.startsWith('[VISITANTE]'));

    console.log(`  [LOCAL] (${m.lugar === 'Local' ? 'Sporting Saladar' : m.rival_nombre}): ${localEvents.length} eventos`);
    localEvents.forEach(e => {
      const isLinkedToOurPlayer = Boolean(e.player_id);
      const playerObj = players.find(p => p.id === e.player_id);
      const playerName = playerObj ? `${playerObj.first_name} ${playerObj.last_name}` : 'RIVAL (Sin id)';
      console.log(`    - Min ${e.minuto}' | ${e.tipo_evento} | ${e.notas} | Linked: ${playerName}`);
    });

    console.log(`  [VISITANTE] (${m.lugar === 'Visitante' ? 'Sporting Saladar' : m.rival_nombre}): ${visitanteEvents.length} eventos`);
    visitanteEvents.forEach(e => {
      const isLinkedToOurPlayer = Boolean(e.player_id);
      const playerObj = players.find(p => p.id === e.player_id);
      const playerName = playerObj ? `${playerObj.first_name} ${playerObj.last_name}` : 'RIVAL (Sin id)';
      console.log(`    - Min ${e.minuto}' | ${e.tipo_evento} | ${e.notas} | Linked: ${playerName}`);
    });
  }
}

auditAllActas();
