"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Activity, Calendar, FileText, AlertTriangle, Target, Trophy, Clock, Flame, CreditCard } from "lucide-react"
import Subscriptions from "@/components/features/treasury/Subscriptions"
import { AddPlayerRequestModal } from "@/components/features/family/AddPlayerRequestModal"

export default function PlayerDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = typeof params.playerId === 'string' ? params.playerId : ''
  
  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<any>(null)
  const [siblings, setSiblings] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [stats, setStats] = useState({
    asistencia: 0,
    faltas: 0,
    yellowCards: 0,
    redCards: 0,
    goals: 0,
    minutes: 0,
    matchesPlayed: 0
  })

  useEffect(() => {
    if (!playerId) return
    
    const fetchDashboardData = async () => {
      const supabase = createClient()
      
      try {
        // Fetch player info
        const { data: playerData } = await supabase
          .from("players")
          .select('*, teams(name, category, color)')
          .eq("id", playerId)
          .single()
          
        if (playerData) {
          setPlayer(playerData)
        }

        // Fetch siblings (for the child switcher)
        const { data: userAuth } = await supabase.auth.getUser()
        if (userAuth.user) {
          const { data: childrenLinks } = await supabase
            .from("player_tutors")
            .select('player_id, players(first_name, last_name)')
            .eq("tutor_id", userAuth.user.id)
            
          if (childrenLinks) {
            setSiblings(childrenLinks.map(c => ({
              id: c.player_id,
              first_name: (c.players as any)?.first_name,
              last_name: (c.players as any)?.last_name
            })))
          }

          // Fetch Pending Requests
          const { data: requestsData } = await supabase
            .from("player_requests")
            .select('id, first_name, last_name, status, teams(name)')
            .eq("tutor_id", userAuth.user.id)
            .eq("status", "pending")
            
          if (requestsData) {
            setPendingRequests(requestsData)
          }
        }

        // Fetch Attendance
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select('status')
          .eq("player_id", playerId)
          
        let asisteCount = 0;
        let faltasCount = 0;
        
        if (attendanceData) {
          asisteCount = attendanceData.filter(a => ['presente', 'present', 'justificado', 'excused', 'lesionado'].includes(a.status?.toLowerCase())).length;
          faltasCount = attendanceData.filter(a => ['ausente', 'absent'].includes(a.status?.toLowerCase())).length;
        }

        // Fetch Discipline (Cards)
        const { data: tarjetas } = await supabase
          .from("player_cards")
          .select('card_type')
          .eq("player_id", playerId)
          
        let yellowCards = 0;
        let redCards = 0;
        if (tarjetas) {
          yellowCards = tarjetas.filter(t => t.card_type === 'Amarilla').length;
          redCards = tarjetas.filter(t => t.card_type === 'Roja').length;
        }

        // Fetch Match Stats (Goals, Minutes)
        const { data: matchStats } = await supabase
          .from("match_player_stats")
          .select('goals, minutes_played, started')
          .eq("player_id", playerId)
          
        let goals = 0;
        let minutes = 0;
        let matchesPlayed = matchStats?.length || 0;
        
        if (matchStats) {
          goals = matchStats.reduce((sum, stat) => sum + (stat.goals || 0), 0);
          minutes = matchStats.reduce((sum, stat) => sum + (stat.minutes_played || 0), 0);
        }

        setStats({
          asistencia: asisteCount || 0,
          faltas: faltasCount || 0,
          yellowCards,
          redCards,
          goals,
          minutes,
          matchesPlayed
        })
      } catch (err) {
        console.error("Error fetching dashboard data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [playerId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="p-8 text-center text-gray-500">
        No se ha encontrado la información del jugador.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sibling Switcher */}
      {siblings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {siblings.map((sibling) => (
            <button
              key={sibling.id}
              onClick={() => router.push(`/dashboard/family/e/${sibling.id}/perfil`)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors whitespace-nowrap ${sibling.id === playerId ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:shadow-sm'}`}
            >
              Panel de {sibling.first_name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de {player.first_name}
          </h1>
          <p className="text-gray-500 mt-1">Resumen completo de la temporada</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Añadir Jugador
          </button>
          
          <button 
            onClick={() => router.push(`/dashboard/family/e/${playerId}/ficha`)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <FileText size={20} />
            VER FICHA TÉCNICA
          </button>
        </div>
      </div>

      {/* Alertas de Solicitudes Pendientes */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-0.5">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Solicitudes Pendientes</h3>
              <p className="text-sm text-amber-700 mt-1">
                Tienes {pendingRequests.length} jugador{pendingRequests.length > 1 ? 'es' : ''} esperando validación del club: 
                {pendingRequests.map(req => ` ${req.first_name} ${req.last_name}`).join(', ')}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WIDGET 1: ESTADÍSTICAS GENERALES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Activity className="text-blue-200" />
              Rendimiento y Estadísticas
            </h2>
          </div>
          <div className="p-6 flex-1 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
              <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Partidos</p>
              <p className="text-3xl font-black text-gray-900">{stats.matchesPlayed}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
              <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-1">Minutos</p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-3xl font-black text-blue-700">{stats.minutes}</p>
                <p className="text-sm font-bold text-blue-500 mb-1">min</p>
              </div>
            </div>
            <div className="col-span-2 mt-2">
              <button onClick={() => router.push(`/dashboard/family/e/${playerId}/ficha?tab=stats`)} className="w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Ver Informe Detallado
              </button>
            </div>
          </div>
        </div>

        {/* WIDGET 2: GOLES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Trophy className="text-emerald-100" />
              Goles
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-4">
              <span className="text-5xl font-black text-emerald-600">{stats.goals}</span>
            </div>
            <p className="text-gray-500 font-medium">Goles esta temporada</p>
            {stats.goals > 0 && (
              <div className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <Flame size={16} /> ¡En racha!
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 3: ENTRENAMIENTOS (ASISTENCIA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Target className="text-purple-200" />
              Entrenamientos
            </h2>
          </div>
          <div className="p-6 flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-4xl font-black text-gray-900">{stats.asistencia}</p>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Completados</p>
              </div>
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center transform rotate-12">
                <Calendar className="text-purple-600 w-8 h-8" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex justify-between items-center">
              <span className="text-red-700 font-semibold text-sm">Faltas de asistencia</span>
              <span className="text-red-700 font-black text-lg">{stats.faltas}</span>
            </div>
            <button onClick={() => router.push(`/dashboard/family/e/${playerId}/ficha?tab=asistencia`)} className="w-full mt-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Ver Gráficas de Asistencia
            </button>
          </div>
        </div>

        {/* WIDGET 4: DISCIPLINA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="text-orange-100" />
              Disciplina
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="flex justify-around items-end h-24 mb-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-16 bg-yellow-400 rounded-md shadow-md border border-yellow-500 flex items-center justify-center transform -rotate-6">
                  <span className="text-2xl font-black text-yellow-900">{stats.yellowCards}</span>
                </div>
                <p className="text-sm font-bold text-gray-600 mt-3">Amarillas</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-16 bg-red-600 rounded-md shadow-md border border-red-700 flex items-center justify-center transform rotate-6">
                  <span className="text-2xl font-black text-white">{stats.redCards}</span>
                </div>
                <p className="text-sm font-bold text-gray-600 mt-3">Rojas</p>
              </div>
            </div>
            <button onClick={() => router.push(`/dashboard/family/e/${playerId}/ficha?tab=disciplina`)} className="w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              Ver Historial Sanciones
            </button>
          </div>
        </div>

      </div>

      {/* WIDGET: CUOTAS (SUBSCRIPTIONS) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-emerald-600" />
            Mis Cuotas
          </h2>
        </div>
        <div className="mt-8">
          <Subscriptions />
        </div>

        <AddPlayerRequestModal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            // Refresh window to show pending requests
            window.location.reload();
          }}
        />
      </div>
    </div>
  )
}
