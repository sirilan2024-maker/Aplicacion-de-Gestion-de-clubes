const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan las credenciales de Supabase en .env.local");
  process.exit(1);
}

// Ignorar error de TLS en local
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const startDate = new Date('2023-08-15');
const endDate = new Date();

// Helper to get random date between start and end
function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to format date YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function run() {
  console.log("Iniciando generación de datos de asistencia de prueba...");

  // 1. Obtener todos los equipos
  const { data: teams, error: teamsError } = await supabase.from('equipos').select('id, name');
  if (teamsError || !teams) {
    console.error("Error obteniendo equipos:", teamsError);
    return;
  }

  console.log(`Encontrados ${teams.length} equipos.`);

  for (const team of teams) {
    console.log(`Procesando equipo: ${team.name} (${team.id})`);

    // Obtener jugadores del equipo
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, posicion')
      .eq('team_id', team.id);

    if (playersError || !players || players.length === 0) {
      console.log(`Sin jugadores en el equipo ${team.name}, saltando...`);
      continue;
    }

    const validPlayers = players.filter(p => !p.posicion?.toLowerCase().includes('entrenador') && !p.posicion?.toLowerCase().includes('delegado'));
    
    if (validPlayers.length === 0) {
      console.log(`Sin jugadores válidos (solo entrenadores) en ${team.name}, saltando...`);
      continue;
    }

    // Generate ~40 events for the team across the season
    // Roughly 30 entrenamientos and 10 partidos
    const numEntrenamientos = 30;
    const numPartidos = 10;
    
    const eventsToInsert = [];
    
    for(let i=0; i<numEntrenamientos; i++) {
        eventsToInsert.push({
            team_id: team.id,
            title: `Entrenamiento #${i+1}`,
            date: formatDate(getRandomDate(startDate, endDate)),
            start_time: '18:00',
            end_time: '19:30',
            event_type: 'Entrenamiento'
        });
    }
    
    for(let i=0; i<numPartidos; i++) {
        eventsToInsert.push({
            team_id: team.id,
            title: `Partido Jornada ${i+1}`,
            date: formatDate(getRandomDate(startDate, endDate)),
            start_time: '10:00',
            end_time: '11:45',
            event_type: 'Partido'
        });
    }

    // Sort events by date
    eventsToInsert.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Insert events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('team_events')
      .insert(eventsToInsert)
      .select();

    if (insertError) {
      console.error(`Error insertando eventos para ${team.name}:`, insertError);
      continue;
    }

    console.log(`Insertados ${insertedEvents.length} eventos para ${team.name}`);

    // For each event, generate attendance or convocatorias
    let attendanceRecords = [];
    let convocatoriasRecords = [];

    for (const ev of insertedEvents) {
        if (ev.event_type === 'Entrenamiento') {
            for (const player of validPlayers) {
                // 85% present, 10% absent, 5% excused
                const rand = Math.random();
                let status = 'Presente';
                if (rand > 0.85 && rand <= 0.95) status = 'Ausente';
                else if (rand > 0.95) status = 'Lesionado'; // Using Lesionado or Justificado

                attendanceRecords.push({
                    team_id: team.id,
                    event_id: ev.id,
                    player_id: player.id,
                    date: ev.date,
                    status: status
                });
            }
        } else if (ev.event_type === 'Partido') {
            // Need a partido matching record. 
            // We'll create a fake partido record if needed, but the UI might just rely on convocatorias table having partido_id.
            // Wait, convocatorias require a partido_id from `matches` table usually.
            // Let's create a match record.
            const { data: match, error: matchError } = await supabase
              .from('matches')
              .insert({
                  equipo_id: team.id,
                  rival_nombre: 'Rival de Prueba',
                  fecha_hora: `${ev.date}T10:00:00Z`,
                  competicion: 'Liga Regular'
              }).select().single();
              
            if (!matchError && match) {
                for (const player of validPlayers) {
                    const isConvocado = Math.random() > 0.2; // 80% convocado
                    if (isConvocado) {
                        convocatoriasRecords.push({
                            partido_id: match.id,
                            player_id: player.id,
                            status: 'Convocado',
                            estado_asistencia: Math.random() > 0.9 ? 'Ausente' : 'Confirmado'
                        });
                    }
                }
            }
        }
    }

    // Insert attendance in chunks
    const chunkSize = 500;
    for (let i = 0; i < attendanceRecords.length; i += chunkSize) {
      const chunk = attendanceRecords.slice(i, i + chunkSize);
      const { error: attError } = await supabase.from('attendance').insert(chunk);
      if (attError) console.error("Error insertando attendance chunk:", attError);
    }
    
    console.log(`Insertados ${attendanceRecords.length} registros de attendance.`);

    // Insert convocatorias
    for (let i = 0; i < convocatoriasRecords.length; i += chunkSize) {
      const chunk = convocatoriasRecords.slice(i, i + chunkSize);
      const { error: convError } = await supabase.from('convocatorias').insert(chunk);
      if (convError) console.error("Error insertando convocatorias chunk:", convError);
    }
    
    console.log(`Insertados ${convocatoriasRecords.length} registros de convocatorias.`);
  }

  console.log("Generación de datos finalizada con éxito.");
}

run();
