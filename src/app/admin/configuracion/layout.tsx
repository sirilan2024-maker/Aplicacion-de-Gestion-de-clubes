import { redirect } from "next/navigation";
import { getAuthenticatedContext, SUPER_ADMIN_ROLES } from "@/lib/auth-helpers";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { context: ctx, error: authErr } = await getAuthenticatedContext();

  if (authErr || !ctx) {
    redirect("/login");
  }

  const effectiveRole = ctx.realAdminRole || ctx.profile.role;
  const userRoles = ctx.profile.roles || [];
  const allRoles = Array.from(new Set([effectiveRole, ...userRoles])).filter(Boolean);

  const isSuperAdmin = allRoles.some((r) => SUPER_ADMIN_ROLES.includes(r));

  if (!isSuperAdmin) {
    redirect("/admin/inicio");
  }

  return <>{children}</>;
}
