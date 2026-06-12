import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGoals() {
  console.log("Starting to fix metrics for all clubs...");

  // Get all distinct club_ids from teams
  const { data: teams } = await supabase.from('teams').select('club_id');
  const clubIds = [...new Set(teams.map(t => t.club_id).filter(id => id))];

  console.log(`Found ${clubIds.length} clubs.`);

  for (const clubId of clubIds) {
    console.log(`Checking metrics for club ${clubId}...`);
    const { data: metrics } = await supabase.from('club_metrics').select('*').eq('club_id', clubId);
    
    let golesMetricId = metrics.find(m => m.name === 'Goles')?.id;
    let asistMetricId = metrics.find(m => m.name === 'Asistencias')?.id;

    if (!golesMetricId) {
      const { data, error } = await supabase.from('club_metrics').insert({ name: 'Goles', unit: 'cantidad', type: 'number', club_id: clubId }).select();
      if (error) console.error("Error creating Goles metric", error);
      else golesMetricId = data[0].id;
    }
    if (!asistMetricId) {
      const { data, error } = await supabase.from('club_metrics').insert({ name: 'Asistencias', unit: 'cantidad', type: 'number', club_id: clubId }).select();
      if (error) console.error("Error creating Asistencias metric", error);
      else asistMetricId = data[0].id;
    }

    if (!golesMetricId || !asistMetricId) continue;

    // Fetch all matches for this club's teams
    const { data: clubTeams } = await supabase.from('teams').select('id').eq('club_id', clubId);
    const teamIds = clubTeams.map(t => t.id);

    if (teamIds.length === 0) continue;

    const { data: matches } = await supabase.from('team_events')
      .select('id, team_id')
      .eq('event_type', 'Partido')
      .in('team_id', teamIds);

    if (!matches || matches.length === 0) continue;

    const newMetrics = [];
    
    for (const match of matches) {
      // Get attendance for this match
      const { data: attendees } = await supabase.from('attendance').select('player_id, status').eq('event_id', match.id).eq('status', 'Presente');
      if (!attendees) continue;

      for (const att of attendees) {
        // Only insert if not exists
        const { data: existingGoles } = await supabase.from('player_training_metrics')
          .select('id')
          .eq('event_id', match.id)
          .eq('player_id', att.player_id)
          .eq('metric_id', golesMetricId);

        if (!existingGoles || existingGoles.length === 0) {
          if (Math.random() > 0.8) {
            newMetrics.push({
              player_id: att.player_id,
              metric_id: golesMetricId,
              event_id: match.id,
              value_number: Math.floor(Math.random() * 3) + 1
            });
          }
        }

        const { data: existingAsist } = await supabase.from('player_training_metrics')
          .select('id')
          .eq('event_id', match.id)
          .eq('player_id', att.player_id)
          .eq('metric_id', asistMetricId);

        if (!existingAsist || existingAsist.length === 0) {
          if (Math.random() > 0.85) {
            newMetrics.push({
              player_id: att.player_id,
              metric_id: asistMetricId,
              event_id: match.id,
              value_number: Math.floor(Math.random() * 2) + 1
            });
          }
        }
      }
    }

    if (newMetrics.length > 0) {
      console.log(`Inserting ${newMetrics.length} goals/assists for club ${clubId}...`);
      for (let i = 0; i < newMetrics.length; i += 500) {
        await supabase.from('player_training_metrics').insert(newMetrics.slice(i, i + 500));
      }
    }
  }

  console.log("Goals and assists seeded for all clubs!");
}

addGoals().catch(console.error);
