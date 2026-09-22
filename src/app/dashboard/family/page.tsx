import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FamilyEmptyState } from "./FamilyEmptyState"

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: authData, error: authErr } = await supabase.auth.getUser()

  if (authErr || !authData.user) {
    redirect("/dashboard")
  }

  // 1. Fetch direct tutor players
  const { data: directPlayers } = await supabase
    .from("players")
    .select(`
      id, first_name, last_name, avatar_url, dorsal, posicion_principal, status,
      teams (id, name)
    `)
    .eq("tutor_id", authData.user.id)
    .neq("status", "inactive");

  if (directPlayers && directPlayers.length > 0) {
    redirect(`/dashboard/family/e/${directPlayers[0].id}/perfil`);
  }

  // 2. Fetch linked players from player_tutors (segundo progenitor / tutores vinculados)
  const { data: linkedTutors } = await supabase
    .from("player_tutors")
    .select(`
      player_id,
      players!inner (
        id, first_name, last_name, avatar_url, dorsal, posicion_principal, status,
        teams (id, name)
      )
    `)
    .eq("tutor_id", authData.user.id);

  const activeLinkedPlayers = (linkedTutors || [])
    .map((lt: any) => lt.players)
    .filter((p: any) => p && p.status !== "inactive");

  if (activeLinkedPlayers.length > 0) {
    redirect(`/dashboard/family/e/${activeLinkedPlayers[0].id}/perfil`);
  }

  // Si no tiene hijos, le mostramos la vista vacía
  return <FamilyEmptyState />;
}
