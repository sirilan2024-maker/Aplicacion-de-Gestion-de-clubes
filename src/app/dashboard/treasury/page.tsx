import { redirect } from "next/navigation";
import { getAuthenticatedContext, TREASURY_ADMIN_ROLES } from "@/lib/auth-helpers";
import TreasuryDashboard from "@/components/features/treasury/TreasuryDashboard";
import CoordinatorTreasuryView from "@/components/coordinator/CoordinatorTreasuryView";

export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  const { context, error } = await getAuthenticatedContext();
  if (!context || error) {
    redirect("/dashboard");
  }

  const role = context.profile.role || "";
  const roles: string[] = context.profile.roles || [];
  const allUserRoles = Array.from(new Set([role, ...roles])).filter(Boolean);

  // Verificación estricta en servidor: solo roles autorizados de tesorería/administración
  const isAuthorized = allUserRoles.some((r) => TREASURY_ADMIN_ROLES.includes(r));
  if (!isAuthorized) {
    redirect("/dashboard");
  }

  const isAdmin = allUserRoles.some((r) =>
    ["admin", "superadmin", "administrador", "admin_club", "tesorero", "secretario"].includes(r)
  );
  const isCoordinator =
    allUserRoles.some((r) => ["coordinador", "coordinador_general"].includes(r)) && !isAdmin;

  // Vista exclusiva para Coordinadores: Solo lectura de cuotas de jugadores sin contabilidad global
  if (isCoordinator) {
    return <CoordinatorTreasuryView />;
  }

  return <TreasuryDashboard />;
}
