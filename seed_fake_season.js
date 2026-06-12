import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting seed...");

  const { data: playerTeams } = await supabase.from('players').select('team_id');
  const teams = [...new Set(playerTeams.map(p => p.team_id).filter(id => id))];
  
  console.log(`Found ${teams.length} teams with players. Seeding all of them...`);

  // Get club metrics (Minutos, RPE, Valoración)
  const { data: metrics, error: mErr } = await supabase.from('club_metrics').select('id, name');
  if (mErr || !metrics) {
    console.error("No metrics found.", mErr);
    return;
  }
  const minMetric = metrics.find(m => m.name.toLowerCase().includes('minuto'))?.id;
  const rpeMetric = metrics.find(m => m.name.toLowerCase().includes('rpe'))?.id;
  const valMetric = metrics.find(m => m.name.toLowerCase().includes('valoración') || m.name.toLowerCase().includes('valoracion'))?.id;

  for (const teamId of teams) {
    console.log(`Seeding team ${teamId}...`);

    // Get players
    const { data: players, error: pErr } = await supabase.from('players').select('id').eq('team_id', teamId);
    if (pErr || !players || players.length === 0) {
      console.log(`No players found for team ${teamId}, skipping.`);
      continue;
    }
    console.log(`Found ${players.length} players for team ${teamId}.`);

    const eventsToInsert = [];
    const attendancesToInsert = [];
    const metricsToInsert = [];

    const now = new Date();
    // Generate backwards for 12 weeks
    for (let week = 1; week <= 12; week++) {
      const weekDate = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
      
      // Tuesday Training
      const t1Date = new Date(weekDate);
      t1Date.setDate(t1Date.getDate() - (t1Date.getDay() - 2)); // Set to Tuesday
      const t1Id = crypto.randomUUID();
      eventsToInsert.push({
        id: t1Id,
        team_id: teamId,
        title: `Entrenamiento Martes Sem ${week}`,
        event_type: 'Entrenamiento',
        date: t1Date.toISOString().split('T')[0],
        start_time: '19:00:00'
      });

      // Thursday Training
      const t2Date = new Date(weekDate);
      t2Date.setDate(t2Date.getDate() - (t2Date.getDay() - 4)); // Set to Thursday
      const t2Id = crypto.randomUUID();
      eventsToInsert.push({
        id: t2Id,
        team_id: teamId,
        title: `Entrenamiento Jueves Sem ${week}`,
        event_type: 'Entrenamiento',
        date: t2Date.toISOString().split('T')[0],
        start_time: '19:00:00'
      });

      // Saturday Match
      const mDate = new Date(weekDate);
      mDate.setDate(mDate.getDate() - (mDate.getDay() - 6)); // Set to Saturday
      const mId = crypto.randomUUID();
      eventsToInsert.push({
        id: mId,
        team_id: teamId,
        title: `Partido Jornada ${13 - week}`,
        event_type: 'Partido',
        date: mDate.toISOString().split('T')[0],
        start_time: '10:00:00'
      });
    }

    console.log(`Generated ${eventsToInsert.length} events for team ${teamId}. Inserting...`);
    await supabase.from('team_events').insert(eventsToInsert);

    for (const event of eventsToInsert) {
      const isMatch = event.event_type === 'Partido';

      for (const player of players) {
        // 80% present, 10% absent, 10% injured
        const rand = Math.random();
        let status = 'Presente';
        if (rand > 0.9) status = 'Ausente';
        else if (rand > 0.8) status = 'Lesionado';

        attendancesToInsert.push({
          team_id: teamId,
          player_id: player.id,
          event_id: event.id,
          date: event.date,
          status: status
        });

        if (status === 'Presente') {
          // Minutes
          if (minMetric) {
            metricsToInsert.push({
              player_id: player.id,
              metric_id: minMetric,
              event_id: event.id,
              value_number: isMatch ? Math.floor(Math.random() * 90) + 1 : 90 // Match max 90, training 90
            });
          }
          // RPE (1-10)
          if (rpeMetric) {
            metricsToInsert.push({
              player_id: player.id,
              metric_id: rpeMetric,
              event_id: event.id,
              value_number: Math.floor(Math.random() * 4) + 6 // 6 to 9 usually
            });
          }
          // Nota (1-10)
          if (valMetric) {
            metricsToInsert.push({
              player_id: player.id,
              metric_id: valMetric,
              event_id: event.id,
              value_number: Math.floor(Math.random() * 4) + 6 // 6 to 9
            });
          }
        }
      }
    }

    console.log(`Inserting attendances for team ${teamId}...`);
    for (let i = 0; i < attendancesToInsert.length; i += 500) {
      const chunk = attendancesToInsert.slice(i, i + 500);
      await supabase.from('attendance').insert(chunk);
    }

    console.log(`Inserting metrics for team ${teamId}...`);
    for (let i = 0; i < metricsToInsert.length; i += 500) {
      const chunk = metricsToInsert.slice(i, i + 500);
      await supabase.from('player_training_metrics').insert(chunk);
    }
  }

  console.log("Seed complete for all teams!");
}

seed().catch(console.error);
