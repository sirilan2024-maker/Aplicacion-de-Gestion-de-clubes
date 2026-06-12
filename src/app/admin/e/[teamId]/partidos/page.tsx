import { TeamMatchesView } from '@/components/features/matches/TeamMatchesView';

export default async function AdminTeamMatchesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamMatchesView teamId={teamId} />;
}
