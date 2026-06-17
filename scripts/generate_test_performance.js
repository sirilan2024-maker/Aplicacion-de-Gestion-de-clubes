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

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

async function getOrCreateMetric(clubId, metricName, unit, type) {
  let { data, error } = await supabase
    .from('club_metrics')
    .select('id')
    .eq('club_id', clubId)
    .ilike('name', metricName)
    .maybeSingle();

  if (data) return data.id;

  const { data: newData, error: insertError } = await supabase
    .from('club_metrics')
    .insert({
      club_id: clubId,
      name: metricName,
      unit: unit,
      type: type,
      is_active: true
    }).select('id').single();

  if (insertError) {
    console.error(`Error creando métrica ${metricName}:`, insertError);
    return null;
  }
  return newData.id;
}

async function run() {
  console.log("Iniciando generación de datos de rendimiento de prueba...");

  // 1. Obtener equipos y club_id
  const { data: teams, error: teamsError } = await supabase.from('equipos').select('id, name, club_id');
  if (teamsError || !teams) return console.error("Error obteniendo equipos:", teamsError);

  console.log(`Encontrados ${teams.length} equipos.`);

  for (const team of teams) {
    if (!team.club_id) continue;
    console.log(`Procesando equipo: ${team.name}`);

    // Asegurar métricas
    const rpeId = await getOrCreateMetric(team.club_id, 'RPE', 'pts', 'number');
    const minId = await getOrCreateMetric(team.club_id, 'Minutos Jugados', 'min', 'number');
    const golId = await getOrCreateMetric(team.club_id, 'Goles', 'ud', 'number');
    const astId = await getOrCreateMetric(team.club_id, 'Asistencias', 'ud', 'number');
    const amaId = await getOrCreateMetric(team.club_id, 'Tarjetas Amarillas', 'ud', 'number');
    const rojId = await getOrCreateMetric(team.club_id, 'Tarjetas Rojas', 'ud', 'number');
    const renId = await getOrCreateMetric(team.club_id, 'Rendimiento', 'pts', 'number');
    const actId = await getOrCreateMetric(team.club_id, 'Actitud', 'pts', 'number');

    if (!rpeId || !minId || !golId) continue;

    // Obtener jugadores
    const { data: players } = await supabase.from('players').select('id, posicion').eq('team_id', team.id);
    if (!players || players.length === 0) continue;

    const validPlayers = players.filter(p => !p.posicion?.toLowerCase().includes('entrenador') && !p.posicion?.toLowerCase().includes('delegado'));
    if (validPlayers.length === 0) continue;

    // Asignar altura y peso a jugadores
    for (const p of validPlayers) {
      await supabase.from('players').update({
        height: randFloat(1.60, 1.95),
        weight: randFloat(55, 90)
      }).eq('id', p.id);
    }

    // Obtener eventos
    const { data: events } = await supabase.from('team_events').select('id, event_type').eq('team_id', team.id);
    if (!events) continue;

    let trainingMetricsToInsert = [];

    for (const ev of events) {
      for (const p of validPlayers) {
        if (ev.event_type === 'Entrenamiento') {
          // Si asiste (asumimos que asiste la mayoría, no validamos con attendance aquí por rapidez)
          if (Math.random() > 0.15) {
            trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: rpeId, value_number: rand(3, 9) });
            trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: minId, value_number: rand(60, 90) });
          }
        } else if (ev.event_type === 'Partido') {
          if (Math.random() > 0.2) {
            const minutos = rand(10, 90);
            trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: minId, value_number: minutos });
            trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: renId, value_number: rand(4, 10) });
            trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: actId, value_number: rand(6, 10) });
            
            if (Math.random() > 0.8) {
              trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: golId, value_number: rand(1, 3) });
            }
            if (Math.random() > 0.85) {
              trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: astId, value_number: rand(1, 2) });
            }
            if (Math.random() > 0.9) {
              trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: amaId, value_number: 1 });
            }
            if (Math.random() > 0.98) {
              trainingMetricsToInsert.push({ player_id: p.id, event_id: ev.id, metric_id: rojId, value_number: 1 });
            }
          }
        }
      }
    }

    // Insert en chunks
    const chunkSize = 1000;
    for (let i = 0; i < trainingMetricsToInsert.length; i += chunkSize) {
      const chunk = trainingMetricsToInsert.slice(i, i + chunkSize);
      const { error: tmError } = await supabase.from('player_training_metrics').insert(chunk);
      if (tmError) console.error("Error insertando métricas chunk:", tmError);
    }
    
    console.log(`Insertados ${trainingMetricsToInsert.length} registros de rendimiento para ${team.name}.`);
  }

  console.log("Generación de datos finalizada con éxito.");
}

run();
