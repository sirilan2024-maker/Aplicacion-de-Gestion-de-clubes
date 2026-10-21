"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function updateUserEmailAction(newEmail: string) {
  try {
    const trimmed = (newEmail || "").trim().toLowerCase()
    
    // Validar formato básico de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed || !emailRegex.test(trimmed)) {
      return { success: false, error: "El formato del nuevo correo electrónico no es válido." }
    }

    const supabase = await createClient()
    const { data: { user }, error: userErr } = await supabase.auth.getUser()

    if (userErr || !user) {
      return { success: false, error: "Sesión no válida o expirada. Por favor, inicia sesión de nuevo." }
    }

    if (user.email?.toLowerCase() === trimmed) {
      return { success: false, error: "El nuevo email no puede ser idéntico al actual." }
    }

    const adminClient = createAdminClient()

    // 1. Verificar si el nuevo correo ya pertenece a otro usuario en auth.users
    const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (!listErr && users) {
      const existing = users.find(u => u.id !== user.id && u.email?.toLowerCase() === trimmed)
      if (existing) {
        return { success: false, error: "Ese correo electrónico ya está registrado por otra cuenta en el club." }
      }
    }

    // 2. Intentar actualizar a través de supabase.auth.updateUser (flujo estándar)
    const { data: updateData, error: updateErr } = await supabase.auth.updateUser({ email: trimmed })

    let usedAdminFallback = false

    if (updateErr) {
      // Si falla porque el email actual/antiguo está bloqueado, rebotado o es inválido en el proveedor de correo
      const errMsg = (updateErr.message || "").toLowerCase()
      const isOldEmailInvalid = errMsg.includes("is invalid") || errMsg.includes("invalid") || (updateErr as any).code === "email_address_invalid"

      if (isOldEmailInvalid) {
        // Fallback administrativo para corregir emails con erratas/rebotados
        const { error: adminUpdateErr } = await adminClient.auth.admin.updateUserById(user.id, {
          email: trimmed,
          email_confirm: true
        })

        if (adminUpdateErr) {
          return { success: false, error: "No se pudo actualizar el correo: " + adminUpdateErr.message }
        }
        usedAdminFallback = true
      } else {
        return { success: false, error: updateErr.message }
      }
    }

    // 3. Sincronizar en la tabla profiles
    await adminClient
      .from("profiles")
      .update({ email: trimmed })
      .eq("id", user.id)

    // 4. Si el perfil tiene un jugador vinculado, sincronizar también en la tabla players
    const { data: profile } = await adminClient
      .from("profiles")
      .select("linked_player_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.linked_player_id) {
      await adminClient
        .from("players")
        .update({ email: trimmed })
        .eq("id", profile.linked_player_id)
    }

    revalidatePath("/dashboard/mi-perfil")

    if (usedAdminFallback) {
      return { 
        success: true, 
        email: trimmed,
        message: "Tu correo electrónico ha sido actualizado y confirmado directamente con éxito." 
      }
    }

    return { 
      success: true, 
      email: trimmed,
      message: "Te hemos enviado un correo de confirmación. Revisa tu bandeja de entrada para verificarlo." 
    }

  } catch (err: any) {
    return { success: false, error: "Error inesperado al actualizar el correo: " + (err.message || String(err)) }
  }
}
