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

  // Cargar partidos oficiales de la FFCV del grupo del equipo para resolver la Jornada exacta
  let ffcvMatchesQuery = null;
  if (effectiveTeam?.ffcv_group_id) {
    ffcvMatchesQuery = adminClient
      .from('ffcv_matches')
      .select('ffcv_match_id, matchday, match_date, home_team_name, away_team_name, home_team_ffcv_id, away_team_ffcv_id')
      .eq('ffcv_group_id', effectiveTeam.ffcv_group_id)
      .neq('ffcv_season_id', '21')
      .eq('ffcv_season_id', '22')
      .limit(2000);
  }

  const [
    { data: matches },
    { data: allTeams },
    ffcvMatchesRes,
  ] = await Promise.all([
    matchesQuery,
    teamsQuery,
    ffcvMatchesQuery ? ffcvMatchesQuery : Promise.resolve({ data: [] }),
  ]);

  const groupFfcvMatches = ffcvMatchesRes?.data || [];

  // Enriquecer partidos con su número oficial de Jornada
  const enrichedMatches = (matches || []).map((m: any, idx: number) => {
    let resolvedJornada: number | string | null = m.jornada || null;

    if (!resolvedJornada && groupFfcvMatches.length > 0) {
      // 1. Coincidencia directa por CodPartido en acta_oficial_url
      const codeMatch = m.acta_oficial_url?.match(/CodPartido=(\d+)/);
      const code = codeMatch ? codeMatch[1] : (m.ffcv_match_id ? String(m.ffcv_match_id) : null);
      if (code) {
        const found = groupFfcvMatches.find((f: any) => String(f.ffcv_match_id) === code);
        if (found && found.matchday) {
          resolvedJornada = found.matchday;
        }
      }

      // 2. Coincidencia secundaria por nombre de rival y proximidad temporal (±7 días)
      if (!resolvedJornada && m.rival_nombre) {
        const rNorm = m.rival_nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const mDate = m.fecha_hora ? new Date(m.fecha_hora) : null;
        for (const f of groupFfcvMatches) {
          const hNorm = (f.home_team_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const aNorm = (f.away_team_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (hNorm.includes(rNorm) || aNorm.includes(rNorm) || rNorm.includes(hNorm) || rNorm.includes(aNorm)) {
            if (mDate && f.match_date) {
              const fDate = new Date(f.match_date);
              const diffDays = Math.abs((mDate.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 7) {
                resolvedJornada = f.matchday;
                break;
              }
            } else {
              resolvedJornada = f.matchday;
              break;
            }
          }
        }
      }
    }

    // 3. Fallback: posición cronológica en la temporada si no tiene acta vinculada
    if (!resolvedJornada) {
      resolvedJornada = idx + 1;
    }

    return {
      ...m,
      jornada: resolvedJornada
    };
  });

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
      serverMatches={enrichedMatches}
      serverTeams={allTeams || []}
      serverPlayers={players || []}
      serverConvocatorias={convocatorias || []}
      serverGroupInfo={groupInfo}
    />
  );
}
