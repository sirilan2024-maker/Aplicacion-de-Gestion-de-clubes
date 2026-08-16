"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Activity, Calendar, FileText, AlertTriangle, Target, Trophy, Clock, Flame, CreditCard, ShieldAlert, CheckCircle, MapPin, CheckCircle2, XCircle, History, Plus, Goal, Zap } from "lucide-react"
import { differenceInDays, parseISO } from "date-fns"
import Subscriptions from "@/components/features/treasury/Subscriptions"
import { AddPlayerRequestModal } from "@/components/features/family/AddPlayerRequestModal"
import { PlayerPerformanceDrawer } from "@/components/features/performance/PlayerPerformanceDrawer"
import { PlayerStatsModal, type PlayerStatsData } from "@/components/features/estadisticas/PlayerStatsModal"
import { DisciplineModal } from "@/components/features/matches/DisciplineModal"
import { AttendanceModal } from "@/components/features/events/AttendanceModal"
import { ApparelModal } from "@/components/features/club/ApparelModal"
import { GoalsModal } from "@/components/features/matches/GoalsModal"
import { getApparelForPlayerAction } from "@/app/actions/apparel-actions"
import { Shirt } from "lucide-react"

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
    justificadas: 0,
    retrasos: 0,
    total: 0,
    ratio: 0,
    yellowCards: 0,
    redCards: 0,
    goals: 0,
    minutes: 0,
    matchesPlayed: 0
  })
  
  const [nextMatch, setNextMatch] = useState<any>(null)
  const [nextMatchCallup, setNextMatchCallup] = useState<any>(null)
  const [nextEvent, setNextEvent] = useState<any>(null)
  const [nextEventAttendance, setNextEventAttendance] = useState<any>(null)
  const [matchHistory, setMatchHistory] = useState<any[]>([])
  const [acwrData, setAcwrData] = useState<{ acute: number, chronic: number, acwr: number } | null>(null);
  
  const [showPerformanceDrawer, setShowPerformanceDrawer] = useState(false);
  const [perfStats, setPerfStats] = useState<{ average: number | null, trends: any[] }>({ average: null, trends: [] });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showApparelModal, setShowApparelModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [disciplineCardEvents, setDisciplineCardEvents] = useState<any[]>([]);
  const [apparelStats, setApparelStats] = useState({ total: 12, delivered: 0 });
  const [apparelData, setApparelData] = useState<{ [key: string]: any }>({});

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
            .from("players")
            .select('id, first_name, last_name')
            .eq("tutor_id", userAuth.user.id)
            
          if (childrenLinks) {
            setSiblings(childrenLinks.map(c => ({
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name
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
          .select('status, notes, team_events(title, date, event_type)')
          .eq("player_id", playerId)
          .order('created_at', { ascending: false });
          
        let asisteCount = 0;
        let faltasCount = 0;
        let justificadasCount = 0;
        let retrasosCount = 0;
        
        if (attendanceData) {
          setAttendanceRecords(attendanceData);
          asisteCount = attendanceData.filter(a => ['presente', 'present'].includes(a.status?.toLowerCase())).length;
          faltasCount = attendanceData.filter(a => ['ausente', 'absent', 'falta'].includes(a.status?.toLowerCase())).length;
          justificadasCount = attendanceData.filter(a => ['justificada', 'excused', 'lesionado'].includes(a.status?.toLowerCase())).length;
          retrasosCount = attendanceData.filter(a => ['retraso', 'late'].includes(a.status?.toLowerCase())).length;
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

        let ratio = 0;
        const totalAttendance = asisteCount + retrasosCount + faltasCount;
        if (totalAttendance > 0) {
          ratio = Math.round(((asisteCount + retrasosCount) / (asisteCount + retrasosCount + faltasCount + justificadasCount)) * 100);
        }

        setStats({
          asistencia: asisteCount,
          faltas: faltasCount,
          justificadas: justificadasCount,
          retrasos: retrasosCount,
          total: asisteCount + faltasCount + justificadasCount + retrasosCount,
          ratio,
          yellowCards,
          redCards,
          goals,
          minutes,
          matchesPlayed
        })

        // Fetch Next Match & Match History if player belongs to a team
        if (playerData.team_id) {
          // Next Match
          const { data: nextMData } = await supabase
            .from("partidos")
            .select('*')
            .eq("equipo_id", playerData.team_id)
            .gt("fecha_hora", new Date().toISOString())
            .order("fecha_hora", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (nextMData) {
            setNextMatch(nextMData)
            // Check if called up
            const { data: callupData } = await supabase
              .from("convocatorias")
              .select('*')
              .eq("partido_id", nextMData.id)
              .eq("player_id", playerId)
              .maybeSingle()
            setNextMatchCallup(callupData)
          }

          // Fetch Next Team Event (training, meeting, etc.)
          const todayStr = new Date().toISOString().split('T')[0]
          const { data: nextEvData } = await supabase
            .from("team_events")
            .select('id, title, date, start_time, event_type, location')
            .eq("team_id", playerData.team_id)
            .gte("date", todayStr)
            .order("date", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (nextEvData) {
            setNextEvent(nextEvData)
            // Check if player already has attendance for this event
            const { data: attData } = await supabase
              .from("attendance")
              .select('status')
              .eq("session_id", nextEvData.id)
              .eq("player_id", playerId)
              .maybeSingle()
            setNextEventAttendance(attData)
          }


          const { data: historyData, error: historyError } = await supabase
            .from("convocatorias")
            .select('titular, minutos_jugados, goles, asistencias, tarjetas_amarillas, tarjetas_rojas, asistencia_confirmada_familia, partidos(id, rival_nombre, fecha_hora, lugar, resultado_propio, resultado_rival, estado)')
            .eq("player_id", playerId)
          
          if (historyError) {
             console.error("Error fetching match history:", historyError)
          } else if (historyData) {
            const allCardEvents = historyData
              .filter((h: any) => (h.tarjetas_amarillas || 0) > 0 || (h.tarjetas_rojas || 0) > 0)
              .map((h: any) => ({
                match: h.partidos,
                yellow: h.tarjetas_amarillas || 0,
                red: h.tarjetas_rojas || 0
              }));
            setDisciplineCardEvents(allCardEvents);

            const finalizedHistory = historyData
              .filter(h => h.partidos && (h.partidos as any).estado === 'Finalizado')
              .sort((a, b) => new Date((b.partidos as any).fecha_hora).getTime() - new Date((a.partidos as any).fecha_hora).getTime())
              .slice(0, 10)
            setMatchHistory(finalizedHistory)
          }

          // Fetch Apparel Data
          const apparelRes = await getApparelForPlayerAction(playerId);
          if (apparelRes.success && apparelRes.data) {
            setApparelData(apparelRes.data);
            const items = Object.values(apparelRes.data);
            const deliveredCount = items.filter((i: any) => i.delivered).length;
            setApparelStats({ total: 12, delivered: deliveredCount });
          }
        } // Closes if(playerData.team_id)

        if (playerData.team_id && playerData.club_id) {
          // ACWR Calculation
          try {
            const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', playerData.club_id);
            const rpeMetricId = metrics?.find(m => m.name.toLowerCase().includes('rpe'))?.id;
            const minMetricId = metrics?.find(m => m.name.toLowerCase().includes('minutos'))?.id;

            if (rpeMetricId && minMetricId) {
              const { data: evData } = await supabase.from('team_events')
                .select('id, date')
                .eq('team_id', playerData.team_id)
                .eq('event_type', 'Entrenamiento')
                .gte('date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString());
                
              if (evData && evData.length > 0) {
                const eventIds = evData.map(e => e.id);
                const { data: ptData } = await supabase.from('player_training_metrics')
                  .select('event_id, metric_id, value_number')
                  .eq('player_id', playerId)
                  .in('event_id', eventIds)
                  .in('metric_id', [rpeMetricId, minMetricId]);

                if (ptData) {
                  const dailyLoads: Record<string, number> = {};
                  evData.forEach(ev => {
                    const rpe = ptData.find(m => m.event_id === ev.id && m.metric_id === rpeMetricId)?.value_number;
                    const min = ptData.find(m => m.event_id === ev.id && m.metric_id === minMetricId)?.value_number;
                    if (rpe !== undefined && min !== undefined) {
                      dailyLoads[ev.date] = (dailyLoads[ev.date] || 0) + (rpe * min);
                    }
                  });

                  let acuteSum = 0; let acuteDays = 0;
                  let chronicSum = 0; let chronicDays = 0;
                  const today = new Date();

                  Object.entries(dailyLoads).forEach(([dateStr, load]) => {
                    const diff = Math.abs(differenceInDays(today, parseISO(dateStr)));
                    if (diff <= 7) { acuteSum += load; acuteDays++; }
                    if (diff <= 28) { chronicSum += load; chronicDays++; }
                  });

                  const acuteLoad = acuteDays > 0 ? acuteSum / 7 : 0;
                  const chronicLoad = chronicDays > 0 ? chronicSum / 28 : 0;
                  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

                  if (chronicLoad > 0 || acuteLoad > 0) {
                    setAcwrData({ acute: acuteLoad, chronic: chronicLoad, acwr });
                  }
                }
              }
            }
          } catch(e) {
            console.error("Error fetching ACWR:", e);
          }

          // Fetch Performance Trends (Valoracion 1-10)
          try {
            const { data: allEvData } = await supabase.from('team_events')
              .select('id, date, event_type')
              .eq('team_id', playerData.team_id)
              .order('date', { ascending: true });
            
            if (allEvData && allEvData.length > 0) {
              const allEventIds = allEvData.map(e => e.id);
              const { data: allPtData } = await supabase.from('player_training_metrics')
                .select('event_id, metric_id, value_number')
                .eq('player_id', playerId)
                .in('event_id', allEventIds);
                
              const { data: metrics } = await supabase.from('club_metrics').select('id, name').eq('club_id', playerData.club_id);
              if (allPtData && metrics) {
                // Find 'valoracion' or similar metric, otherwise 'rpe'
                let perfMetricId = metrics.find(m => m.name.toLowerCase().includes('valoraci'))?.id;
                if (!perfMetricId) perfMetricId = metrics.find(m => m.name.toLowerCase().includes('rpe'))?.id;

                if (perfMetricId) {
                  const perfEvents = allPtData.filter(p => p.metric_id === perfMetricId);
                  
                  const avg = perfEvents.length > 0 
                    ? Math.round((perfEvents.reduce((acc, p) => acc + p.value_number, 0) / perfEvents.length) * 10) / 10
                    : null;
                  
                  const trends = perfEvents.map((p, i) => ({
                    name: `S${i + 1}`,
                    value: p.value_number
                  }));
                  
                  setPerfStats({ average: avg, trends });
                }
              }
            }
          } catch(e) {
            console.error("Error fetching perf trends:", e);
          }
        }
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

  // Solo mostramos un aviso informativo, no bloqueamos el acceso
  const isPendingRevision = player?.registration_status === 'pending_revision';

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

      {/* ── Aviso informativo (NO bloquea el panel) ── */}
      {isPendingRevision && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-5 shadow-sm animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600 shrink-0">
              <CheckCircle size={22} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-blue-900">¡Solicitud recibida correctamente!</h2>
              <p className="text-sm text-blue-800 mt-0.5 leading-relaxed">
                La inscripción de <strong>{player.first_name}</strong> está siendo revisada por Secretaría. Mientras tanto, ya tienes acceso completo a la plataforma.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            ⚽ {player.first_name} {player.last_name}
            {player.teams?.name && (
              <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold self-center mt-1 border border-blue-200">
                {player.teams.name}
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Resumen completo de la temporada</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => router.push('/dashboard/family/nuevo-jugador')}
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


      {/* WIDGETS DESTACADOS: PRÓXIMO PARTIDO Y PRÓXIMO EVENTO (CALENDARIO) */}
      <div className="grid grid-cols-1 gap-6">
        {/* WIDGET: PRÓXIMO PARTIDO */}
        {nextMatch && (
          <div 
            onClick={() => router.push(`/dashboard/family/e/${playerId}/partidos/${nextMatch.id}`)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <Calendar className="text-blue-200" />
                  Próximo Partido
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {new Date(nextMatch.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-white font-bold text-lg">{player.teams?.name} vs {nextMatch.rival_nombre}</p>
                <p className="text-blue-200 text-sm flex items-center gap-1 mt-0.5">
                  <MapPin size={14} /> {nextMatch.lugar === 'Local' ? 'En casa' : 'Fuera de casa'}
                </p>
              </div>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {nextMatchCallup ? (
                  <>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-green-700 text-lg">¡Estás convocado!</p>
                      <p className="text-sm text-gray-500">El entrenador cuenta contigo para este partido.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-700 text-lg">Convocatoria pendiente</p>
                      <p className="text-sm text-gray-500">El entrenador aún no ha publicado la lista o no estás convocado.</p>
                    </div>
                  </>
                )}
              </div>
              {nextMatchCallup && (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (nextMatchCallup.asistencia_confirmada_familia === true) return;
                      const res = await fetch(`/api/matches/${nextMatch.id}/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId, status: true })
                      });
                      if (res.ok) window.location.reload();
                    }}
                    className={`flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2
                      ${nextMatchCallup.asistencia_confirmada_familia === true 
                        ? 'bg-emerald-600 text-white cursor-default' 
                        : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                  >
                    {nextMatchCallup.asistencia_confirmada_familia === true && <CheckCircle2 className="w-4 h-4" />}
                    Sí, asistiré
                  </button>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (nextMatchCallup.asistencia_confirmada_familia === false) return;
                      const res = await fetch(`/api/matches/${nextMatch.id}/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId, status: false })
                      });
                      if (res.ok) window.location.reload();
                    }}
                    className={`flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2
                      ${nextMatchCallup.asistencia_confirmada_familia === false
                        ? 'bg-rose-600 text-white cursor-default'
                        : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                      }`}
                  >
                    {nextMatchCallup.asistencia_confirmada_familia === false && <span className="text-sm leading-none">❌</span>}
                    No podré
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WIDGET: PRÓXIMO EVENTO DEL CALENDARIO (Entrenamiento / Reunión / Actividad) */}
        {nextEvent && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-r from-teal-700 to-emerald-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <Calendar className="text-teal-200" />
                  Próximo Evento: {nextEvent.event_type || 'Evento'}
                </h2>
                <p className="text-teal-100 text-sm mt-1">
                  {new Date(nextEvent.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} {nextEvent.start_time ? `• ${nextEvent.start_time} hs` : ''}
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                <p className="text-white font-bold text-lg">{nextEvent.title}</p>
                {nextEvent.location && (
                  <p className="text-teal-200 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin size={14} /> {nextEvent.location}
                  </p>
                )}
              </div>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {nextEventAttendance?.status === 'Presente' || nextEventAttendance?.status === 'Asistirá' ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-700 text-lg">Asistencia Confirmada</p>
                      <p className="text-sm text-gray-500">Has confirmado asistencia a este evento.</p>
                    </div>
                  </>
                ) : nextEventAttendance?.status === 'Ausente' || nextEventAttendance?.status === 'No Asistirá' ? (
                  <>
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                      <span className="text-xl">❌</span>
                    </div>
                    <div>
                      <p className="font-bold text-rose-700 text-lg">No Asistiré</p>
                      <p className="text-sm text-gray-500">Has notificado que no podrás acudir.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-amber-700 text-lg">Asistencia Pendiente</p>
                      <p className="text-sm text-gray-500">Por favor, confirma tu asistencia para el cuerpo técnico.</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/events/${nextEvent.id}/attendance`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId, status: 'Presente' })
                    });
                    if (res.ok) window.location.reload();
                  }}
                  className={`flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2 ${
                    nextEventAttendance?.status === 'Presente' || nextEventAttendance?.status === 'Asistirá'
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  Sí, asistiré
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/events/${nextEvent.id}/attendance`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId, status: 'Ausente' })
                    });
                    if (res.ok) window.location.reload();
                  }}
                  className={`flex-1 sm:flex-none font-bold py-2.5 px-5 rounded-xl shadow-sm transition-colors text-sm flex items-center justify-center gap-2 ${
                    nextEventAttendance?.status === 'Ausente' || nextEventAttendance?.status === 'No Asistirá'
                      ? 'bg-rose-600 text-white cursor-default'
                      : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  No podré
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WIDGETS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIDGET 1: ESTADÍSTICAS GENERALES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Activity className="text-blue-200" />
              Estadísticas
            </h2>
          </div>
          <div className="p-5 flex-1 flex flex-col h-full bg-white">


            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Minutos</span>
                </div>
                <p className="text-lg font-black text-slate-800">{stats.minutes}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Activity size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Asistencia</span>
                </div>
                <p className="text-lg font-black text-slate-800">{stats.ratio}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <Goal size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Goles</span>
                </div>
                <p className="text-lg font-black text-slate-800">{stats.goals}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />
                    <span className="font-bold text-slate-700 text-sm">{stats.yellowCards}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-red-500 rounded-sm shadow-sm" />
                    <span className="font-bold text-slate-700 text-sm">{stats.redCards}</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowStatsModal(true)} className="w-full mt-auto py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-blue-600 transition-all">
              Ver Informe Detallado
            </button>
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
            <p className="text-gray-500 font-medium mb-4">Goles esta temporada</p>
            {stats.goals > 0 && (
              <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-4">
                <Flame size={16} /> ¡En racha!
              </div>
            )}
            <button onClick={() => setShowGoalsModal(true)} className="w-full mt-auto py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-emerald-600 transition-all">
              Ver Informe de Goles
            </button>
          </div>
        </div>

        {/* WIDGET 3: RENDIMIENTO ACWR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-amber-700 to-yellow-900 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Activity className="text-amber-200" />
              Rendimiento
            </h2>
          </div>
          <div className="p-5 flex-1 flex flex-col w-full h-full text-left">
          <div className="flex-1 space-y-3 w-full mb-4">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${!acwrData || typeof acwrData?.acwr !== 'number' ? 'bg-gray-50 border-gray-200 text-gray-700' :
              acwrData?.acwr >= 0.8 && acwrData?.acwr <= 1.3 ? 'bg-green-50 border-green-200 text-green-700' :
              acwrData?.acwr > 1.3 && acwrData?.acwr <= 1.5 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              acwrData?.acwr > 1.5 || acwrData?.acwr < 0.8 ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <span className="text-xs font-bold uppercase">ACWR</span>
              </div>
              <div className="font-black">
                {acwrData?.acwr && typeof acwrData.acwr === 'number' && acwrData.acwr > 0 ? acwrData.acwr.toFixed(2) : '-'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Asist.</span>
                </div>
                <span className="font-black text-slate-900">{stats.ratio}%</span>
              </div>
              
              <div className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mins.</span>
                </div>
                <span className="font-black text-slate-900">{stats.minutes}</span>
              </div>
            </div>

            {/* LEYENDA ACWR COMPACTA */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              <div className="bg-slate-50 border-t-2 border-slate-400 p-1.5 rounded-b-md text-center shadow-sm">
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Bajo</div>
                <div className="text-[9px] font-black text-slate-700">{'<0.8'}</div>
              </div>
              <div className="bg-emerald-50 border-t-2 border-emerald-500 p-1.5 rounded-b-md text-center shadow-sm">
                <div className="text-[8px] font-bold text-emerald-700 uppercase tracking-tighter">Óptimo</div>
                <div className="text-[9px] font-black text-emerald-800">0.8-1.3</div>
              </div>
              <div className="bg-amber-50 border-t-2 border-amber-500 p-1.5 rounded-b-md text-center shadow-sm">
                <div className="text-[8px] font-bold text-amber-700 uppercase tracking-tighter">Precau.</div>
                <div className="text-[9px] font-black text-amber-800">1.3-1.5</div>
              </div>
              <div className="bg-red-50 border-t-2 border-red-500 p-1.5 rounded-b-md text-center shadow-sm">
                <div className="text-[8px] font-bold text-red-700 uppercase tracking-tighter">Peligro</div>
                <div className="text-[9px] font-black text-red-800">{'>1.5'}</div>
              </div>
            </div>
          </div>
          <button onClick={() => setShowPerformanceDrawer(true)} className="w-full mt-auto py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-amber-700 transition-all">
            Ver Informe
          </button>
        </div>
      </div>

        {/* WIDGET 3: ASISTENCIA Y ENTRENAMIENTOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Target className="text-purple-200" />
              Asistencia y Entrenamientos
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-4xl font-black text-gray-900">{stats.ratio}%</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ratio de Asistencia</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Calendar className="text-purple-600 w-6 h-6" />
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-5">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.ratio}%` }} 
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-center">
                  <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Asiste</span>
                  <span className="text-lg font-black text-emerald-700">{stats.asistencia}</span>
                </div>
                <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-2.5 text-center">
                  <span className="block text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Retraso</span>
                  <span className="text-lg font-black text-orange-700">{stats.retrasos}</span>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-lg p-2.5 text-center">
                  <span className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-0.5">Falta</span>
                  <span className="text-lg font-black text-red-700">{stats.faltas}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowAttendanceModal(true)} 
              className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm mt-auto"
            >
              Ver Detalle de Asistencia
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
            <button onClick={() => setShowDisciplineModal(true)} className="w-full mt-auto py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-red-600 transition-all">
              Ver Historial Sanciones
            </button>
          </div>
        </div>

        {/* WIDGET 6: ROPA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Shirt className="text-yellow-100" />
              Equipación
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between items-center text-center">
            <div className="mb-4">
              <div className="w-20 h-20 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-100">
                 <Shirt size={40} />
              </div>
              <p className="font-extrabold text-3xl text-gray-900">{apparelStats.delivered}/{apparelStats.total}</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Prendas Entregadas</p>
            </div>
            
            <button onClick={() => setShowApparelModal(true)} className="w-full mt-auto py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-yellow-600 transition-all">
              Ver Tallas y Estado
            </button>
          </div>
        </div>

      </div>

      {/* WIDGET: HISTORIAL DE CONVOCATORIAS */}
      {matchHistory && matchHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              Últimos Partidos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Partido</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Resultado</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Minutos</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Goles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {matchHistory.map((h, i) => {
                  const p = h.partidos;
                  return (
                    <tr 
                      key={i} 
                      onClick={() => router.push(`/dashboard/family/e/${playerId}/partidos/${p.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(p.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{p.lugar === 'Local' ? player.teams?.name : p.rival_nombre}</div>
                        <div className="text-sm text-gray-500">vs {p.lugar === 'Local' ? p.rival_nombre : player.teams?.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-bold text-sm">
                          {p.resultado_propio} - {p.resultado_rival}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                        {h.minutos_jugados > 0 ? `${h.minutos_jugados}'` : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-emerald-600">
                        {h.goles > 0 ? h.goles : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WIDGET: CUOTAS (SUBSCRIPTIONS) */}
      {!(player as any).is_senior && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-emerald-600" />
            Facturación y Pagos
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg">
              Pago: {player.payment_method || 'No definido'}
            </span>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-lg">
              Plan: {player.payment_plan || 'No definido'}
            </span>
          </div>
        </div>
        <div className="p-6 bg-gray-50/50">
          <Subscriptions playerId={playerId} />
        </div>
      </div>
      )}

      {showPerformanceDrawer && (
        <PlayerPerformanceDrawer 
          playerId={playerId} 
          teamId={player?.team_id}
          initialTab={'entrenamientos'}
          onClose={() => setShowPerformanceDrawer(false)} 
          globalTrainingStats={{
            first_name: player?.first_name,
            last_name: player?.last_name,
            dorsal: player?.dorsal,
            acwr: acwrData?.acwr || 0,
            trainingMinutes: stats.minutes
          }}
          globalMatchStats={{
            goals: stats.goals,
            assists: null
          }}
        />
      )}

      {showStatsModal && player && (
        <PlayerStatsModal 
          player={{
            ...player,
            minutes_played: stats.minutes,
            matches_called: stats.matchesPlayed,
            attendance_percentage: stats.ratio,
            goals: stats.goals,
            average_performance: perfStats.average,
            yellow_cards: stats.yellowCards,
            red_cards: stats.redCards,
            perf_trends: perfStats.trends
          } as PlayerStatsData} 
          onClose={() => setShowStatsModal(false)} 
        />
      )}

      {showDisciplineModal && player && (
        <DisciplineModal 
          player={player}
          cardEvents={disciplineCardEvents}
          onClose={() => setShowDisciplineModal(false)}
          readOnly={true}
        />
      )}

      {showAttendanceModal && player && (
        <AttendanceModal
          player={player}
          attendanceRecords={attendanceRecords}
          stats={{
            present: stats.asistencia,
            absent: stats.faltas,
            excused: stats.justificadas,
            late: stats.retrasos,
            total: stats.total,
            ratio: stats.ratio
          }}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}

      {showApparelModal && player && (
        <ApparelModal
          player={player}
          apparelData={apparelData}
          apparelStats={apparelStats}
          onClose={() => setShowApparelModal(false)}
        />
      )}

      {showGoalsModal && player && (
        <GoalsModal
          player={player}
          matchHistory={matchHistory}
          totalGoals={stats.goals}
          onClose={() => setShowGoalsModal(false)}
        />
      )}
    </div>
  )
}
