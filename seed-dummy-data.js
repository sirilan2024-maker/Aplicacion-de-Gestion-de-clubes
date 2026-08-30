// ============================================================================
// BLINDAJE DE SEGURIDAD CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN (P17-C9)
// ============================================================================
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_EXECUTION !== 'true') {
  console.error('\n[SEGURIDAD CRÍTICA] Ejecución abortada.');
  console.error('Este script genera datos de prueba/seed y está terminantemente PROHIBIDO en producción.');
  console.error('Para ejecutarlo en un entorno de desarrollo aislado, define explícitamente:');
  console.error('  ALLOW_SEED_EXECUTION=true y asegúrate de no apuntar a producción.\n');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();
const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);
const SEASON_ID = '3cc8179e-bae1-4938-8cb2-5992d2e49979';

async function runSeed() {
  console.log("Iniciando inyección de propios goles y tarjetas...");
  
  const { data: partidos } = await supabase.from('partidos').select('id, equipo_id, resultado_propio');
  const { data: players } = await supabase.from('players').select('id, team_id');
  
  let matchEventsToInsert = [];

  for (const partido of partidos) {
    const teamPlayers = players.filter(p => p.team_id === partido.equipo_id);
    if (teamPlayers.length === 0) continue;

    // Generar eventos de goles propios basados en el resultado_propio
    for (let g = 0; g < partido.resultado_propio; g++) {
      const randomPlayer = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
      matchEventsToInsert.push({
        id: uuid(),
        partido_id: partido.id,
        player_id: randomPlayer.id,
        tipo_evento: 'Gol',
        minuto: Math.floor(Math.random() * 90) + 1,
        season_id: SEASON_ID,
        notas: 'Gol inventado'
      });
    }

    // Tarjetas amarillas al azar
    const numAmarillas = Math.floor(Math.random() * 4);
    for (let y = 0; y < numAmarillas; y++) {
      const randomPlayer = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
      matchEventsToInsert.push({
        id: uuid(),
        partido_id: partido.id,
        player_id: randomPlayer.id,
        tipo_evento: 'Tarjeta Amarilla',
        minuto: Math.floor(Math.random() * 90) + 1,
        season_id: SEASON_ID,
        notas: 'Falta táctica'
      });
    }
  }

  console.log(`Eventos a insertar (goles propios y tarjetas): ${matchEventsToInsert.length}`);

  const batchInsert = async (table, data, batchSize = 1000) => {
    for (let i = 0; i < data.length; i += batchSize) {
      const chunk = data.slice(i, i + batchSize);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) console.error(`Error insertando en ${table} (chunk ${i}):`, error);
    }
    console.log(`${table} insertados en lotes.`);
  };

  if (matchEventsToInsert.length > 0) {
    await batchInsert('match_events', matchEventsToInsert);
  }
}

runSeed();
