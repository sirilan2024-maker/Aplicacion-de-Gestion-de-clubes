import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { differenceInDays, parseISO } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const teamId = "a11ba4ee-6997-42f0-a3bc-11666ddfcb57"; // I need to get an actual teamId
  const { data: teams } = await supabase.from('equipos').select('id').limit(1);
  const tId = teams[0].id;
  
  const { data: allEvents } = await supabase.from('team_events').select('id, date, event_type').eq('team_id', tId);
  const trainings = allEvents.filter(e => e.event_type === 'Entrenamiento');
  const eventIds = allEvents.map(e => e.id);
  
  const { data: players } = await supabase.from('players').select('id, first_name').eq('team_id', tId);
  
  const res = await fetch('http://localhost:3000/api/player-metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventIds })
  });
  const json = await res.json();
  const ptData = json.data || [];
  
  console.log("ptData length:", ptData.length);
  
  const today = new Date();
  
  for (const p of players) {
    const dailyLoads = {};
    trainings.forEach(ev => {
      const rpe = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase().includes('rpe'))?.value_number;
      const min = ptData.find(m => m.event_id === ev.id && m.player_id === p.id && m.club_metrics?.name?.toLowerCase().includes('minutos'))?.value_number;
      if (rpe !== undefined && min !== undefined) {
        dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + (rpe * min);
      }
    });
    
    let acuteSum = 0; let acuteDays = 0;
    let chronicSum = 0; let chronicDays = 0;

    Object.entries(dailyLoads).forEach(([dateStr, load]) => {
      const diff = Math.abs(differenceInDays(today, parseISO(dateStr)));
      if (diff <= 7) { acuteSum += load; acuteDays++; }
      if (diff <= 28) { chronicSum += load; chronicDays++; }
    });

    const acuteLoad = acuteDays > 0 ? acuteSum / 7 : 0;
    const chronicLoad = chronicDays > 0 ? chronicSum / 28 : 0;
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    console.log(`Player: ${p.first_name}, ACWR: ${acwr}, Acute: ${acuteLoad}, Chronic: ${chronicLoad}`);
    console.log(dailyLoads);
  }
}

run().catch(console.error);
