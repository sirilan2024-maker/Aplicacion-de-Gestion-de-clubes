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

export async function deleteTeam(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[TeamsAction] Error deleting team:', error.message)
    return { error: error.message }
  }

  revalidatePath('/dashboard/teams')
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
