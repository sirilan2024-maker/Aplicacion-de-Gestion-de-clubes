'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { SYSTEM_MODULES, BASE_SYSTEM_ROLES, AppNavModule, BaseSystemRole } from "@/lib/roles-config"


/**
 * Sincroniza todos los módulos del sistema en la tabla app_navigation si faltan.
 */
export async function syncAppNavigationAction() {
  try {
    const adminSupabase = await createAdminClient()
    const inserts = SYSTEM_MODULES.map(m => ({
      id: m.id,
      label: m.label,
      path: m.path,
      icon_name: m.icon_name,
      sort_order: m.sort_order
    }))

    const { error } = await adminSupabase
      .from('app_navigation')
      .upsert(inserts, { onConflict: 'id' })

    if (error) {
      console.error('Error syncing app_navigation:', error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/configuracion/roles")
    revalidatePath("/dashboard", "layout")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Obtiene toda la configuración de roles, módulos y permisos desde el servidor.
 */
export async function getRolesConfigDataAction() {
  try {
    const adminSupabase = await createAdminClient()

    // 1. Sincronizar módulos base
    const inserts = SYSTEM_MODULES.map(m => ({
      id: m.id,
      label: m.label,
      path: m.path,
      icon_name: m.icon_name,
      sort_order: m.sort_order
    }))
    await adminSupabase.from('app_navigation').upsert(inserts, { onConflict: 'id' })

    // 2. Obtener lista completa de módulos
    const { data: navData } = await adminSupabase
      .from('app_navigation')
      .select('*')
      .order('sort_order')

    const modules: AppNavModule[] = (navData && navData.length > 0)
      ? navData.map((dbItem: any) => {
          const sys = SYSTEM_MODULES.find(m => m.id === dbItem.id)
          return {
            id: dbItem.id,
            label: dbItem.label,
            path: dbItem.path,
            icon_name: dbItem.icon_name || 'Home',
            sort_order: dbItem.sort_order || 0,
            category: sys?.category || 'General / Club'
          }
        })
      : SYSTEM_MODULES

    // 3. Obtener permisos actuales
    const { data: roleNavData } = await adminSupabase
      .from('role_navigation')
      .select('role, nav_id')

    const perms: Record<string, string[]> = {}
    const existingDbRoles = new Set<string>()

    if (roleNavData) {
      roleNavData.forEach(item => {
        existingDbRoles.add(item.role)
        if (!perms[item.role]) perms[item.role] = []
        perms[item.role].push(item.nav_id)
      })
    }

    // 4. Lista de roles
    const roles: { key: string; label: string; category: string; isCustom?: boolean }[] = [...BASE_SYSTEM_ROLES]
    existingDbRoles.forEach(dbRole => {
      if (!roles.some(r => r.key === dbRole)) {
        roles.push({
          key: dbRole,
          label: dbRole.charAt(0).toUpperCase() + dbRole.slice(1).replace(/_/g, ' '),
          category: 'Personalizado',
          isCustom: true
        })
      }
    })

    roles.forEach(r => {
      if (!perms[r.key]) perms[r.key] = []
    })

    return {
      success: true,
      modules,
      roles,
      perms
    }
  } catch (err: any) {
    console.error('Error in getRolesConfigDataAction:', err)
    return {
      success: false,
      error: err.message,
      modules: SYSTEM_MODULES,
      roles: BASE_SYSTEM_ROLES,
      perms: {}
    }
  }
}

/**
 * Actualiza los permisos de navegación para un rol dado.
 */
export async function updateRoleNavigationAction(role: string, navIds: string[]) {
  const supabase = await createClient()

  // Verify the current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  // 1. Delete all existing navigation items for this role
  const { error: deleteError } = await adminSupabase
    .from('role_navigation')
    .delete()
    .eq('role', role)

  if (deleteError) {
    return { success: false, error: 'Error al limpiar los permisos antiguos: ' + deleteError.message }
  }

  // 2. Insert the new ones
  if (navIds.length > 0) {
    const inserts = navIds.map(navId => ({ role, nav_id: navId }))
    const { error: insertError } = await adminSupabase
      .from('role_navigation')
      .insert(inserts)

    if (insertError) {
      return { success: false, error: 'Error al guardar los nuevos permisos: ' + insertError.message }
    }
  }

  revalidatePath("/admin/configuracion/roles")
  revalidatePath("/dashboard", "layout")
  return { success: true }
}

/**
 * Crea un rol personalizado con los permisos seleccionados.
 */
export async function createCustomRoleAction(roleName: string, navIds: string[]) {
  const supabase = await createClient()

  // Verificar admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return { success: false, error: 'No tienes permisos de administrador' }
  }

  const normalizedKey = roleName
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")

  if (!normalizedKey || normalizedKey.length < 3) {
    return { success: false, error: 'El nombre del rol debe tener al menos 3 caracteres alfanuméricos.' }
  }

  // Guardar permisos en role_navigation
  return await updateRoleNavigationAction(normalizedKey, navIds)
}

/**
 * Elimina un rol personalizado (protege los roles nativos del sistema).
 */
export async function deleteCustomRoleAction(roleKey: string) {
  const isBaseRole = BASE_SYSTEM_ROLES.some(r => r.key === roleKey)
  if (isBaseRole) {
    return { success: false, error: 'No se pueden eliminar roles base del sistema.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return { success: false, error: 'No tienes permisos de administrador' }
  }

  const { error } = await adminSupabase
    .from('role_navigation')
    .delete()
    .eq('role', roleKey)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/configuracion/roles")
  revalidatePath("/dashboard", "layout")
  return { success: true }
}
