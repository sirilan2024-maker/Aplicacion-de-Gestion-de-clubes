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
  const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';

  const { data: teamPlayers } = await supabase
    .from("players")
    .select("id, first_name, last_name, dorsal, avatar_url, status, medical_notes, posicion, team_id, team:teams!inner(id, season_id)")
    .eq("team_id", teamId)
    .neq("team.season_id", CLOSED_SEASON_ID)
    .eq("team.season_id", ACTIVE_SEASON_ID)
    .neq("status", "inactive")
    .order("first_name");

  let extraPlayers: any[] = [];
  const foreignConvIds = convPlayerIds.filter(id => !(teamPlayers || []).some((tp: any) => tp.id === id));
  if (foreignConvIds.length > 0) {
    const { data: extra } = await supabase
      .from("players")
      .select("id, first_name, last_name, dorsal, avatar_url, status, medical_notes, posicion, team_id, team:teams!inner(id, season_id)")
      .in("id", foreignConvIds)
      .neq("team.season_id", CLOSED_SEASON_ID)
      .eq("team.season_id", ACTIVE_SEASON_ID)
      .neq("status", "inactive");
    extraPlayers = extra || [];
  }

  const seenPlayerIds = new Set<string>();
  const playersData: any[] = [];
  for (const p of [...(teamPlayers || []), ...extraPlayers]) {
    const st = (p.status || '').toLowerCase();
    if (!seenPlayerIds.has(p.id) && !st.includes('inactiv') && !st.includes('baja')) {
      seenPlayerIds.add(p.id);
      playersData.push(p);
    }
  }

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
