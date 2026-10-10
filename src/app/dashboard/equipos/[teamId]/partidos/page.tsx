import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TeamMatchesView } from '@/components/features/matches/TeamMatchesView';

export const dynamic = 'force-dynamic';

export default async function DashboardTeamMatchesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const adminClient = createAdminClient();

  // 1. Obtener el equipo solicitado
  const { data: requestedTeam } = await adminClient
    .from('teams')
    .select('id, name, club_id, season_id, ffcv_url, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_last_synced_at, color, category')
    .eq('id', teamId)
    .maybeSingle();

  // 2. Obtener la temporada activa del club (TEMPORADA 26/27)
  const clubId = requestedTeam?.club_id || '7ff5dbeb-2942-4576-8e74-b45a17646fb7';
  const { data: activeSeason } = await adminClient
    .from('seasons')
    .select('id, name')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();

  // 3. Si el equipo solicitado pertenecía a una temporada pasada (p. ej. 25/26), buscar el equipo homólogo en la temporada activa 26/27
  let effectiveTeam = requestedTeam;
  if (requestedTeam && activeSeason && requestedTeam.season_id !== activeSeason.id) {
    const { data: activeTeam } = await adminClient
      .from('teams')
      .select('id, name, club_id, season_id, ffcv_url, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_last_synced_at, color, category')
      .eq('club_id', requestedTeam.club_id)
      .eq('season_id', activeSeason.id)
      .ilike('name', `%${requestedTeam.name.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (activeTeam) {
      effectiveTeam = activeTeam;
    }
  }

  const targetSeasonId = activeSeason?.id || (effectiveTeam?.season_id !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c' ? effectiveTeam?.season_id : '');
  const currentTeamId = effectiveTeam?.id || teamId;

  // 4. Cargar partidos y equipos estrictamente de la temporada activa (NUNCA de la 25/26)
  let matchesQuery = adminClient
    .from('partidos')
    .select('*, equipo:teams(id, name, color, ffcv_group_id, ffcv_team_id, ffcv_url)')
    .eq('equipo_id', currentTeamId)
    .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
    .order('fecha_hora', { ascending: true });

  if (targetSeasonId) {
    matchesQuery = matchesQuery.eq('season_id', targetSeasonId);
  }

  let teamsQuery = adminClient
    .from('teams')
    .select('id, name, category, color, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url')
    .eq('club_id', clubId);

  if (targetSeasonId) {
    teamsQuery = teamsQuery.eq('season_id', targetSeasonId);
  }

  const [
    { data: matches },
    { data: allTeams },
  ] = await Promise.all([
    matchesQuery,
    teamsQuery,
  ]);

  const matchIds = (matches || []).map((m: any) => m.id);
  const { data: convocatorias } = matchIds.length > 0
    ? await adminClient.from('convocatorias').select('*').in('partido_id', matchIds)
    : { data: [] };

  const convPlayerIds = [...new Set((convocatorias || []).map((c: any) => c.player_id).filter(Boolean))];

  // 4. Cargar jugadores activos exclusivamente de la temporada activa (nunca 25/26)
  const effectiveSeason = targetSeasonId || '663ed6ef-1dab-4350-9489-ed50f9e9ac15';

  const { data: teamPlayers } = await adminClient
    .from('players')
    .select('*, team:teams!inner(id, season_id)')
    .eq('team_id', currentTeamId)
    .neq('team.season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
    .eq('team.season_id', effectiveSeason)
    .neq('status', 'inactive');

  let extraPlayers: any[] = [];
  const foreignConvIds = convPlayerIds.filter(id => !(teamPlayers || []).some((tp: any) => tp.id === id));
  if (foreignConvIds.length > 0) {
    const { data: extra } = await adminClient
      .from('players')
      .select('*, team:teams!inner(id, season_id)')
      .in('id', foreignConvIds)
      .neq('team.season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
      .eq('team.season_id', effectiveSeason)
      .neq('status', 'inactive');
    extraPlayers = extra || [];
  }

  const seenPlayerIds = new Set<string>();
  const players: any[] = [];
  for (const p of [...(teamPlayers || []), ...extraPlayers]) {
    const st = (p.status || '').toLowerCase();
    if (!seenPlayerIds.has(p.id) && !st.includes('inactiv') && !st.includes('baja')) {
      seenPlayerIds.add(p.id);
      players.push(p);
    }
  }

  // 5. Cargar información de la competición/grupo FFCV oficial
  let groupInfo = null;
  if (effectiveTeam?.ffcv_group_id) {
    const { data: grp } = await adminClient
      .from('ffcv_groups')
      .select('*')
      .eq('ffcv_group_id', effectiveTeam.ffcv_group_id)
      .maybeSingle();
    groupInfo = grp || null;
  }

  return (
    <TeamMatchesView
      teamId={currentTeamId}
      serverTeamData={effectiveTeam}
      serverMatches={matches || []}
      serverTeams={allTeams || []}
      serverPlayers={players || []}
      serverConvocatorias={convocatorias || []}
      serverGroupInfo={groupInfo}
    />
  );
}
