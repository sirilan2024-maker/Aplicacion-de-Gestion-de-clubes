import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

/**
 * Servicio centralizado para obtener información de autenticación y perfil.
 * Utiliza cache() de React para evitar múltiples llamadas en una misma petición (Memoización).
 */
export const getAuthSession = cache(async () => {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) return { user: null, profile: null }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, clubs(*)')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[AuthService] Error fetching profile:', profileError)
      return { user, profile: null }
    }

    return { user, profile }
  } catch (error) {
    console.error('[AuthService] Unexpected error:', error)
    return { user: null, profile: null }
  }
})

/**
 * Verifica si el usuario tiene un rol específico.
 */
export async function hasRole(roles: string[]) {
  const { profile } = await getAuthSession()
  if (!profile) return false
  return roles.includes(profile.role)
}

/**
 * Obtiene el ID del club del usuario actual.
 */
export async function getCurrentClubId() {
  const { profile } = await getAuthSession()
  return profile?.club_id || null
}
