import { redirect } from "next/navigation"
import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessModule } from "@/lib/auth-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCoordinatorDashboardAction } from "@/app/actions/coordinator-actions"
import { CoordinadorDashboard } from "@/components/features/admin/CoordinadorDashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CoordinadorPage() {
  const { context, error: authError } = await getAuthenticatedContext()

  if (authError || !context) {
    redirect("/login")
  }

  const effectiveRole = context.realAdminRole || context.profile.role
  const userRoles = context.profile.roles || []
  const hasCoordRole = effectiveRole === 'coordinador' || userRoles.includes('coordinador')
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'superadmin' || userRoles.includes('admin') || userRoles.includes('superadmin')

  // Debe tener rol de coordinador o ser administrador general del club
  if (!hasCoordRole && !isAdmin) {
    redirect("/dashboard/equipos")
  }

  // Validación real del permiso del módulo en base de datos (role_navigation)
  const adminClient = createAdminClient()
  const access = await canUserAccessModule(adminClient, context, 'panel_coordinador')
  if (!access.allowed) {
    redirect("/dashboard/equipos")
  }

  const result = await getCoordinatorDashboardAction()

  return (
    <CoordinadorDashboard
      initialResult={result}
      userFirstName={context.profile.first_name || null}
    />
  )
}
