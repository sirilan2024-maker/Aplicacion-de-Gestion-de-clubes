import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PremiumMatchManager } from "@/components/features/matches/premium-match-manager"

export default async function MatchPage({ params }: { params: Promise<{ teamId: string, matchId: string }> }) {
  const { teamId, matchId } = await params
  const supabase = await createClient()

  const { data: matchData } = await supabase
    .from("partidos")
    .select(`
      *,
      equipo:teams(id, name, color)
    `)
    .eq("id", matchId)
    .single()

  if (!matchData) redirect(`/dashboard/equipos/${teamId}/partidos`)

  // Find matching team in the old 'equipos' table using the name from 'teams'
  const { data: newTeamData } = await supabase.from("teams").select("name").eq("id", teamId).single()
  let oldTeamId = teamId;
  if (newTeamData) {
    const { data: oldTeamData } = await supabase.from('teams').select("id").ilike("name", newTeamData.name).single()
    if (oldTeamData) oldTeamId = oldTeamData.id;
  }

  const { data: playersData } = await supabase
    .from("players")
    .select("id, first_name, last_name, dorsal, status, medical_notes, posicion")
    .or(`team_id.eq.${teamId},team_id.eq.${oldTeamId}`)
    .neq("status", "inactive")
    .order("first_name")

  const { data: convocatoriasData } = await supabase
    .from("convocatorias")
    .select("*")
    .eq("partido_id", matchId)

  const { data: eventsData } = await supabase
    .from("match_events")
    .select("*, player:players(id, first_name, last_name, dorsal)")
    .eq("partido_id", matchId)
    .order("minuto", { ascending: true })

  const { data: equipoCoach } = await supabase
    .from('teams')
    .select("name")
    .eq("id", teamId)
    .single()
    
  let globalTeamIds = [teamId]
  if (equipoCoach) {
    const { data: globalTeams } = await supabase
      .from("teams")
      .select("id")
      .ilike("name", equipoCoach.name)
    if (globalTeams) {
      globalTeamIds = [...new Set([...globalTeamIds, ...globalTeams.map(t => t.id)])]
    }
  }

  const { data: allMatchesData } = await supabase
    .from("partidos")
    .select("id, competicion_nombre, fecha_hora, rival_nombre, resultado_propio, resultado_rival, estado")
    .in("equipo_id", globalTeamIds)
    .order("fecha_hora", { ascending: true })

  return (
    <div className="w-full flex">
      <PremiumMatchManager
        match={matchData as any}
        players={playersData || []}
        convocatorias={convocatoriasData || []}
        matchEvents={eventsData || []}
        allMatches={allMatchesData || []}
      />
    </div>
  )
}
