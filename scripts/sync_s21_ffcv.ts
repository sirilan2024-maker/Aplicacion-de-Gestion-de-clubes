import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { syncGroupFFCV } from '../src/lib/ffcv/sync';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const S21_CONFIGS = [
  {
    teamId: 'ac851720-4531-4e41-97ba-f2290aea1be4',
    teamName: 'SENIOR',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509171',
    ffcv_group_id: '29509178',
    ffcv_team_id: '18233',
    competitionName: 'Segona FFCV',
    groupName: 'Grup - 8',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=18233&temporada=21'
  },
  {
    teamId: 'b895fc97-c692-4189-a385-53bebd90d262',
    teamName: 'JUVENIL A',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509159',
    ffcv_group_id: '30671749',
    ffcv_team_id: '25055',
    competitionName: 'Tercera FFCV Juvenil',
    groupName: 'Grup - 26',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=25055&temporada=21'
  },
  {
    teamId: '3b77f128-980e-4dff-9a47-1708fd029728',
    teamName: 'JUVENIL B',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509159',
    ffcv_group_id: '30671679',
    ffcv_team_id: '30026461',
    competitionName: 'Tercera FFCV Juvenil',
    groupName: 'Grup - 25',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=30026461&temporada=21'
  },
  {
    teamId: 'e1be067f-2b93-4aac-969a-55c7c71badb9',
    teamName: 'CADETE A',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509507',
    ffcv_group_id: '29509515',
    ffcv_team_id: '903700117',
    competitionName: 'Segona Cadet Alacant',
    groupName: 'Grup - 8',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=903700117&temporada=21'
  },
  {
    teamId: '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50',
    teamName: 'CADETE B',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509507',
    ffcv_group_id: '29509514',
    ffcv_team_id: '30719536',
    competitionName: 'Segona Cadet Alacant',
    groupName: 'Grup - 7',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=30719536&temporada=21'
  },
  {
    teamId: '9fe1ca89-d32c-4098-8e18-60981708b57e',
    teamName: 'INFANTIL A',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509521',
    ffcv_group_id: '29509529',
    ffcv_team_id: '903700170',
    competitionName: 'Segona Infantil Alacant',
    groupName: 'Grup - 8',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=903700170&temporada=21'
  },
  {
    teamId: 'a0393d63-fa7b-40a7-97fc-60b61483babf',
    teamName: 'INFANTIL B',
    ffcv_season_id: '21',
    ffcv_competition_id: '29509521',
    ffcv_group_id: '29509528',
    ffcv_team_id: '903700206',
    competitionName: 'Segona Infantil Alacant',
    groupName: 'Grup - 7',
    ffcv_url: 'https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=903700206&temporada=21'
  }
];

