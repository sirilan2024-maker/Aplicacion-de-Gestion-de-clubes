import { createClient } from "@/lib/supabase/server"
import { TeamMatchesView } from '@/components/features/matches/TeamMatchesView';

export default async function DashboardTeamMatchesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, ffcv_url, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_last_synced_at, color, category')
    .eq('id', teamId)
    .single();

  let globalTeamIds = [teamId];
  if (teamData?.name) {
    const { data: globalTeams } = await supabase
      .from('teams')
      .select('id')
      .ilike('name', teamData.name);
    if (globalTeams) {
      globalTeamIds = [...new Set([...globalTeamIds, ...globalTeams.map(t => t.id)])];
    }
  }

  const [
    { data: matches },
    { data: allTeams },
    { data: players },
    { data: convocatorias },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, equipo:teams(id, name, color)')
      .in('equipo_id', globalTeamIds)
      .order('fecha_hora', { ascending: true }),
    supabase
      .from('teams')
      .select('*'),
    supabase
      .from('players')
      .select('*')
      .in('team_id', globalTeamIds)
      .neq('status', 'inactive'),
    supabase
      .from('convocatorias')
      .select('*'),
  ]);

  let groupInfo = null;
  if (teamData?.ffcv_group_id) {
    const { data: grp } = await supabase
      .from('ffcv_groups')
      .select('*')
      .eq('ffcv_group_id', teamData.ffcv_group_id)
      .single();
    groupInfo = grp || null;
  }

  return (
    <TeamMatchesView
      teamId={teamId}
      serverTeamData={teamData}
      serverMatches={matches || []}
      serverTeams={allTeams || []}
      serverPlayers={players || []}
      serverConvocatorias={convocatorias || []}
      serverGroupInfo={groupInfo}
    />
  );
}
