import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function GlobalMatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get the match's teamId
  const { data: match } = await supabase.from("partidos").select("equipo_id").eq("id", id).single()
  
  if (match?.equipo_id) {
    redirect(`/dashboard/equipos/${match.equipo_id}/partidos/${id}`)
  }
  
  // Fallback if not found
  redirect("/dashboard/matches")
}
