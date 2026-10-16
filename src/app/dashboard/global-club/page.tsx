import { redirect } from "next/navigation";
import { getAuthenticatedContext, ADMIN_ROLES, COACH_ROLES, canUserAccessModule } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import GlobalClubClient from "./GlobalClubClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GlobalClubPage() {
  const { context, error: authError } = await getAuthenticatedContext();

  if (authError || !context) {
    redirect("/auth/login");
  }

  const effectiveRole = context.isImpersonating ? context.profile.role : (context.realAdminRole || context.profile.role);
  const userRoles = context.profile.roles || [];
  const allRoles = Array.from(new Set([effectiveRole, ...userRoles].filter(Boolean)));

  const isAdmin = !context.isImpersonating && allRoles.some(r => ADMIN_ROLES.includes(r));
  const isCoach = allRoles.some(r => COACH_ROLES.includes(r));

  // Si no es un administrador general del club, validar permiso explícito del módulo en role_navigation
  if (!isAdmin) {
    const adminClient = createAdminClient();
    const access = await canUserAccessModule(adminClient, context, 'global_club');
    if (!access.allowed) {
      if (isCoach) {
        redirect("/dashboard/mis-equipos");
      }
      if (allRoles.includes('familia') || allRoles.includes('family') || allRoles.includes('tutor') || allRoles.includes('jugador')) {
        redirect("/dashboard/family");
      }
      redirect("/dashboard/mis-equipos");
    }
  }

  return <GlobalClubClient />;
}
