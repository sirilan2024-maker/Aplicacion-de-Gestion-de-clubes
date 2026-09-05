import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 1. VERIFY SEASONS STATE ===');
  const { data: seasons } = await supabase.from('seasons').select('*');
  console.log('Seasons count:', seasons?.length);
  console.log('Seasons data:', seasons);

  console.log('\n=== 2. VERIFY TEAMS CONFIGURATION ===');
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, category, season_id, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url, ffcv_last_synced_at')
    .order('name');
  
  console.table(teams?.map(t => ({
    name: t.name,
    category: t.category,
    s_id: t.ffcv_season_id,
    comp_id: t.ffcv_competition_id,
    grp_id: t.ffcv_group_id,
    team_code: t.ffcv_team_id,
    last_synced: t.ffcv_last_synced_at ? 'YES' : 'NO'
  })));

  console.log('\n=== 3. VERIFY FFCV GROUPS ===');
  const { data: groups } = await supabase.from('ffcv_groups').select('*').order('ffcv_season_id', { ascending: false });
  console.table(groups?.map(g => ({
    season: g.ffcv_season_id,
    competition: g.competition_name,
    group: g.group_name,
    groupId: g.ffcv_group_id,
    jornadas: g.total_matchdays,
    teams: g.total_teams
  })));

  console.log('\n=== 4. MATCHES AND STANDINGS SUMMARY BY TEAM ===');
  for (const t of teams || []) {
    if (!t.ffcv_group_id) {
      console.log(`- ${t.name}: No FFCV config (Infantil C)`);
      continue;
    }

    const { count: matchCount } = await supabase
      .from('ffcv_matches')
      .select('*', { count: 'exact', head: true })
      .eq('ffcv_group_id', t.ffcv_group_id);

    const { count: teamMatches } = await supabase
      .from('ffcv_matches')
      .select('*', { count: 'exact', head: true })
      .eq('ffcv_group_id', t.ffcv_group_id)
      .or(`home_team_id.eq.${t.ffcv_team_id},away_team_id.eq.${t.ffcv_team_id}`);

    const { count: stdCount } = await supabase
      .from('ffcv_standings')
      .select('*', { count: 'exact', head: true })
      .eq('ffcv_group_id', t.ffcv_group_id);

    const { data: myStanding } = await supabase
      .from('ffcv_standings')
      .select('position, points, played, won, drawn, lost, goals_for, goals_against')
      .eq('ffcv_group_id', t.ffcv_group_id)
      .eq('team_ffcv_id', t.ffcv_team_id)
      .single();

    console.log(`- ${t.name} (Code: ${t.ffcv_team_id}, Group: ${t.ffcv_group_id}):`);
    console.log(`    Total Group Matches: ${matchCount}, Team Matches: ${teamMatches}`);
    console.log(`    Total Standings in Group: ${stdCount}`);
    if (myStanding) {
      console.log(`    Team Standing: Pos ${myStanding.position}º | ${myStanding.points} pts | ${myStanding.played} PJ (${myStanding.won}V ${myStanding.drawn}E ${myStanding.lost}D) | GF ${myStanding.goals_for} GC ${myStanding.goals_against}`);
    } else {
      console.log(`    Team Standing not found with team_ffcv_id ${t.ffcv_team_id}`);
    }
  }

  console.log('\n=== 5. INTERNAL DATA INTEGRITY CHECK ===');
  const { count: internalMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  const { count: internalCallups } = await supabase.from('match_callups').select('*', { count: 'exact', head: true });
  const { count: players } = await supabase.from('players').select('*', { count: 'exact', head: true });
  console.log(`Internal matches in DB: ${internalMatches}`);
  console.log(`Internal match callups in DB: ${internalCallups}`);
  console.log(`Internal players in DB: ${players}`);
}

main().catch(console.error);
