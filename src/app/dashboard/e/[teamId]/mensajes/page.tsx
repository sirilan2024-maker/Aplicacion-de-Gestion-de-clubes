import { TeamMessagesView } from '@/components/features/dashboard/TeamMessagesView';

export default async function DashboardTeamMessagesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamMessagesView teamId={teamId} />;
}
