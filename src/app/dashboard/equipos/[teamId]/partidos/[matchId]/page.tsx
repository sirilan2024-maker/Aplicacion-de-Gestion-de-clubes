import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PremiumMatchManager } from "@/components/features/matches/premium-match-manager"
import { FamilyMatchView } from "@/components/features/matches/family-match-view"
export const dynamic = 'force-dynamic';

const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

export default async function MatchPage({ params }: { params: Promise<{ teamId: string, matchId: string }> }) {
  const { teamId, matchId } = await params
  const supabase = await createClient()

  const { data: matchData } = await supabase
    .from("partidos")
    .select(`
      *,
      equipo:teams(id, name, color, season_id),
      match_events(*, player:players(id, first_name, last_name, dorsal))
    `)
    .eq("id", matchId)
    .single()

  if (!matchData) redirect(`/dashboard/equipos/${teamId}/partidos`)

  const { data: convocatoriasData } = await supabase
    .from("convocatorias")
    .select("*")
    .eq("partido_id", matchId)

  const convPlayerIds = (convocatoriasData || []).map(c => c.player_id).filter(Boolean);

  // Strictly enforce active season: players must belong to active season teams and never be inactive
  let playersQuery = supabase
    .from("players")
    .select("id, first_name, last_name, dorsal, status, medical_notes, posicion, team:teams!inner(id, season_id)")
    .neq("status", "inactive")
    .neq("team.season_id", CLOSED_SEASON_ID)
    .order("first_name");

  if (convPlayerIds.length > 0) {
    playersQuery = playersQuery.or(`team_id.eq.${teamId},id.in.(${convPlayerIds.join(',')})`);
  } else {
    playersQuery = playersQuery.eq("team_id", teamId);
  }

  const { data: playersData } = await playersQuery;

  const { data: eventsData } = await supabase
    .from("match_events")
    .select("*, player:players(id, first_name, last_name, dorsal)")
    .eq("partido_id", matchId)
    .order("minuto", { ascending: true })
    .order("created_at", { ascending: true })

  // All matches for this team strictly in the active season (never past 25/26)
  const { data: allMatchesData } = await supabase
    .from("partidos")
    .select("id, competicion_nombre, fecha_hora, rival_nombre, resultado_propio, resultado_rival, estado")
    .eq("equipo_id", matchData?.equipo_id || teamId)
    .neq("season_id", CLOSED_SEASON_ID)
    .order("fecha_hora", { ascending: true })

  const { data: userData } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData?.user?.id).single()
  const role = (profile?.role || '').toLowerCase().trim();
  const isReadOnly = role === 'socio' || role === 'utillero' || role === 'directivo' || role === 'secretario' || role === 'tesorero' || role === 'jugador' || role === 'tutor' || role === 'familia' || role === 'family' || role === 'delegado';

  if (isReadOnly) {
    return (
      <div className="w-full flex">
        <FamilyMatchView
          match={matchData}
          playerId={""}
          matchEvents={eventsData || []}
          convocatorias={convocatoriasData || []}
        />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex">
        <PremiumMatchManager
          match={matchData as any}
          players={playersData || []}
          convocatorias={convocatoriasData || []}
          matchEvents={eventsData || []}
          allMatches={allMatchesData || []}
        />
      </div>
    </div>
  )
}
