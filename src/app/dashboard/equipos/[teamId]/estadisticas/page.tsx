import { EstadisticasView } from "@/app/dashboard/club/estadisticas/page"

export default async function TeamEstadisticasPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <EstadisticasView fixedTeamId={teamId} />;
}
