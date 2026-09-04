import { createAdminClient } from '../supabase/admin';
import {
  fetchGroupMatchdays,
  fetchGroupStandings,
  fetchMatchdayResults
} from './client';
import {
  normalizeStandingItem,
  normalizeMatchItem
} from './parser';
import {
  FFCVSyncOptions,
  FFCVSyncResult,
  FFCVBatchSyncResult,
  FFCVGroupRecord,
  FFCVStandingRecord,
  FFCVMatchRecord
} from './types';

/**
 * Synchronizes FFCV group data (calendar, standings, matches) into Supabase
 */
export async function syncGroupFFCV(
  options: FFCVSyncOptions,
  customSupabaseClient?: any
): Promise<FFCVSyncResult> {
  const supabase = customSupabaseClient || createAdminClient();
  const errors: string[] = [];
  let standingsCount = 0;
  let matchesCount = 0;
  const matchdaysSynced: number[] = [];

  const {
    seasonId,
    competitionId,
    groupId,
    competitionName,
    groupName,
    syncAllMatchdays = true,
    specificMatchday
  } = options;

  // 1. Fetch matchdays list to know total matchdays and group structure
  let totalMatchdays = 0;
  let allMatchdays: number[] = [];
  try {
    const matchdaysRes = await fetchGroupMatchdays({ groupId });
    if (matchdaysRes && matchdaysRes.jornadas && Array.isArray(matchdaysRes.jornadas)) {
      allMatchdays = matchdaysRes.jornadas.map(j => parseInt(j.codjornada, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
      totalMatchdays = allMatchdays.length;
    }
  } catch (err: any) {
    errors.push(`Failed to fetch matchdays: ${err.message}`);
  }

  // 2. Upsert FFCV Group Record
  const groupRecord: FFCVGroupRecord = {
    ffcv_season_id: seasonId,
    ffcv_competition_id: competitionId,
    ffcv_group_id: groupId,
    season_name: null,
    competition_name: competitionName || null,
    group_name: groupName || null,
    total_matchdays: totalMatchdays || 0,
    total_teams: 0,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: groupErr } = await supabase
    .from('ffcv_groups')
    .upsert(groupRecord, { onConflict: 'ffcv_season_id,ffcv_competition_id,ffcv_group_id' });

  if (groupErr) {
    errors.push(`Error saving group: ${groupErr.message}`);
  }

  // 3. Determine which matchdays to process
  let targetMatchdays: number[] = [];
  if (specificMatchday !== undefined && specificMatchday !== null) {
    targetMatchdays = [specificMatchday];
  } else if (syncAllMatchdays && allMatchdays.length > 0) {
    targetMatchdays = allMatchdays;
  } else if (allMatchdays.length > 0) {
    targetMatchdays = allMatchdays;
  } else {
    targetMatchdays = [1];
  }

  let detectedTotalTeams = 0;

  // 4. Standings sync (Fetch J1 / active standing)
  const standingsMatchday = specificMatchday !== undefined && specificMatchday !== null ? specificMatchday : 1;
  try {
    const standingsRes = await fetchGroupStandings({ groupId, matchday: standingsMatchday });
    if (standingsRes && standingsRes.clasificacion && Array.isArray(standingsRes.clasificacion)) {
      detectedTotalTeams = standingsRes.clasificacion.length;

      const standingRecords: FFCVStandingRecord[] = standingsRes.clasificacion.map(item =>
        normalizeStandingItem(item, {
          seasonId,
          competitionId,
          groupId,
          matchday: standingsMatchday
        })
      );

      if (standingRecords.length > 0) {
        const { error: standErr } = await supabase
          .from('ffcv_standings')
          .upsert(standingRecords, { onConflict: 'ffcv_group_id,matchday,team_ffcv_id' });

        if (standErr) {
          errors.push(`Error upserting standings: ${standErr.message}`);
        } else {
          standingsCount += standingRecords.length;
        }
      }
    }
  } catch (err: any) {
    errors.push(`Error fetching standings for J${standingsMatchday}: ${err.message}`);
  }

  // 5. Process matches for each target matchday
  for (const matchday of targetMatchdays) {
    try {
      // Matches for this matchday
      const matchesRes = await fetchMatchdayResults({
        seasonId,
        competitionId,
        groupId,
        matchday,
        competitionName,
        groupName
      });

      if (matchesRes && matchesRes.partidos && Array.isArray(matchesRes.partidos)) {
        const matchRecords: FFCVMatchRecord[] = matchesRes.partidos.map(item =>
          normalizeMatchItem(item, {
            seasonId,
            competitionId,
            groupId,
            matchday
          })
        );

        if (matchRecords.length > 0) {
          const { error: matchErr } = await supabase
            .from('ffcv_matches')
            .upsert(matchRecords, { onConflict: 'ffcv_match_id' });

          if (matchErr) {
            errors.push(`Error upserting matches for matchday ${matchday}: ${matchErr.message}`);
          } else {
            matchesCount += matchRecords.length;
          }
        }
      }

      matchdaysSynced.push(matchday);
    } catch (err: any) {
      errors.push(`Error processing matchday ${matchday}: ${err.message}`);
    }
  }

  // Update total teams in group if detected
  if (detectedTotalTeams > 0) {
    await supabase
      .from('ffcv_groups')
      .update({ total_teams: detectedTotalTeams, updated_at: new Date().toISOString() })
      .match({ ffcv_season_id: seasonId, ffcv_competition_id: competitionId, ffcv_group_id: groupId });
  }

  return {
    success: errors.length === 0,
    group: {
      seasonId,
      competitionId,
      groupId,
      totalMatchdays,
      totalTeams: detectedTotalTeams
    },
    standingsInsertedOrUpdated: standingsCount,
    matchesInsertedOrUpdated: matchesCount,
    matchdaysSynced,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Synchronizes FFCV data for a specific team configured in our application
 */
export async function syncTeamFFCV(
  teamId: string,
  options: { syncAllMatchdays?: boolean; specificMatchday?: number } = {},
  customSupabaseClient?: any
): Promise<FFCVSyncResult> {
  const supabase = customSupabaseClient || createAdminClient();

  // 1. Fetch team's FFCV configuration
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id')
    .eq('id', teamId)
    .single();

  if (teamErr || !team) {
    throw new Error(`Team not found: ${teamErr?.message || teamId}`);
  }

  if (!team.ffcv_season_id || !team.ffcv_competition_id || !team.ffcv_group_id) {
    throw new Error(`Team ${team.name} (${teamId}) does not have complete FFCV configuration (season, competition, group).`);
  }

  // 2. Perform Group Sync
  const result = await syncGroupFFCV({
    seasonId: team.ffcv_season_id,
    competitionId: team.ffcv_competition_id,
    groupId: team.ffcv_group_id,
    teamFfcvId: team.ffcv_team_id || undefined,
    syncAllMatchdays: options.syncAllMatchdays,
    specificMatchday: options.specificMatchday
  }, supabase);

  // 3. Update team's last synced timestamp
  if (result.success) {
    await supabase
      .from('teams')
      .update({ ffcv_last_synced_at: new Date().toISOString() })
      .eq('id', teamId);
  }

  return result;
}

/**
 * Batch synchronization for all configured FFCV teams in the application.
 * Groups by unique FFCV group (season + competition + group) to avoid redundant requests.
 */
export async function syncAllConfiguredFFCVTeams(
  options: { syncAllMatchdays?: boolean; specificMatchday?: number } = {},
  customSupabaseClient?: any
): Promise<FFCVBatchSyncResult> {
  const supabase = customSupabaseClient || createAdminClient();

  // 1. Query all teams with FFCV configuration
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id')
    .not('ffcv_group_id', 'is', null)
    .not('ffcv_season_id', 'is', null)
    .not('ffcv_competition_id', 'is', null);

  if (teamsErr) {
    throw new Error(`Failed to query configured FFCV teams: ${teamsErr.message}`);
  }

  const configuredTeams = teams || [];
  const groupMap = new Map<string, { seasonId: string; competitionId: string; groupId: string; teamIds: string[] }>();

  for (const t of configuredTeams) {
    if (!t.ffcv_season_id || !t.ffcv_competition_id || !t.ffcv_group_id) continue;
    const key = `${t.ffcv_season_id}_${t.ffcv_competition_id}_${t.ffcv_group_id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        seasonId: t.ffcv_season_id,
        competitionId: t.ffcv_competition_id,
        groupId: t.ffcv_group_id,
        teamIds: [t.id]
      });
    } else {
      groupMap.get(key)!.teamIds.push(t.id);
    }
  }

  const groupResults: FFCVBatchSyncResult['groupResults'] = [];
  let totalStandings = 0;
  let totalMatches = 0;
  let groupsSuccess = 0;
  let groupsFailed = 0;

  // 2. Process each unique group once
  for (const [key, groupInfo] of Array.from(groupMap.entries())) {
    try {
      const syncRes = await syncGroupFFCV({
        seasonId: groupInfo.seasonId,
        competitionId: groupInfo.competitionId,
        groupId: groupInfo.groupId,
        syncAllMatchdays: options.syncAllMatchdays,
        specificMatchday: options.specificMatchday
      }, supabase);

      if (syncRes.success) {
        groupsSuccess++;
        totalStandings += syncRes.standingsInsertedOrUpdated;
        totalMatches += syncRes.matchesInsertedOrUpdated;

        // Update last synced at for all teams in this group
        const nowIso = new Date().toISOString();
        await supabase
          .from('teams')
          .update({ ffcv_last_synced_at: nowIso })
          .in('id', groupInfo.teamIds);

        groupResults.push({
          groupKey: key,
          seasonId: groupInfo.seasonId,
          competitionId: groupInfo.competitionId,
          groupId: groupInfo.groupId,
          teamIds: groupInfo.teamIds,
          result: syncRes
        });
      } else {
        groupsFailed++;
        groupResults.push({
          groupKey: key,
          seasonId: groupInfo.seasonId,
          competitionId: groupInfo.competitionId,
          groupId: groupInfo.groupId,
          teamIds: groupInfo.teamIds,
          result: syncRes,
          error: (syncRes.errors || []).join('; ')
        });
      }
    } catch (err: any) {
      groupsFailed++;
      groupResults.push({
        groupKey: key,
        seasonId: groupInfo.seasonId,
        competitionId: groupInfo.competitionId,
        groupId: groupInfo.groupId,
        teamIds: groupInfo.teamIds,
        error: err.message || 'Unexpected sync error'
      });
    }
  }

  return {
    success: groupsFailed === 0,
    timestamp: new Date().toISOString(),
    totalTeamsConfigured: configuredTeams.length,
    uniqueGroupsCount: groupMap.size,
    groupsProcessed: groupMap.size,
    groupsSuccess,
    groupsFailed,
    totalStandingsUpdated: totalStandings,
    totalMatchesUpdated: totalMatches,
    groupResults
  };
}
