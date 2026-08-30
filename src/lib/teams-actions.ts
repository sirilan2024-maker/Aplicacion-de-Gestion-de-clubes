'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTeam(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const color = formData.get('color') as string || '#1E40AF'

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No estás autenticado')
  }

  // Check user profile role and club
  const { data: profile } = await supabase.from('profiles').select('role, club_id').eq('id', user.id).single()
  
  let clubId = profile?.club_id

  if (!clubId) {
    const { data: fallbackClub } = await supabase.from('clubs').select('id').limit(1).single()
    if (fallbackClub) {
      clubId = fallbackClub.id
      await supabase.from('profiles').update({ club_id: clubId }).eq('id', user.id)
    } else {
      return { error: 'No tienes un club asignado. Crea uno primero.' }
    }
  }

  const { error } = await supabase.from('teams').insert({
    name,
    category,
    color,
    coach_id: user.id,
    club_id: clubId
  })

  if (error) {
    console.error('[TeamsAction] Error creating team:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard/teams')
  return { success: true }
}

import { getAuthenticatedContext, canUserDeleteTeam } from '@/lib/auth-helpers'

export async function deleteTeam(id: string) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { error: authError || 'No autenticado' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const access = await canUserDeleteTeam(adminClient, context, id)
  if (!access.allowed) {
    return { error: access.reason || 'No tienes permisos para eliminar este equipo' }
  }
  
  // 0. Eliminar dependencias problemáticas de los jugadores
  const { data: players } = await adminClient.from('players').select('id').eq('team_id', id).eq('club_id', context.profile.club_id)
  if (players && players.length > 0) {
    const playerIds = players.map(p => p.id)
    await adminClient.from('player_season_history').delete().in('player_id', playerIds)
  }

  // 1. Eliminar jugadores primero para mantener consistencia
  const { error: playersError } = await adminClient
    .from('players')
    .delete()
    .eq('team_id', id)
    .eq('club_id', context.profile.club_id)

  if (playersError) {
    console.error('[TeamsAction] Error deleting players:', playersError.message)
    return { error: playersError.message }
  }

  // 1.5. Eliminar invitaciones de staff pendientes asignadas a este equipo
  await adminClient
    .from('staff_invitations')
    .delete()
    .eq('team_id', id)

  // 2. Eliminar equipo
  const { error } = await adminClient
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('club_id', context.profile.club_id)

  if (error) {
    console.error('[TeamsAction] Error deleting team:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard/teams')
  revalidatePath('/dashboard/equipos')
  revalidatePath('/admin/equipos')
  revalidatePath('/dashboard/club/miembros')
  return { success: true }
}


export async function updateTeam(id: string, formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const color = formData.get('color') as string

  const { error } = await supabase
    .from('teams')
    .update({ name, category, color })
    .eq('id', id)

  if (error) {
    console.error('[TeamsAction] Error updating team:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard/teams')
  return { success: true }
}
