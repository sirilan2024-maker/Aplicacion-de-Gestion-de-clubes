import { TeamCalendarView } from '@/components/features/dashboard/TeamCalendarView';

export default async function AdminTeamCalendarPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamCalendarView teamId={teamId} />;
}
