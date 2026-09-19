'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface AppNavModule {
  id: string
  label: string
  path: string
  icon_name: string
  sort_order: number
  category: string
}

export const SYSTEM_MODULES: AppNavModule[] = [
  // ── 1. General & Club ──
  { id: 'centro_control', label: 'Centro de Control', path: '/admin/inicio', icon_name: 'Home', sort_order: 1, category: 'General / Club' },
  { id: 'club', label: 'Directorio de Miembros', path: '/dashboard/club/miembros', icon_name: 'Users', sort_order: 2, category: 'General / Club' },
  { id: 'equipos', label: 'Equipos', path: '/dashboard/equipos', icon_name: 'Shield', sort_order: 3, category: 'General / Club' },
  { id: 'partidos', label: 'Partidos', path: '/admin/partidos', icon_name: 'Swords', sort_order: 4, category: 'General / Club' },
  { id: 'eventos', label: 'Eventos y Calendario', path: '/dashboard/events', icon_name: 'Calendar', sort_order: 5, category: 'General / Club' },
  { id: 'mensajes', label: 'Mensajes y Avisos', path: '/dashboard/mensajes', icon_name: 'MessageSquare', sort_order: 6, category: 'General / Club' },
  { id: 'estadisticas', label: 'Estadísticas del Club', path: '/dashboard/club/estadisticas', icon_name: 'BarChart3', sort_order: 7, category: 'General / Club' },
  { id: 'disciplina', label: 'Disciplina', path: '/dashboard/matches?view=disciplina', icon_name: 'AlertTriangle', sort_order: 8, category: 'General / Club' },
  { id: 'banco_tareas', label: 'Banco de Tareas', path: '/dashboard/exercises', icon_name: 'Target', sort_order: 9, category: 'General / Club' },
  { id: 'utilleria', label: 'Utillería y Ropa', path: '/dashboard/utilleria', icon_name: 'Shirt', sort_order: 10, category: 'General / Club' },
  { id: 'mis_equipos', label: 'Mis Equipos', path: '/dashboard/mis-equipos', icon_name: 'Shield', sort_order: 11, category: 'General / Club' },
  { id: 'live', label: 'Partidos en Directo', path: '/live', icon_name: 'Timer', sort_order: 12, category: 'General / Club' },

  // ── 2. Metodología ──
  { id: 'metodologia_dashboard', label: 'Dashboard Metodológico', path: '/admin/metodologia', icon_name: 'Brain', sort_order: 20, category: 'Metodología' },
  { id: 'metodologia_operativa', label: 'Centro Operativo', path: '/admin/metodologia/operativa', icon_name: 'Activity', sort_order: 21, category: 'Metodología' },
  { id: 'metodologia_direccion', label: 'Dirección Deportiva', path: '/admin/metodologia/direccion', icon_name: 'Building2', sort_order: 22, category: 'Metodología' },
  { id: 'metodologia_simulador', label: 'Simulación & Escenarios', path: '/admin/metodologia/simulador', icon_name: 'Sliders', sort_order: 23, category: 'Metodología' },
  { id: 'metodologia_planificacion', label: 'Planificación Deportiva', path: '/admin/metodologia/planificacion', icon_name: 'Layers', sort_order: 24, category: 'Metodología' },
  { id: 'metodologia_biblioteca', label: 'Biblioteca de Ejercicios', path: '/admin/metodologia/biblioteca', icon_name: 'BookOpen', sort_order: 25, category: 'Metodología' },
  { id: 'metodologia_curriculo', label: 'Currículo y Principios', path: '/admin/metodologia/curriculo', icon_name: 'Compass', sort_order: 26, category: 'Metodología' },
  { id: 'metodologia_evaluacion', label: 'Evaluación Formativa', path: '/admin/metodologia/evaluacion', icon_name: 'LineChart', sort_order: 27, category: 'Metodología' },
  { id: 'metodologia_jugadores', label: 'Seguimiento Jugadores', path: '/admin/metodologia/jugadores', icon_name: 'Users', sort_order: 28, category: 'Metodología' },

  // ── 3. Gestión y Finanzas ──
  { id: 'tesoreria', label: 'Tesorería y Finanzas', path: '/dashboard/treasury', icon_name: 'Wallet', sort_order: 40, category: 'Gestión y Finanzas' },
  { id: 'secretaria', label: 'Secretaría y Documentos', path: '/admin/secretaria', icon_name: 'FolderOpen', sort_order: 41, category: 'Gestión y Finanzas' },
  { id: 'inscripciones', label: 'Gestión de Inscripciones', path: '/dashboard/inscripciones', icon_name: 'UserPlus', sort_order: 42, category: 'Gestión y Finanzas' },
  { id: 'temporadas', label: 'Temporadas', path: '/admin/temporadas', icon_name: 'Timer', sort_order: 43, category: 'Gestión y Finanzas' },
  { id: 'archivo_historico', label: 'Archivo Histórico', path: '/dashboard/archivo', icon_name: 'Database', sort_order: 44, category: 'Gestión y Finanzas' },
  { id: 'calendario_ffcv', label: 'Calendario FFCV', path: '/admin/calendario-ffcv', icon_name: 'Database', sort_order: 45, category: 'Gestión y Finanzas' },
  { id: 'config_club', label: 'Configuración del Club', path: '/admin/configuracion', icon_name: 'Landmark', sort_order: 46, category: 'Gestión y Finanzas' },
  { id: 'config_notificaciones', label: 'Notificaciones', path: '/admin/configuracion/notificaciones', icon_name: 'Bell', sort_order: 47, category: 'Gestión y Finanzas' },
  { id: 'config_roles', label: 'Roles y Permisos', path: '/admin/configuracion/roles', icon_name: 'Shield', sort_order: 48, category: 'Gestión y Finanzas' },

  // ── 4. IA & API ──
  { id: 'informes_ia', label: 'Informes con IA', path: '/admin/informes-ia', icon_name: 'Brain', sort_order: 60, category: 'IA y Conexiones' },
  { id: 'ffcv_api', label: 'API FFCV / Novanet', path: '/admin/ffcv-api', icon_name: 'Globe', sort_order: 61, category: 'IA y Conexiones' },

  // ── 5. Personal ──
  { id: 'mi_perfil', label: 'Mi Perfil y Ajustes', path: '/dashboard/mi-perfil', icon_name: 'Settings', sort_order: 80, category: 'Personal' }
]

export const BASE_SYSTEM_ROLES = [
  { key: 'admin', label: 'Administrador', category: 'Dirección' },
  { key: 'directivo', label: 'Directiva', category: 'Dirección' },
  { key: 'coordinador', label: 'Coordinador', category: 'Deportiva' },
  { key: 'metodologo', label: 'Metodólogo', category: 'Deportiva' },
  { key: 'entrenador', label: 'Entrenador', category: 'Cuerpo Técnico' },
  { key: 'preparador_fisico', label: 'Preparador Físico', category: 'Cuerpo Técnico' },
  { key: 'delegado', label: 'Delegado', category: 'Cuerpo Técnico' },
  { key: 'secretario', label: 'Secretario', category: 'Administración' },
  { key: 'tesorero', label: 'Tesorero', category: 'Administración' },
  { key: 'utillero', label: 'Utillero', category: 'Administración' },
  { key: 'familia', label: 'Familia / Tutor', category: 'Comunidad' },
  { key: 'tutor', label: 'Tutor (Alias)', category: 'Comunidad' },
  { key: 'jugador', label: 'Jugador', category: 'Comunidad' },
  { key: 'socio', label: 'Socio', category: 'Comunidad' }
]

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
