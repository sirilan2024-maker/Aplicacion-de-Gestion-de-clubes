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
          setRol(null)
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, rol, team_id, linked_player_id")
          .eq("id", user.id)
          .single()

        if (!error && profile) {
          // Priorizar siempre el campo oficial 'role' sobre el campo legado 'rol'
          let roleStr = profile.role || profile.rol || "familia";
          if (roleStr === "tutor") roleStr = "familia";
          
          setRol(roleStr as UserRole)
          setTeamId(profile.team_id)
          setLinkedPlayerId(profile.linked_player_id)
        } else {
          setRol(null)
        }
      } catch (err) {
        console.error("Error in useUserRole hook:", err)
        setRol(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  return { rol, teamId, linkedPlayerId, loading }
}
