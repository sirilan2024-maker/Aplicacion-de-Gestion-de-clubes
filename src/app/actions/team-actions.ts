'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedContext, ADMIN_ROLES, canUserManageTeam, canUserManageClubStaff } from "@/lib/auth-helpers"


// Obtener todos los entrenadores del club
export async function getAvailableCoachesAction(clubId: string) {
  // Use service role to bypass RLS
  const supabase = await createAdminClient()

  // Buscar perfiles con rol entrenador, coach o coordinador (revisando role y rol por si acaso)
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, rol, club_id")
    .eq("club_id", clubId)

  if (error) {
    console.error("Error fetching coaches:", error)
    return { success: false, error: "Error al cargar entrenadores" }
  }

  // Filtrar en memoria por si el IN de supabase falla
  const validRoles = ["entrenador", "coach", "coordinador", "staff"]
  const coaches = (data || []).filter(p => {
    const r1 = p.role?.toLowerCase() || ""
    const r2 = p.rol?.toLowerCase() || ""
    return validRoles.includes(r1) || validRoles.includes(r2)
  })

  return { success: true, coaches }
}

// Obtener los entrenadores asignados a un equipo
export async function getTeamCoachesAction(teamId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from("team_coaches")
    .select("profile_id")
    .eq("team_id", teamId)
  if (error) return { success: false, assignedIds: [] }
  return { success: true, assignedIds: data.map(tc => tc.profile_id) }
}

// Obtener los perfiles completos de los entrenadores asignados (para la plantilla)
export async function getTeamCoachesProfilesAction(teamId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from("team_coaches")
    .select(`
      profile_id,
      profiles:profile_id (
        id, first_name, last_name, email, rol, role, avatar_url
      )
    `)
    .eq("team_id", teamId)
  if (error) return []
  return data
}

// Alternar asignación de un entrenador a un equipo
export async function toggleCoachTeamAssignmentAction(teamId: string, coachId: string, clubId: string, isAssigned: boolean) {

  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== clubId) {
    return { success: false, error: "No tienes permisos de administración en este club" };
  }

  const adminClient = await createAdminClient();

  const teamAccess = await canUserManageTeam(adminClient, context, teamId);
  if (!teamAccess.allowed) {
    return { success: false, error: teamAccess.reason || "Equipo no encontrado o no pertenece a tu club" };
  }

  const coachAccess = await canUserManageClubStaff(adminClient, context, coachId);
  if (!coachAccess.allowed) {
    return { success: false, error: coachAccess.reason || "Entrenador no encontrado o no pertenece a tu club" };
  }

  if (isAssigned) {
    const { error } = await adminClient.from("team_coaches").insert({
      team_id: teamId,
      profile_id: coachId,
      club_id: context.profile.club_id
    });
    if (error) {
      console.error("toggleCoachTeamAssignmentAction insert error:", error);
      return { success: false, error: "Error al asignar" };
    }
  } else {
    const { error } = await adminClient.from("team_coaches")
      .delete()
      .eq("team_id", teamId)
      .eq("profile_id", coachId)
      .eq("club_id", context.profile.club_id);
    if (error) {
      console.error("toggleCoachTeamAssignmentAction delete error:", error);
      return { success: false, error: "Error al desasignar" };
    }
  }

  // Actualizar el conteo de entrenadores en la tabla teams
  const { count } = await adminClient.from("team_coaches").select("*", { count: 'exact', head: true }).eq("team_id", teamId).eq("club_id", context.profile.club_id);
  if (count !== null) {
    await adminClient.from("teams").update({ coaches: count }).eq("id", teamId).eq("club_id", context.profile.club_id);
  }

  revalidatePath("/dashboard/equipos");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// P13: Análisis Deportivo Oficial FFCV y Evolución Histórica por Equipo
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamAnalysisMatch {
  id: string;
  codActa?: string;
  matchday: number;
  date: string | null;
  time: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  isHome: boolean;
  isSportingSaladarHome: boolean;
  rivalName: string;
  sportingScore: number | null;
  rivalScore: number | null;
  resultOutcome: 'V' | 'E' | 'D' | 'PDTE';
  status: string;
}

