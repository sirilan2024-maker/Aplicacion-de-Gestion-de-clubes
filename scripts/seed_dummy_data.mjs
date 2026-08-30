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

// scripts/seed_dummy_data.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error("No se encontró el archivo .env.local");
  process.exit(1);
}

const envFile = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan las credenciales de Supabase en .env.local");
  process.exit(1);
}

// Ignore TLS errors in local/dev environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Helper to get random date in the last 30 days
function getRandomDateInPastDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - rand(1, days));
  return date.toISOString().split('T')[0];
}

async function getOrCreateMetric(clubId, metricName, unit, type) {
  const { data } = await supabase
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
  console.log("🚀 Iniciando generación de datos ficticios...");

  // Limpiar eventos anteriores sin temporada para evitar duplicados y limpiar la base de datos
  console.log("🧹 Limpiando eventos previos con temporada nula...");
  const { error: deleteError } = await supabase
    .from('team_events')
    .delete()
    .is('season_id', null);

  if (deleteError) {
    console.error("Error al limpiar eventos antiguos:", deleteError);
  }

  // 1. Obtener equipos y club_id
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, club_id, season_id');

  if (teamsError || !teams || teams.length === 0) {
    console.error("Error obteniendo equipos:", teamsError);
    return;
  }

  console.log(`Encontrados ${teams.length} equipos.`);

  for (const team of teams) {
    if (!team.club_id) {
      console.log(`Saltando equipo ${team.name} porque no tiene club_id.`);
      continue;
    }
    console.log(`\n----------------------------------------`);
    console.log(`📦 Procesando equipo: ${team.name}`);

    // Asegurar métricas del club
    const rpeId = await getOrCreateMetric(team.club_id, 'RPE', 'pts', 'number');
    const minId = await getOrCreateMetric(team.club_id, 'Minutos Jugados', 'min', 'number');
    const golId = await getOrCreateMetric(team.club_id, 'Goles', 'ud', 'number');
    const astId = await getOrCreateMetric(team.club_id, 'Asistencias', 'ud', 'number');
    const amaId = await getOrCreateMetric(team.club_id, 'Tarjetas Amarillas', 'ud', 'number');
    const rojId = await getOrCreateMetric(team.club_id, 'Tarjetas Rojas', 'ud', 'number');
    const renId = await getOrCreateMetric(team.club_id, 'Rendimiento', 'pts', 'number');
    const actId = await getOrCreateMetric(team.club_id, 'Actitud', 'pts', 'number');

    // Obtener jugadores
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, posicion')
      .eq('team_id', team.id)
      .neq('status', 'inactive');

    if (!players || players.length === 0) {
      console.log(`⚠️ Sin jugadores activos en el equipo ${team.name}, saltando...`);
      continue;
    }

    const validPlayers = players.filter(p => 
      !p.posicion?.toLowerCase().includes('entrenador') && 
      !p.posicion?.toLowerCase().includes('delegado') && 
      !p.posicion?.toLowerCase().includes('staff')
    );

    if (validPlayers.length === 0) {
      console.log(`⚠️ Sin jugadores de campo en ${team.name}, saltando...`);
      continue;
    }

    console.log(`Encontrados ${validPlayers.length} jugadores de campo.`);

    // Actualizar peso/altura para que tengan datos físicos completos
    for (const p of validPlayers) {
      await supabase.from('players').update({
        height: randFloat(1.55, 1.95),
        weight: randFloat(50, 88)
      }).eq('id', p.id);
    }

    // 2. Generar eventos (10 Entrenamientos y 4 Partidos en el último mes)
    const eventsToInsert = [];
    
    for (let i = 0; i < 10; i++) {
      eventsToInsert.push({
        team_id: team.id,
        season_id: team.season_id, // Añadido para la correcta visualización en el calendario
        title: `Sesión Entrenamiento #${i+1}`,
        date: getRandomDateInPastDays(30),
        start_time: '18:30',
        end_time: '20:00',
        event_type: 'Entrenamiento',
        location: 'Campo Principal Saladar',
        notes: 'Sesión de trabajo táctico y físico de intensidad media.'
      });
    }

    for (let i = 0; i < 4; i++) {
      eventsToInsert.push({
        team_id: team.id,
        season_id: team.season_id, // Añadido para la correcta visualización en el calendario
        title: `Partido de Liga - Jornada ${i+1}`,
        date: getRandomDateInPastDays(30),
        start_time: '10:30',
        end_time: '12:15',
        event_type: 'Partido',
        location: i % 2 === 0 ? 'Local (Saladar)' : 'Visitante',
        notes: 'Partido oficial de liga regular.'
      });
    }

    // Insertar eventos
    const { data: insertedEvents, error: insertError } = await supabase
      .from('team_events')
      .insert(eventsToInsert)
      .select();

    if (insertError || !insertedEvents) {
      console.error(`Error al insertar eventos para ${team.name}:`, insertError);
      continue;
    }

    console.log(`Creados ${insertedEvents.length} eventos (Entrenamientos/Partidos) en team_events.`);

    let attendanceRecords = [];
    let metricsToInsert = [];

    for (const ev of insertedEvents) {
      if (ev.event_type === 'Entrenamiento') {
        // Generar asistencia y métricas de entrenamiento
        for (const p of validPlayers) {
          const randVal = Math.random();
          // DB constraint checks status in ('present', 'absent', 'excused')
          let status = 'present';
          if (randVal > 0.85 && randVal <= 0.95) status = 'absent';
          else if (randVal > 0.95) status = 'excused';

          attendanceRecords.push({
            session_id: ev.id, // Para compatibilidad con training_sessions
            event_id: ev.id,    // Para compatibilidad con team_events
            player_id: p.id,
            status: status,
            // Omitimos team_id porque apunta a la tabla antigua equipos_old_archive en la FK de la DB
            date: ev.date,
            season_id: team.season_id
          });

          // Solo si asiste ('present'), le ponemos métricas de rendimiento/RPE
          if (status === 'present') {
            if (rpeId) {
              metricsToInsert.push({
                event_id: ev.id,
                player_id: p.id,
                metric_id: rpeId,
                value_number: rand(3, 8)
              });
            }
            if (minId) {
              metricsToInsert.push({
                event_id: ev.id,
                player_id: p.id,
                metric_id: minId,
                value_number: rand(75, 90)
              });
            }
          }
        }
      } else if (ev.event_type === 'Partido') {
        // Generar el partido correspondiente en la tabla 'partidos'
        const rivales = ["Huracán C.F.", "CD Torrevieja", "Murada FC", "Callosa Deportiva", "Crevillente Deportivo"];
        const rival = rivales[rand(0, rivales.length - 1)];
        const golesPropios = rand(0, 4);
        const golesRival = rand(0, 3);
        const estado = 'Finalizado';

        const { data: partido, error: partidoError } = await supabase
          .from('partidos')
          .insert({
            club_id: team.club_id,
            equipo_id: team.id,
            rival_nombre: rival,
            fecha_hora: `${ev.date}T10:30:00Z`,
            lugar: ev.location.includes('Local') ? 'Local' : 'Visitante',
            resultado_propio: golesPropios,
            resultado_rival: golesRival,
            estado: estado,
            season_id: team.season_id
          }).select().single();

        if (partidoError || !partido) {
          console.error("Error creando partido:", partidoError);
          continue;
        }

        // Crear convocatorias para el partido
        const convocatoriasInserts = [];
        
        // Elegimos 11 titulares de forma aleatoria
        const shuffledPlayers = [...validPlayers].sort(() => 0.5 - Math.random());
        const titularesIds = new Set(shuffledPlayers.slice(0, 11).map(p => p.id));

        for (const p of validPlayers) {
          const isConvocado = Math.random() > 0.15; // 85% convocados
          if (!isConvocado) continue;

          const esTitular = titularesIds.has(p.id);
          const mins = esTitular ? rand(60, 90) : rand(10, 45);
          
          let goles = 0;
          if (Math.random() > 0.85) goles = rand(1, 2);
          
          let asistencias = 0;
          if (Math.random() > 0.85) asistencias = rand(1, 2);

          const amarillas = Math.random() > 0.88 ? 1 : 0;
          const rating = rand(5, 9);
          const actitud = rand(3, 5);

          convocatoriasInserts.push({
            partido_id: partido.id,
            player_id: p.id,
            status: 'convocado',
            estado_asistencia: 'Confirmado',
            titular: esTitular,
            minutos_jugados: mins,
            goles: goles,
            asistencias: asistencias,
            tarjetas_amarillas: amarillas,
            tarjetas_rojas: 0,
            coach_rating: rating,
            actitud: actitud,
            
            // Duplicados de compatibilidad
            goals: goles,
            assists: asistencias,
            yellow_cards: amarillas,
            red_cards: 0,
            minutes_played: mins
          });

          // Insertar en player_training_metrics para que también salga en las estadísticas del jugador
          if (minId) {
            metricsToInsert.push({ event_id: ev.id, player_id: p.id, metric_id: minId, value_number: mins });
          }
          if (renId) {
            metricsToInsert.push({ event_id: ev.id, player_id: p.id, metric_id: renId, value_number: rating });
          }
          if (actId) {
            metricsToInsert.push({ event_id: ev.id, player_id: p.id, metric_id: actId, value_number: actitud });
          }
          if (goles > 0 && golId) {
            metricsToInsert.push({ event_id: ev.id, player_id: p.id, metric_id: golId, value_number: goles });
          }
          if (asistencias > 0 && astId) {
            metricsToInsert.push({ event_id: ev.id, player_id: p.id, metric_id: astId, value_number: asistencias });
          }
        }

        // Insertar convocatorias
        const { error: convError } = await supabase
          .from('convocatorias')
          .insert(convocatoriasInserts);

        if (convError) {
          console.error("Error insertando convocatorias:", convError);
        }
      }
    }

    // Insertar asistencia en la DB
    if (attendanceRecords.length > 0) {
      // Primero insertamos en training_sessions con las columnas correctas
      const trainingEvents = insertedEvents.filter(ev => ev.event_type === 'Entrenamiento');
      const sessionsToInsert = trainingEvents.map(ev => ({
        id: ev.id,
        club_id: team.club_id,
        team_id: team.id,
        title: ev.title,
        date: ev.date,
        start_time: ev.start_time,
        status: 'completed'
      }));

      // Insertar en training_sessions usando upsert por si ya existe
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .upsert(sessionsToInsert);

      if (sessionError) {
        console.error("Error insertando en training_sessions:", sessionError);
      } else {
        // Ahora sí insertamos asistencia
        const { error: attError } = await supabase
          .from('attendance')
          .upsert(attendanceRecords, { onConflict: 'session_id,player_id' });

        if (attError) {
          console.error("Error insertando asistencia:", attError);
        } else {
          console.log(`Insertados ${attendanceRecords.length} registros de asistencia en 'attendance'.`);
        }
      }
    }

    // Insertar métricas en player_training_metrics
    if (metricsToInsert.length > 0) {
      const { error: metricsError } = await supabase
        .from('player_training_metrics')
        .upsert(metricsToInsert, { onConflict: 'event_id,player_id,metric_id' });

      if (metricsError) {
        console.error("Error insertando métricas de entrenamiento:", metricsError);
      } else {
        console.log(`Insertados ${metricsToInsert.length} registros de rendimiento del jugador en 'player_training_metrics'.`);
      }
    }
  }

  console.log("\n✨ ¡Generación de datos finalizada con éxito!");
}

run();
