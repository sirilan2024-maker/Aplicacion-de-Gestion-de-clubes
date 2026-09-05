import { getTeamAnalysisAction } from "@/app/actions/team-actions";
import { TeamAnalysisView } from "@/components/features/teams/TeamAnalysisView";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default async function TeamAnalysisPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const res = await getTeamAnalysisAction(teamId);

  if (!res.success || !res.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Análisis FFCV no disponible
        </div>
        <p className="text-sm text-red-700">
          {res.error || "No se han podido cargar los datos de competición oficial para este equipo."}
        </p>
        <Link
          href={`/dashboard/equipos/${teamId}/partidos`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Partidos
        </Link>
      </div>
    );
  }

  return <TeamAnalysisView initialData={res.data} />;
}