export interface TeamAnalysisStandingRow {
  position: number;
  teamFfcvId: string;
  teamName: string;
  isSportingSaladar: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TeamAnalysisEvolutionPoint {
  matchday: number;
  position: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
  resultOutcome?: 'V' | 'E' | 'D';
  played: number;
  won: number;
  drawn: number;
  lost: number;
}

export interface TeamAnalysisData {
  team: {
    id: string;
    name: string;
    category: string;
    color: string;
    ffcvGroupId: string | null;
    ffcvTeamId: string | null;
  };
  club: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  competition: {
    competitionName: string;
    groupName: string;
    seasonName: string;
    totalMatchdays: number;
    totalTeams: number;
  } | null;
  summary: {
    currentPosition: number;
    totalTeams: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
    possiblePoints: number;
    pointsPercentage: number;
    winRate: number;
    homeRecord: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number };
    awayRecord: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number };
  };
  standings: TeamAnalysisStandingRow[];
  matches: TeamAnalysisMatch[];
  evolution: TeamAnalysisEvolutionPoint[];
  historicalSeasons: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
}

export async function getTeamAnalysisAction(teamId: string): Promise<{ success: boolean; data?: TeamAnalysisData; error?: string }> {
  try {
    const adminClient = await createAdminClient();

    const { data: team, error: teamErr } = await adminClient
      .from('teams')
      .select('id, name, category, color, ffcv_group_id, ffcv_team_id, club_id')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      return { success: false, error: 'Equipo no encontrado' };
    }

    const { data: club } = await adminClient
      .from('clubs')
      .select('id, name, logo_url')
      .eq('id', team.club_id)
      .single();

    const { data: seasons } = await adminClient
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', team.club_id)
      .order('created_at', { ascending: false });

    const activeSeason = (seasons || []).find(s => s.is_active) || seasons?.[0];

    const normalize = (str?: string | null) => {
      if (!str) return '';
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    };

    let competitionInfo: TeamAnalysisData['competition'] = null;
    let summary: TeamAnalysisData['summary'] = {
      currentPosition: 0,
      totalTeams: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      possiblePoints: 0,
      pointsPercentage: 0,
      winRate: 0,
      homeRecord: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 },
      awayRecord: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 },
    };
    let standings: TeamAnalysisStandingRow[] = [];
    let matches: TeamAnalysisMatch[] = [];
    let evolution: TeamAnalysisEvolutionPoint[] = [];

    if (team.ffcv_group_id) {
      // 1. Group info
      const { data: group } = await adminClient
        .from('ffcv_groups')
        .select('*')
        .eq('ffcv_group_id', team.ffcv_group_id)
        .single();

      if (group) {
        competitionInfo = {
          competitionName: group.competition_name || 'Competición FFCV',
          groupName: group.group_name || 'Grupo Oficial',
          seasonName: activeSeason?.name ? activeSeason.name.replace(/^TEMPORADA\s+/i, '') : '2025/26',
          totalMatchdays: group.total_matchdays || 30,
          totalTeams: group.total_teams || 16,
        };
      }

      // 2. All Standings in the group
      const { data: allStandings } = await adminClient
        .from('ffcv_standings')
        .select('*')
        .eq('ffcv_group_id', team.ffcv_group_id)
        .order('matchday', { ascending: true });

      const maxMatchday = (allStandings || []).reduce((max, s) => Math.max(max, s.matchday || 0), 0);

      // Latest Standings table
      const latestRows = (allStandings || [])
        .filter(s => s.matchday === maxMatchday)
        .sort((a, b) => a.position - b.position);

      standings = latestRows.map(s => {
        const isSaladar = String(s.team_ffcv_id) === String(team.ffcv_team_id) || normalize(s.team_name).includes('saladar');
        return {
          position: s.position,
          teamFfcvId: String(s.team_ffcv_id || ''),
          teamName: s.team_name || 'Equipo',
          isSportingSaladar: isSaladar,
          played: s.played || 0,
          won: s.won || 0,
          drawn: s.drawn || 0,
          lost: s.lost || 0,
          goalsFor: s.goals_for || 0,
          goalsAgainst: s.goals_against || 0,
          goalDifference: s.goal_difference || 0,
          points: s.points || 0,
        };
      });

      // Evolution across matchdays
      const saladarStandings = (allStandings || [])
        .filter(s => String(s.team_ffcv_id) === String(team.ffcv_team_id) || normalize(s.team_name).includes('saladar'))
        .sort((a, b) => a.matchday - b.matchday);

      evolution = saladarStandings.map(s => ({
        matchday: s.matchday,
        position: s.position,
        points: s.points,
        goalDifference: s.goal_difference || 0,
        goalsFor: s.goals_for || 0,
        goalsAgainst: s.goals_against || 0,
        played: s.played || 0,
        won: s.won || 0,
        drawn: s.drawn || 0,
        lost: s.lost || 0,
      }));

      // 3. Matches
      const { data: gMatches } = await adminClient
        .from('ffcv_matches')
        .select('*')
        .eq('ffcv_group_id', team.ffcv_group_id)
        .order('matchday', { ascending: true });

      const teamMatches = (gMatches || []).filter(m => {
        const isId = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id);
        const isName = normalize(m.home_team_name).includes('saladar') || normalize(m.away_team_name).includes('saladar');
        return isId || isName;
      });

      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
      const homeRecord = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
      const awayRecord = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };

      matches = teamMatches.map(m => {
        const isSaladarHome = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || normalize(m.home_team_name).includes('saladar');
        const rivalName = isSaladarHome ? m.away_team_name : m.home_team_name;
        const sportingScore = isSaladarHome ? m.home_score : m.away_score;
        const rivalScore = isSaladarHome ? m.away_score : m.home_score;
        
        let outcome: 'V' | 'E' | 'D' | 'PDTE' = 'PDTE';
        if (sportingScore !== null && rivalScore !== null) {
          if (sportingScore > rivalScore) outcome = 'V';
          else if (sportingScore === rivalScore) outcome = 'E';
          else outcome = 'D';

          gf += sportingScore;
          ga += rivalScore;

          if (outcome === 'V') wins++;
          else if (outcome === 'E') draws++;
          else if (outcome === 'D') losses++;

          const pts = outcome === 'V' ? 3 : outcome === 'E' ? 1 : 0;
          if (isSaladarHome) {
            homeRecord.played++;
            homeRecord.gf += sportingScore;
            homeRecord.ga += rivalScore;
            homeRecord.points += pts;
            if (outcome === 'V') homeRecord.wins++;
            else if (outcome === 'E') homeRecord.draws++;
            else homeRecord.losses++;
          } else {
            awayRecord.played++;
            awayRecord.gf += sportingScore;
            awayRecord.ga += rivalScore;
            awayRecord.points += pts;
            if (outcome === 'V') awayRecord.wins++;
            else if (outcome === 'E') awayRecord.draws++;
            else awayRecord.losses++;
          }
        }

        return {
          id: m.id || String(m.cod_partido || m.matchday),
          codActa: m.codacta ? String(m.codacta) : m.cod_partido ? String(m.cod_partido) : undefined,
          matchday: m.matchday,
          date: m.match_date || null,
          time: m.match_time || null,
          homeTeamName: m.home_team_name,
          awayTeamName: m.away_team_name,
          homeScore: m.home_score,
          awayScore: m.away_score,
          isHome: isSaladarHome,
          isSportingSaladarHome: isSaladarHome,
          rivalName: rivalName || 'Rival',
          sportingScore,
          rivalScore,
          resultOutcome: outcome,
          status: m.home_score !== null ? 'Finalizado' : 'Pendiente',
        };
      });

      // Associate resultOutcome in evolution array
      evolution.forEach((evo) => {
        const matchForDay = matches.find(m => m.matchday === evo.matchday);
        if (matchForDay && matchForDay.resultOutcome !== 'PDTE') {
          evo.resultOutcome = matchForDay.resultOutcome;
        }
      });

      const playedCount = matches.filter(m => m.sportingScore !== null).length;
      const latestSaladarStanding = saladarStandings[saladarStandings.length - 1];
      const currentPos = latestSaladarStanding?.position || 0;
      const totalPoints = (wins * 3) + draws;
      const possiblePts = playedCount * 3;

      summary = {
        currentPosition: currentPos,
        totalTeams: group?.total_teams || latestRows.length || 0,
        matchesPlayed: playedCount,
        wins,
        draws,
        losses,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDiff: gf - ga,
        points: totalPoints,
        possiblePoints: possiblePts,
        pointsPercentage: possiblePts > 0 ? Math.round((totalPoints / possiblePts) * 1000) / 10 : 0,
        winRate: playedCount > 0 ? Math.round((wins / playedCount) * 1000) / 10 : 0,
        homeRecord,
        awayRecord,
      };
    }

    const historicalSeasons = (seasons || []).map(s => ({
      id: s.id,
      name: s.name,
      isActive: s.is_active ?? false,
    }));

    return {
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          category: team.category || 'General',
          color: team.color || '#4F46E5',
          ffcvGroupId: team.ffcv_group_id,
          ffcvTeamId: team.ffcv_team_id,
        },
        club: {
          id: club?.id || team.club_id,
          name: club?.name || 'Sporting Saladar',
          logoUrl: club?.logo_url || null,
        },
        competition: competitionInfo,
        summary,
        standings,
        matches,
        evolution,
        historicalSeasons,
      },
    };
  } catch (err: any) {
    console.error('Error in getTeamAnalysisAction:', err);
    return { success: false, error: 'Error al cargar análisis del equipo' };
  }
}

