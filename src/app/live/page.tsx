import { createAdminClient, createClient } from "@/lib/supabase/server"
import { MatchdayView } from "@/components/features/matches/MatchdayView"
import Image from "next/image"

import { getLiveAds } from "@/app/actions/ad-actions"

import { LiveBackButton, ShareLiveButton } from "@/components/features/matches/LiveBackButton"

export const revalidate = 0 // Opt out of caching for live route

export default async function PublicLivePage() {
  const supabase = await createAdminClient()
  
  // Fetch teams for realtime lookups
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, category')

  // Fetch active season to show matches for the current active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  let matchesQuery = supabase
    .from('partidos')
    .select(`
      *,
      equipo:teams (id, name, category),
      match_events (
        tipo_evento,
        minuto,
        player_id,
        player:players (first_name, last_name, nickname)
      )
    `)

  if (activeSeason?.id) {
    matchesQuery = matchesQuery.eq('season_id', activeSeason.id)
  }

  const { data: matchesData } = await matchesQuery.order('fecha_hora', { ascending: true })

  const matchesWithTeams = matchesData || []
  const liveAds = await getLiveAds();

  // Fetch club logo (ensure we get one with a logo)
  const { data: clubData } = await supabase.from('clubs').select('logo_url').not('logo_url', 'is', null).limit(1).single()

  // Check if current user is admin to show inline ad manager
  const userSupabase = await createClient()
  const { data: authData } = await userSupabase.auth.getUser()
  const isLoggedIn = !!authData?.user
  let isAdmin = false
  if (isLoggedIn) {
    const { data: profile } = await userSupabase.from("profiles").select("role").eq("id", authData.user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm relative">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20"></div>
        <div className="max-w-5xl mx-auto px-4 h-20 md:h-24 flex items-center justify-between relative">
          
          {/* Left Actions: Back button if logged in */}
          <div className="flex items-center gap-2 relative z-10">
            {isLoggedIn && <LiveBackButton />}
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:block">Resultados en Directo</p>
          </div>

          {/* Centered Logo & Name */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 relative z-10">
            <span className="font-black text-slate-900 text-xs sm:text-base md:text-xl tracking-wider">SPORTING</span>
            
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center shrink-0">
              {clubData?.logo_url ? (
                <img src={clubData.logo_url} alt="Escudo" className="w-full h-full object-contain drop-shadow-md scale-110" />
              ) : (
                <div className="w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                  <span className="text-white font-black text-xl md:text-3xl">S</span>
                </div>
              )}
            </div>
            
            <span className="font-black text-slate-900 text-xs sm:text-base md:text-xl tracking-wider">SALADAR</span>
          </div>

          {/* Right Actions: Share & Live Badge */}
          <div className="flex items-center gap-2 relative z-10">
            <ShareLiveButton />
            <div className="hidden sm:flex items-center gap-2 bg-red-50/80 border border-red-100 px-2 py-1 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <MatchdayView 
          initialMatches={matchesWithTeams} 
          teams={teamsData || []} 
          ads={liveAds}
          isAdmin={isAdmin}
          clubLogoUrl={clubData?.logo_url}
        />
      </main>
      
      <footer className="py-8 text-center text-xs font-medium text-slate-400">
        <p>Sporting Saladar © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
