"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Componente que verifica si el usuario familia tiene RGPD pendiente.
 * Si es así, redirige a /dashboard/rgpd-pendiente.
 * Se monta en el layout del dashboard para interceptar todas las rutas.
 */
export function RgpdGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // No interceptar si ya estamos en la página de RGPD pendiente
    if (pathname === "/dashboard/rgpd-pendiente") return

    async function checkGdpr() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      // Solo afecta a familias
      if (!profile || profile.role !== "family") return

      // Comprobar si tiene jugadores sin consentimiento RGPD
      const { data: pendingPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("tutor_id", user.id)
        .eq("gdpr_consent", false)

      if (pendingPlayers && pendingPlayers.length > 0) {
        router.replace("/dashboard/rgpd-pendiente")
      }
    }

    checkGdpr()
  }, [pathname, router])

  return <></>
}
