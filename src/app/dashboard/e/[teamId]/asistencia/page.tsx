import { TeamAsistenciaView } from '@/components/features/dashboard/TeamAsistenciaView';

export default async function DashboardTeamAsistenciaPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamAsistenciaView teamId={teamId} />;
}
