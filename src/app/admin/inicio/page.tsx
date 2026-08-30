import { getExecutiveDashboardAction } from "@/app/actions/club-actions";
import { AdminInicioClient } from "@/components/features/admin/AdminInicioClient";

export const dynamic = "force-dynamic";

export default async function AdminInicioPage() {
  const result = await getExecutiveDashboardAction();
  return <AdminInicioClient initialResult={result} />;
}
