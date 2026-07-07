import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FamilyMatchView } from "@/components/features/matches/family-match-view"

export default async function FamilyMatchPage({ params }: { params: Promise<{ playerId: string, matchId: string }> }) {
  const { playerId, matchId } = await params
  const supabase = await createClient()

  // First verify if the player exists and belongs to the user's family
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('team_id')
    .eq('id', playerId)
    .single()

  if (!player) redirect('/dashboard/family')

  const { data: matchData } = await supabase
    .from("partidos")
    .select(`
      *,
      equipo:teams(id, name, color)
    `)
    .eq("id", matchId)
    .single()

  if (!matchData) redirect(`/dashboard/family/e/${playerId}/partidos`)

  const { data: convocatoriasData } = await supabase
    .from("convocatorias")
    .select("*")
    .eq("partido_id", matchId)

  const { data: eventsData } = await supabase
    .from("match_events")
    .select("*, player:players(id, first_name, last_name, dorsal)")
    .eq("partido_id", matchId)
    .order("minuto", { ascending: true })

  return (
    <div className="w-full flex">
      <FamilyMatchView
        match={matchData}
        playerId={playerId}
        matchEvents={eventsData || []}
        convocatorias={convocatoriasData || []}
      />
    </div>
  )
}
