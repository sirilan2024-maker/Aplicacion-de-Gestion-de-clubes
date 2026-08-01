import { createAdminClient, createClient } from "@/lib/supabase/server"
import { MatchdayView } from "@/components/features/matches/MatchdayView"
import Image from "next/image"

import { getLiveAds } from "@/app/actions/ad-actions"

export const revalidate = 0 // Opt out of caching for live route

export default async function PublicLivePage() {
  const supabase = await createAdminClient()
  
  // Fetch teams for realtime lookups
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, logo_url, category')
  const { data: matchesData } = await supabase
    .from('partidos')
    .select(`
      *,
      equipo:teams (id, name, category, logo_url)
    `)
    .order('fecha_hora', { ascending: true })

  const matchesWithTeams = matchesData || []
  const liveAds = await getLiveAds();

  // Fetch club logo (ensure we get one with a logo)
  const { data: clubData } = await supabase.from('clubs').select('logo_url').not('logo_url', 'is', null).limit(1).single()

  // Check if current user is admin to show inline ad manager
  const userSupabase = await createClient()
  const { data: authData } = await userSupabase.auth.getUser()
  let isAdmin = false
  if (authData?.user) {
    const { data: profile } = await userSupabase.from("profiles").select("role").eq("id", authData.user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm relative">
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20"></div>
        <div className="max-w-5xl mx-auto px-4 h-20 md:h-24 flex items-center justify-between relative">
          
          {/* Centered Logo & Name */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
              <span className="font-black text-slate-900 text-sm sm:text-lg md:text-xl tracking-wider md:tracking-widest">SPORTING</span>
              
              <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center relative z-20 shrink-0">
                {clubData?.logo_url ? (
                  <img src={clubData.logo_url} alt="Escudo" className="w-full h-full object-contain drop-shadow-md scale-110" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                    <span className="text-white font-black text-2xl md:text-3xl">S</span>
                  </div>
                )}
              </div>
              
              <span className="font-black text-slate-900 text-sm sm:text-lg md:text-xl tracking-wider md:tracking-widest">SALADAR</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10 hidden md:block">Resultados en Directo</p>
          </div>

          <div className="flex items-center gap-2 relative z-10 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-[10px] md:text-xs font-bold text-red-600 uppercase tracking-wider hidden sm:inline-block">LIVE</span>
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
        />
      </main>
      
      <footer className="py-8 text-center text-xs font-medium text-slate-400">
        <p>Sporting Saladar © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