async function syncAllS21() {
  console.log('=== STARTING OFFICIAL FFCV SEASON 21 SYNC ===\n');

  // 1. Update teams table with Season 21 official parameters
  for (const cfg of S21_CONFIGS) {
    const { error } = await supabase
      .from('teams')
      .update({
        ffcv_season_id: cfg.ffcv_season_id,
        ffcv_competition_id: cfg.ffcv_competition_id,
        ffcv_group_id: cfg.ffcv_group_id,
        ffcv_team_id: cfg.ffcv_team_id,
        ffcv_url: cfg.ffcv_url
      })
      .eq('id', cfg.teamId);

    if (error) {
      console.error(`Error updating team ${cfg.teamName}:`, error.message);
    } else {
      console.log(`Updated team [${cfg.teamName}] with FFCV Season 21 params.`);
    }
  }

  // 2. Synchronize all groups for Season 21
  for (const cfg of S21_CONFIGS) {
    console.log(`\nSyncing FFCV Group for [${cfg.teamName}] (Group: ${cfg.ffcv_group_id})...`);
    try {
      const res = await syncGroupFFCV({
        seasonId: cfg.ffcv_season_id,
        competitionId: cfg.ffcv_competition_id,
        groupId: cfg.ffcv_group_id,
        competitionName: cfg.competitionName,
        groupName: cfg.groupName,
        teamFfcvId: cfg.ffcv_team_id,
        syncAllMatchdays: true
      }, supabase);

      console.log(`  Result for ${cfg.teamName}:`, {
        success: res.success,
        matchesInsertedOrUpdated: res.matchesInsertedOrUpdated,
        standingsInsertedOrUpdated: res.standingsInsertedOrUpdated,
        totalMatchdays: res.group.totalMatchdays,
        totalTeams: res.group.totalTeams,
        errors: res.errors
      });

      // Update last synced at on team
      await supabase
        .from('teams')
        .update({ ffcv_last_synced_at: new Date().toISOString() })
        .eq('id', cfg.teamId);
    } catch (err: any) {
      console.error(`  Error syncing group for ${cfg.teamName}:`, err.message);
    }
  }

  // 3. Check DB totals and Season 22 preservation
  console.log('\n=== VERIFYING INTEGRITY & TOTALS ===');
  const { data: seasons } = await supabase.from('seasons').select('*');
  console.log('Seasons state in DB:', seasons?.map(s => ({ name: s.name, is_active: s.is_active })));

  const { data: groups, count: grpCount } = await supabase.from('ffcv_groups').select('*', { count: 'exact' });
  const { count: s21MatchCount } = await supabase.from('ffcv_matches').select('*', { count: 'exact', head: true }).eq('ffcv_season_id', '21');
  const { count: s22MatchCount } = await supabase.from('ffcv_matches').select('*', { count: 'exact', head: true }).eq('ffcv_season_id', '22');
  const { count: s21StdCount } = await supabase.from('ffcv_standings').select('*', { count: 'exact', head: true }).eq('ffcv_season_id', '21');
  const { count: s22StdCount } = await supabase.from('ffcv_standings').select('*', { count: 'exact', head: true }).eq('ffcv_season_id', '22');

  console.log('Total FFCV Groups in DB:', grpCount);
  console.log(groups?.map(g => ` - Season ${g.ffcv_season_id}: ${g.competition_name} - ${g.group_name} (${g.total_matchdays} J, ${g.total_teams} teams, group: ${g.ffcv_group_id})`));
  console.log(`FFCV Matches Season 21 (2025/26): ${s21MatchCount}`);
  console.log(`FFCV Matches Season 22 (2026/27): ${s22MatchCount} (PRESERVED)`);
  console.log(`FFCV Standings Season 21: ${s21StdCount}`);
  console.log(`FFCV Standings Season 22: ${s22StdCount} (PRESERVED)`);

  // Detailed Check: Cadete B J1-J5 Standings
  console.log('\n=== CADETE B J1..J5 STANDINGS CHECK ===');
  const { data: cadeteBStandings } = await supabase
    .from('ffcv_standings')
    .select('matchday, position, team_name, points, played, won, drawn, lost, goals_for, goals_against')
    .eq('ffcv_group_id', '29509514')
    .eq('team_ffcv_id', '30719536')
    .order('matchday', { ascending: true })
    .limit(5);
  console.log('Cadete B Standings J1 to J5:', cadeteBStandings);

  // Detailed Check: Cadete B J1 and Cadete A J1 Actas
  console.log('\n=== ACTAS CHECK ===');
  const { data: cadeteBMatchJ1 } = await supabase
    .from('ffcv_matches')
    .select('*')
    .eq('ffcv_group_id', '29509514')
    .eq('matchday', 1)
    .or('home_team_ffcv_id.eq.30719536,away_team_ffcv_id.eq.30719536')
    .single();
  console.log('Cadete B J1 Match:', {
    match_id: cadeteBMatchJ1?.ffcv_match_id,
    codacta: cadeteBMatchJ1?.codacta,
    match: `${cadeteBMatchJ1?.home_team_name} ${cadeteBMatchJ1?.home_score} - ${cadeteBMatchJ1?.away_score} ${cadeteBMatchJ1?.away_team_name}`,
    status: cadeteBMatchJ1?.status,
    date: cadeteBMatchJ1?.match_date
  });

  const { data: cadeteAMatchJ1 } = await supabase
    .from('ffcv_matches')
    .select('*')
    .eq('ffcv_group_id', '29509515')
    .eq('matchday', 1)
    .or('home_team_ffcv_id.eq.903700117,away_team_ffcv_id.eq.903700117')
    .single();
  console.log('Cadete A J1 Match:', {
    match_id: cadeteAMatchJ1?.ffcv_match_id,
    codacta: cadeteAMatchJ1?.codacta,
    match: `${cadeteAMatchJ1?.home_team_name} ${cadeteAMatchJ1?.home_score} - ${cadeteAMatchJ1?.away_score} ${cadeteAMatchJ1?.away_team_name}`,
    status: cadeteAMatchJ1?.status,
    date: cadeteAMatchJ1?.match_date
  });
}

syncAllS21().catch(console.error);
