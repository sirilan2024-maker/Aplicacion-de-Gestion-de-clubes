'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateRoleNavigationAction(role: string, navIds: string[]) {
  const supabase = await createClient()

  // Verify the current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  // 1. Delete all existing navigation items for this role
  const { error: deleteError } = await supabase
    .from('role_navigation')
    .delete()
    .eq('role', role)

  if (deleteError) {
    return { success: false, error: 'Error al limpiar los permisos antiguos.' }
  }

  // 2. Insert the new ones
  if (navIds.length > 0) {
    const inserts = navIds.map(navId => ({ role, nav_id: navId }))
    const { error: insertError } = await supabase
      .from('role_navigation')
      .insert(inserts)

    if (insertError) {
      return { success: false, error: 'Error al guardar los nuevos permisos.' }
    }
  }

  revalidatePath("/admin/configuracion/roles")
  revalidatePath("/dashboard", "layout") // This will force sidebar to re-fetch
  return { success: true }
}
