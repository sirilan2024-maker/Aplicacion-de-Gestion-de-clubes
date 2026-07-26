import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FamilyEmptyState } from "./FamilyEmptyState"

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: authData, error: authErr } = await supabase.auth.getUser()

  if (authErr || !authData.user) {
    redirect("/dashboard")
  }

  // Fetch detailed player info directly from players table where tutor_id matches
  const { data: playersInfo } = await supabase
    .from("players")
    .select(`
      id, first_name, last_name, avatar_url, dorsal, posicion_principal, status,
      teams (id, name)
    `)
    .eq("tutor_id", authData.user.id)
    .neq("status", "inactive")

  if (playersInfo && playersInfo.length > 0) {
    redirect(`/dashboard/family/e/${playersInfo[0].id}/perfil`)
  }

  // Si no tiene hijos, le mostramos la vista vacía
  return <FamilyEmptyState />
}
