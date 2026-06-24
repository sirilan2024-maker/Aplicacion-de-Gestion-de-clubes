import { createClient } from "@/lib/supabase/server"
import { GlobalMatchesView } from "@/components/features/matches/GlobalMatchesView"

export default async function PartidosPage() {
  const supabase = await createClient()

  // Obtener equipos a los que el usuario tiene acceso (o todos si es admin)
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', userData.user.id).single()
  const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

  let matchesQuery = supabase
    .from("partidos")
    .select(`
      *,
      equipo:teams (id, name, category)
    `)
    .order("fecha_hora", { ascending: false })

  let teamsQuery = supabase
    .from("teams")
    .select("id, name, category")
    .order("name", { ascending: true })

  let equiposQuery = supabase
    .from('teams')
    .select("id, name")

  if (activeSeason?.id) {
    matchesQuery = matchesQuery.eq("season_id", activeSeason.id)
    teamsQuery = teamsQuery.eq("season_id", activeSeason.id)
    equiposQuery = equiposQuery.eq("season_id", activeSeason.id)
  }

  const { data: matches } = await matchesQuery
  const { data: teams } = await teamsQuery
  const { data: equipos } = await equiposQuery

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, first_name, last_name, team_id, posicion")
    .neq("status", "inactive")

  if (playersError) {
    console.error("Error fetching players in matches/page.tsx:", playersError)
  }

  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select("*")

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlobalMatchesView 
          initialMatches={matches || []}
          teams={teams || []}
          equipos={equipos || []}
          players={players || []}
          convocatorias={convocatorias || []}
        />
      </div>
    </div>
  )
}
