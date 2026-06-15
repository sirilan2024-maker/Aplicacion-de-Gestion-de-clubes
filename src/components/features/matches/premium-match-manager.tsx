"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Users, Calendar, MapPin, ClipboardList, CheckSquare, MessageSquare, Award } from "lucide-react"

// Import custom sub-components
import { MatchHeader } from "@/components/features/matches/match-details/MatchHeader"
import { MatchTabs, TabType } from "@/components/features/matches/match-details/MatchTabs"
import { SummaryTab } from "@/components/features/matches/match-details/SummaryTab"
import { LineupTab } from "@/components/features/matches/match-details/LineupTab"
import { StatsTab } from "@/components/features/matches/match-details/StatsTab"
import { LiveTab } from "@/components/features/matches/match-details/LiveTab"
import { ConvocatoriaList } from "@/components/features/matches/ConvocatoriaList"
import { PostMatchTab } from "@/components/features/matches/match-details/PostMatchTab"

export function PremiumMatchManager({ match, players, convocatorias, matchEvents, allMatches }: {
  match: any
  players: any[]
  convocatorias: any[]
  matchEvents: any[]
  allMatches?: any[]
}) {
  const matchId = match.id;
  const teamId = match.equipo_id;
  const [activeTab, setActiveTab] = useState<TabType>("resumen");

  // Filtrar entrenadores y delegados
  const activePlayers = players.filter(p => {
    const pos = p.posicion?.toLowerCase() || '';
    return !pos.includes('entrenador') && !pos.includes('delegado');
  });

  // Calculate live goals from matchEvents
  const localGoalsList = matchEvents.filter(e => e.tipo === 'Gol' && e.player_id);
  const localGoalsCount = localGoalsList.length;
  const awayGoalsCount = matchEvents.filter(e => e.tipo === 'Gol' && !e.player_id).length;
  
  const [localGoals, setLocalGoals] = useState<number>(match.resultado_propio ?? localGoalsCount)
  const [awayGoals, setAwayGoals] = useState<number>(match.resultado_rival ?? awayGoalsCount)
  const [goalsList, setGoalsList] = useState({
    local: localGoalsList.map(e => `${e.player?.first_name || 'Jugador'} (${e.minuto}')`).join(', '),
    away: "Rival (N/A)"
  })

  const handleLiveEventChange = (local: number, away: number, list: { local: string; away: string }) => {
    setLocalGoals(local)
    setAwayGoals(away)
    setGoalsList(list)
  }

  return (
    <div className="min-h-full bg-slate-50/50 pb-12 w-full">
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/equipos/${teamId}/partidos`}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1 stroke-[2.5]" />
            Volver a Partidos
          </Link>

          <div className="bg-amber-50 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest">
            ⚡ Vista Premium (Conectada a BBDD)
          </div>
        </div>

        {/* ─── 1. HEADER (Scoreboard, carousel, details) ─── */}
        <MatchHeader
          localGoals={localGoals}
          awayGoals={awayGoals}
          goalsList={goalsList}
          match={match}
          allMatches={allMatches}
        />

        {/* ─── 2. STICKY TABS MENU ─── */}
        <MatchTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          matchId={matchId}
        />

        {/* ─── 3. DYNAMIC CONTAINER ─── */}
        <div className="bg-white rounded-xl border border-slate-150 p-6 shadow-sm min-h-[400px]">
          
          {/* TAB: RESUMEN */}
          {activeTab === "resumen" && <SummaryTab matchId={matchId} match={match} players={activePlayers} convocatorias={convocatorias} />}

          {/* TAB: ALINEACIÓN (Modo Edición Interactiva) */}
          {activeTab === "alineacion" && <LineupTab matchId={matchId} players={activePlayers} convocatorias={convocatorias} />}

          {/* TAB: ESTADÍSTICAS */}
          {activeTab === "estadisticas" && <StatsTab players={activePlayers} convocatorias={convocatorias} matchEvents={matchEvents} />}

          {/* TAB: EN DIRECTO */}
          {activeTab === "live" && (
            <LiveTab matchId={matchId} players={activePlayers} matchEvents={matchEvents} onEventChange={handleLiveEventChange} />
          )}

          {/* TAB: CONVOCATORIA */}
          {activeTab === "convocatoria" && (
            <div className="space-y-4">
              <ConvocatoriaList players={activePlayers} matchId={matchId} convocatorias={convocatorias} />
            </div>
          )}

          {/* TAB: POST-PARTIDO */}
          {activeTab === "post-partido" && (
            <PostMatchTab matchId={matchId} initialData={match} players={activePlayers} convocatorias={convocatorias} />
          )}

          {/* TAB: FORO */}
          {activeTab === "foro" && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-wider">Foro del Partido</h3>
              <p className="text-sm text-slate-500 font-medium max-w-sm">
                Espacio para comentarios, fotos y debate entre el cuerpo técnico y los familiares. (En desarrollo)
              </p>
            </div>
          )}


          {/* TAB: TAREAS */}
          {activeTab === "tareas" && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tareas del Partido</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">LOGÍSTICA DEL EQUIPO</p>
                </div>
              </div>
              <div className="bg-slate-50/30 rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
                {[
                  { task: "Llevar petos y balones de calentamiento", done: true, assignee: "Míster" },
                  { task: "Revisar botiquín y agua fría", done: true, assignee: "Delegado" },
                  { task: "Completar actas de alineación", done: false, assignee: "Míster" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked={t.done} className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer" />
                      <span className={`text-xs font-bold ${t.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.task}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-450 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">{t.assignee}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: RESEÑA */}
          {activeTab === "foro" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Reseña Técnica</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">INFORME POST-PARTIDO DEL MÍSTER</p>
                </div>
                <button
                  onClick={async () => {
                    alert("Analizando partido con IA...");
                    const { analyzeMatchData } = await import("@/lib/ai-actions");
                    const res = await analyzeMatchData(matchId, teamId);
                    if (res.success) alert("¡Análisis de IA generado! (Ver en tabla ai_analysis_reports)");
                    else alert(res.error);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  ✨ Analizar con IA
                </button>
              </div>
              <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-6 shadow-sm space-y-4 text-xs leading-relaxed text-slate-600">
                <p><strong>Informe del partido:</strong> {match.coach_report || 'Aún no se ha redactado el informe del partido.'}</p>
              </div>
            </div>
          )}

          {/* TAB: FORO */}
          {activeTab === "foro" && (
            <div className="space-y-4 max-w-xl mx-auto text-center py-12 text-slate-500">
              Próximamente: Foro conectado a Supabase.
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
