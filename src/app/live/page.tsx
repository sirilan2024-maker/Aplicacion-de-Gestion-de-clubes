import { createAdminClient, createClient } from "@/lib/supabase/server"
import { MatchdayView } from "@/components/features/matches/MatchdayView"
import Image from "next/image"

import { getLiveAd } from "@/app/actions/ad-actions"

export const revalidate = 0 // Opt out of caching for live route

export default async function PublicLivePage() {
  const supabase = await createAdminClient()
  
  // Fetch teams
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, logo_url, category')

  // Fetch all matches (we let MatchdayView filter the +/- 72h window)
  const { data: matchesData } = await supabase
    .from('partidos')
    .select('*')
    .order('fecha_hora', { ascending: true })

  const matchesWithTeams = matchesData?.map(match => ({
    ...match,
    equipo: teamsData?.find(t => t.id === match.equipo_id)
  })) || []
  const liveAd = await getLiveAd();

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <div>
              <h1 className="font-black text-slate-900 leading-tight">Sporting Saladar</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En Directo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider hidden sm:inline-block">LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <MatchdayView 
          initialMatches={matchesWithTeams} 
          teams={teamsData || []} 
          ad={liveAd}
          isAdmin={isAdmin}
        />
      </main>
      
      <footer className="py-8 text-center text-xs font-medium text-slate-400">
        <p>Sporting Saladar © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
