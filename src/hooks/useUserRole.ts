import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type UserRole = "admin" | "entrenador" | "jugador" | "familia"

export function useUserRole() {
  const [rol, setRol] = useState<UserRole | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // Si no hay sesión, ponemos un rol por defecto de 'entrenador' para la maquetación/demo
          setRol("entrenador")
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("rol, team_id, linked_player_id")
          .eq("id", user.id)
          .single()

        if (!error && profile) {
          setRol((profile.rol || "entrenador") as UserRole)
          setTeamId(profile.team_id)
          setLinkedPlayerId(profile.linked_player_id)
        } else {
          // Fallback por defecto
          setRol("entrenador")
        }
      } catch (err) {
        console.error("Error in useUserRole hook:", err)
        setRol("entrenador")
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  return { rol, teamId, linkedPlayerId, loading }
}
