import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEffectiveSelectedSeasonId } from "@/lib/auth-helpers"
import { GlobalMatchesView } from "@/components/features/matches/GlobalMatchesView"
export const dynamic = 'force-dynamic';

export default async function PartidosPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Obtener equipos a los que el usuario tiene acceso (o todos si es admin)
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  // Obtener contexto de autenticación y club
  const { data: profile } = await adminClient.from('profiles').select('club_id, role').eq('id', userData.user.id).single()
  const clubId = profile?.club_id

  // Obtener obligatoriamente la temporada activa del club (TEMPORADA 26/27)
  const { data: activeSeason } = await adminClient
    .from('seasons')
    .select('id, name')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle()

  // Para la vista principal de partidos en vivo y calendario, usar siempre la temporada activa
  const targetSeasonId = activeSeason?.id || ''

  let matchesQuery = adminClient
    .from("partidos")
    .select(`
      *,
      equipo:teams (id, name, category, color, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url)
    `)
    .order("fecha_hora", { ascending: true })

  let teamsQuery = adminClient
    .from("teams")
    .select("id, name, category, color, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url")
    .order("name", { ascending: true })

  if (clubId) {
    matchesQuery = matchesQuery.eq("club_id", clubId)
    teamsQuery = teamsQuery.eq("club_id", clubId)
  }

  if (targetSeasonId) {
    matchesQuery = matchesQuery.eq("season_id", targetSeasonId)
    teamsQuery = teamsQuery.eq("season_id", targetSeasonId)
  } else {
    // Si por alguna razón no se encontró temporada activa, excluir estrictamente la temporada pasada 25/26
    matchesQuery = matchesQuery.neq("season_id", "584f508a-fc1a-4339-b5b2-4296ffde2f4c")
  }

  const { data: matches } = await matchesQuery
  const { data: teams } = await teamsQuery

  let players: any[] = [];
  if (targetSeasonId) {
    const { data: historyData, error: playersError } = await supabase
      .from("player_season_history")
      .select(`
        team_id,
        players!inner (id, first_name, last_name, posicion, status)
      `)
      .eq("season_id", targetSeasonId)
      .neq("status", "inactive");
      
    if (playersError) {
      console.error("Error fetching players in matches/page.tsx:", playersError);
    } else if (historyData && historyData.length > 0) {
      players = historyData.map((h: any) => ({
        ...h.players,
        team_id: h.team_id
      }));
    }
  }

  if (players.length === 0) {
    const { data: directPlayers } = await supabase
      .from("players")
      .select("id, first_name, last_name, posicion, status, team_id")
      .neq("status", "inactive");
    if (directPlayers) players = directPlayers;
  }

  const matchIds = (matches || []).map(m => m.id);
  let convocatorias: any[] = [];
  
  if (matchIds.length > 0) {
    let from = 0;
    const step = 1000;
    while (true) {
      const { data: chunk } = await supabase
        .from("convocatorias")
        .select("*")
        .in("partido_id", matchIds)
        .range(from, from + step - 1);
        
      if (!chunk || chunk.length === 0) break;
      convocatorias.push(...chunk);
      if (chunk.length < step) break;
      from += step;
    }
  }

  const { data: teamCoaches } = await supabase
    .from("team_coaches")
    .select("team_id")
    .eq("profile_id", userData.user.id);

  const userTeamIds = (teamCoaches || []).map((tc: any) => tc.team_id);

  const role = (profile?.role || '').toLowerCase().trim();
  const isReadOnly = role === 'socio' || role === 'utillero' || role === 'directivo' || role === 'secretario' || role === 'tesorero' || role === 'jugador' || role === 'tutor' || role === 'familia' || role === 'family' || role === 'delegado';

  console.log("DASHBOARD/MATCHES DEBUG -> user_id:", userData.user.id, "profile.role:", profile?.role, "isReadOnly:", isReadOnly, "userTeamIds:", userTeamIds);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-center py-12 text-slate-500">Cargando...</div>}>
          <GlobalMatchesView 
            initialMatches={matches || []}
            teams={teams || []}
            players={players || []}
            convocatorias={convocatorias || []}
            isReadOnly={isReadOnly}
            userRole={role}
            userTeamIds={userTeamIds}
          />
        </Suspense>
      </div>
    </div>
  )
}


