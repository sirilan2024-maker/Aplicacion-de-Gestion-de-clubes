const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  if (!line) return null;
  return line.substring(key.length + 1).trim().replace(/^["']|["']$/g, '');
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function inspect() {
  console.log('=== AUDITORIA COMPLETA DE PARTIDOS, ACTAS Y CONVOCATORIAS ===\n');

  // 1. Teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, category, ffcv_group_id, ffcv_team_id')
    .not('ffcv_group_id', 'is', null)
    .order('name');

  // 2. Played FFCV matches for the 7 teams
  const teamFfcvIds = teams.map(t => t.ffcv_team_id).filter(Boolean);
  const { data: ffcvMatches } = await supabase
    .from('ffcv_matches')
    .select('id, ffcv_match_id, codacta, ffcv_group_id, matchday, home_team_name, away_team_name, home_team_ffcv_id, away_team_ffcv_id, home_score, away_score, status')
    .or(`home_team_ffcv_id.in.(${teamFfcvIds.join(',')}),away_team_ffcv_id.in.(${teamFfcvIds.join(',')})`)
    .not('home_score', 'is', null)
    .order('matchday');

  console.log(`Total partidos FFCV disputados para los 7 equipos: ${ffcvMatches?.length}`);
  
  const matchesByTeam = {};
  teams.forEach(t => {
    const tMatches = ffcvMatches.filter(m => String(m.home_team_ffcv_id) === String(t.ffcv_team_id) || String(m.away_team_ffcv_id) === String(t.ffcv_team_id));
    const withCodacta = tMatches.filter(m => m.codacta);
    matchesByTeam[t.name] = { totalPlayed: tMatches.length, withCodacta: withCodacta.length };
  });
  console.table(matchesByTeam);

  // 3. Current convocatorias and stats in DB
  const { data: convocatorias } = await supabase
    .from('convocatorias')
    .select('id, player_id, partido_id, goals, yellow_cards, red_cards, minutes_played, players(first_name, last_name, team_id, teams(name))');

  const playerAgg = {};
  convocatorias?.forEach(c => {
    const p = c.players;
    if (!p) return;
    const pId = c.player_id;
    if (!playerAgg[pId]) {
      playerAgg[pId] = {
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        team: p.teams?.name || 'Sin equipo',
        matches: 0,
        minutes: 0,
        goals: 0,
        yellows: 0,
        reds: 0
      };
    }
    playerAgg[pId].matches += 1;
    playerAgg[pId].minutes += (c.minutes_played || 0);
    playerAgg[pId].goals += (c.goals || 0);
    playerAgg[pId].yellows += (c.yellow_cards || 0);
    playerAgg[pId].reds += (c.red_cards || 0);
  });

  const playersList = Object.values(playerAgg);
  console.log(`\nTotal jugadores con convocatorias en BD: ${playersList.length}`);

  const topScorers = [...playersList].sort((a, b) => b.goals - a.goals).slice(0, 5);
  console.log('\nTop 5 Goleadores ACTUALMENTE en BD:');
  console.table(topScorers);

  const topMinutes = [...playersList].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  console.log('\nTop 5 Minutos ACTUALMENTE en BD:');
  console.table(topMinutes);
}

inspect().catch(console.error);
