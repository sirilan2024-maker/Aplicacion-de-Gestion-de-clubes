import { createClient } from "@/lib/supabase/server"
import { TeamMatchesView } from '@/components/features/matches/TeamMatchesView';

export default async function DashboardTeamMatchesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const [
    { data: teamData },
    { data: matches },
    { data: allTeams },
    { data: players },
    { data: convocatorias },
  ] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, ffcv_url, color, category')
      .eq('id', teamId)
      .single(),
    supabase
      .from('partidos')
      .select('*, equipo:teams(id, name, color)')
      .eq('equipo_id', teamId)
      .order('fecha_hora', { ascending: false }),
    supabase
      .from('teams')
      .select('*'),
    supabase
      .from('players')
      .select('*')
      .neq('status', 'inactive'),
    supabase
      .from('convocatorias')
      .select('*'),
  ]);

  return (
    <TeamMatchesView
      teamId={teamId}
      serverTeamData={teamData}
      serverMatches={matches || []}
      serverTeams={allTeams || []}
      serverPlayers={players || []}
      serverConvocatorias={convocatorias || []}
    />
  );
}
