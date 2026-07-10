// src/app/dashboard/equipos/[teamId]/estadisticas/page.tsx
import { EstadisticasView } from "@/components/features/club/EstadisticasView"

export default async function TeamEstadisticasPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <EstadisticasView fixedTeamId={teamId} />;
}
