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

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEventsAndACWR() {
  try {
    console.log("=== GENERANDO EVENTOS DE PARTIDOS, ENTRENAMIENTOS RECURRENTES Y DATOS ACWR ===");

    const { data: team, error: teamErr } = await supabase.from('teams').select('id, club_id').eq('name', 'CADETE A').single();
    if (teamErr) {
      console.error("Error obteniendo equipo Cadete A:", teamErr);
      return;
    }

    const { data: players, error: plErr } = await supabase.from('players').select('id').eq('team_id', team.id);
    if (plErr) {
      console.error("Error obteniendo jugadores:", plErr);
      return;
    }

    console.log(`Equipo Cadete A ID: ${team.id} | Jugadores: ${players?.length || 0}`);

    // Metric IDs for RPE and Minutos
    const { data: clubMetrics } = await supabase.from('club_metrics').select('id, name');
    const rpeMetric = clubMetrics?.find(m => m.name.toLowerCase() === 'rpe');
    const durationMetric = clubMetrics?.find(m => m.name.toLowerCase().includes('minutos'));

    // 1. CREAR EVENTOS DE PARTIDOS
    const { data: partidos } = await supabase.from('partidos').select('*').eq('equipo_id', team.id);
    console.log(`Generando eventos para ${partidos?.length || 0} partidos...`);

    const matchEventsToInsert = [];
    for (const match of partidos || []) {
      const dStr = match.fecha_hora.split('T')[0];
      const timeStr = match.fecha_hora.includes('T') ? match.fecha_hora.split('T')[1].substring(0, 8) : '12:00:00';
      const isLocal = match.lugar === 'Local';
      const titleStr = isLocal ? `Cadete A vs ${match.rival_nombre}` : `${match.rival_nombre} vs Cadete A`;

      matchEventsToInsert.push({
        team_id: team.id,
        title: titleStr,
        notes: `Jornada FFCV (${match.lugar})`,
        event_type: 'Partido',
        date: dStr,
        start_time: timeStr,
        end_time: '14:00:00',
        location: isLocal ? 'Polideportivo Municipal del Saladar' : `Campo de ${match.rival_nombre}`
      });
    }

    // 2. CREAR ENTRENAMIENTOS RECURRENTES (Martes, Miércoles, Jueves 20:00h | 31 Ago 2025 a 31 Dic 2026)
    const startDate = new Date('2025-08-31T20:00:00+02:00');
    const endDate = new Date('2026-12-31T20:00:00+02:00');
    const seasonId = team.season_id || '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

    // Actualizar matchEventsToInsert con season_id
    for (const me of matchEventsToInsert) {
      me.season_id = seasonId;
    }

    const trainingEventsToInsert = [];
    const curr = new Date(startDate);

    while (curr <= endDate) {
      const dayOfWeek = curr.getDay(); // 2=Martes, 3=Miércoles, 4=Jueves
      if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
        const dateStr = curr.toISOString().split('T')[0];

        trainingEventsToInsert.push({
          team_id: team.id,
          season_id: seasonId,
          title: 'Entrenamiento Cadete A',
          notes: 'Sesión de entrenamiento táctico y físico',
          event_type: 'Entrenamiento',
          date: dateStr,
          start_time: '20:00:00',
          end_time: '21:30:00',
          location: 'Polideportivo Municipal del Saladar'
        });
      }
      curr.setDate(curr.getDate() + 1);
    }

    console.log(`Generando ${trainingEventsToInsert.length} sesiones de entrenamiento...`);

    // Limpiar eventos anteriores del equipo
    const { data: existingEvents } = await supabase.from('team_events').select('id').eq('team_id', team.id);
    const existingEvIds = (existingEvents || []).map(e => e.id);

    if (existingEvIds.length > 0) {
      await supabase.from('attendance').delete().in('event_id', existingEvIds);
      await supabase.from('player_training_metrics').delete().in('event_id', existingEvIds);
      await supabase.from('team_events').delete().eq('team_id', team.id);
    }

    const allEventsToInsert = [...matchEventsToInsert, ...trainingEventsToInsert];
    const { data: insertedEvents, error: evErr } = await supabase
      .from('team_events')
      .insert(allEventsToInsert)
      .select();

    if (evErr) {
      console.error("Error insertando team_events:", evErr);
      return;
    }

    console.log(`✅ ${insertedEvents?.length || 0} eventos totales insertados en 'team_events'.`);

    // 3. GENERAR ASISTENCIA Y MÉTRICAS ACWR
    console.log("\nGenerando registros de asistencia y métricas de carga (RPE/ACWR) para los jugadores...");

    const attendanceToInsert = [];
    const metricsToInsert = [];

    for (const ev of insertedEvents || []) {
      const isMatch = ev.event_type === 'Partido';
      const baseDuration = isMatch ? 80 : 90;

      for (const player of players || []) {
        const isPresent = Math.random() > 0.08;
        const status = isPresent ? 'presente' : (Math.random() > 0.5 ? 'ausente' : 'justificado');

        attendanceToInsert.push({
          event_id: ev.id,
          player_id: player.id,
          status: status,
          notes: isPresent ? 'Asistencia confirmada' : 'Ausencia'
        });

        if (isPresent) {
          const rpeVal = Math.floor(Math.random() * 4) + 6;

          if (rpeMetric) {
            metricsToInsert.push({
              event_id: ev.id,
              player_id: player.id,
              metric_id: rpeMetric.id,
              value_number: rpeVal
            });
          }

          if (durationMetric) {
            metricsToInsert.push({
              event_id: ev.id,
              player_id: player.id,
              metric_id: durationMetric.id,
              value_number: baseDuration
            });
          }
        }
      }
    }

    if (attendanceToInsert.length > 0) {
      console.log(`Insertando ${attendanceToInsert.length} registros de asistencia...`);
      for (let i = 0; i < attendanceToInsert.length; i += 500) {
        const chunk = attendanceToInsert.slice(i, i + 500);
        await supabase.from('attendance').insert(chunk);
      }
    }

    if (metricsToInsert.length > 0) {
      console.log(`Insertando ${metricsToInsert.length} registros de métricas de carga (RPE / Minutos)...`);
      for (let i = 0; i < metricsToInsert.length; i += 500) {
        const chunk = metricsToInsert.slice(i, i + 500);
        await supabase.from('player_training_metrics').insert(chunk);
      }
    }

    console.log("\n🎉 GENERACIÓN DE EVENTOS Y MÉTRICAS ACWR FINALIZADA CON ÉXITO.");
  } catch (err) {
    console.error("Excepción inesperada:", err);
  }
}

generateEventsAndACWR();
