import { TeamPlayersView } from '@/components/features/dashboard/TeamPlayersView';

export default async function AdminTeamPlayersPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamPlayersView teamId={teamId} />;
}
