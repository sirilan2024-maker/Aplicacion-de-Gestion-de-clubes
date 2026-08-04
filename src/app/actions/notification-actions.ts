"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function getUnreadNotificationsAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function markAllNotificationsAsReadAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .eq('is_read', false)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
