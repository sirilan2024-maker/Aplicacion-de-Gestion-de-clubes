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
import { LiveTab } from "@/components/features/matches/match-details/LiveTab";
import { ConvocatoriaList } from "@/components/features/matches/ConvocatoriaList";
import { useParams } from "next/navigation";

// MOCK DATA FOR PLACEHOLDERS
const MOCK_PLAYERS = [
  { id: "p1", first_name: "David", last_name: "García" },
  { id: "p2", first_name: "Jorge", last_name: "Ruiz" },
  { id: "p3", first_name: "Miguel", last_name: "Sanz" },
  { id: "p4", first_name: "Pablo", last_name: "Torres" },
  { id: "p5", first_name: "Luis", last_name: "Moreno" },
  { id: "p6", first_name: "Rubén", last_name: "Díaz" },
  { id: "p7", first_name: "Andrés", last_name: "Gil" },
  { id: "p8", first_name: "Sergio", last_name: "López" },
  { id: "p9", first_name: "Carlos", last_name: "Pérez" },
  { id: "p10", first_name: "Álvaro", last_name: "Núñez" },
  { id: "p11", first_name: "Iván", last_name: "Castro" }
]

export default function MatchDetailPage() {
  const { id } = useParams();
  const matchId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const [activeTab, setActiveTab] = useState<TabType>("resumen");

  // Score stats managed reactively from the LiveTab
  const [localGoals, setLocalGoals] = useState<number>(5)
  const [awayGoals, setAwayGoals] = useState<number>(1)
  const [goalsList, setGoalsList] = useState({
    local: "Carlos Pérez (18', 42'), Andrés Gil (65'), Rubén Díaz (81')",
    away: "J. Gómez (30')"
  })

  const handleLiveEventChange = (local: number, away: number, list: { local: string; away: string }) => {
    setLocalGoals(local)
    setAwayGoals(away)
    setGoalsList(list)
  }

  return (
    <div className="min-h-full bg-slate-50/50 pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/matches"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1 stroke-[2.5]" />
            Volver a Partidos
          </Link>

          <div className="bg-amber-50 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest">
            ⚡ Vista de Maquetación Premium
          </div>
        </div>

        {/* ─── 1. HEADER (Scoreboard, carousel, details) ─── */}
        <MatchHeader
          localGoals={localGoals}
          awayGoals={awayGoals}
          goalsList={goalsList}
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
          {activeTab === "resumen" && <SummaryTab matchId={matchId} />}

          {/* TAB: ALINEACIÓN (Modo Edición Interactiva) */}
          {activeTab === "alineacion" && <LineupTab />}

          {/* TAB: ESTADÍSTICAS */}
          {activeTab === "estadisticas" && <StatsTab />}

          {/* TAB: EN DIRECTO */}
          {activeTab === "live" && (
            <LiveTab matchId={matchId} onEventChange={handleLiveEventChange} />
          )}

          {/* TAB: ASISTENCIAS */}
          {activeTab === "convocatoria" && (
            <div className="space-y-4">
              <ConvocatoriaList />
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
                  { task: "Lavar las equipaciones de juego", done: false, assignee: "Capitán (David)" }
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
          {activeTab === "post-partido" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Reseña Técnica</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">ANÁLISIS POST-PARTIDO DEL STAFF</p>
                </div>
              </div>
              <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-6 shadow-sm space-y-4 text-xs leading-relaxed text-slate-600">
                <p><strong>Aspectos Positivos:</strong> Excelente posesión del balón. Los extremos (Álvaro e Iván) supieron abrir el campo permitiendo las internadas del MVP Carlos Pérez por el centro. Las recuperaciones tras pérdida en campo contrario impidieron las contras del rival.</p>
                <p><strong>Aspectos a Mejorar:</strong> La defensa de las jugadas a balón parado sigue siendo nuestra asignatura pendiente. El gol encajado a los 30' provino de un córner mal defendido en el primer palo. Falta comunicación defensiva entre los centrales.</p>
                <p className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl">
                  <strong>Conclusión del Staff:</strong> Tres puntos muy importantes que nos consolidan en la parte alta de la clasificación. El trabajo semanal dio sus frutos en el apartado físico. ¡A seguir trabajando así!
                </p>
              </div>
            </div>
          )}

          {/* TAB: FORO */}
          {activeTab === "foro" && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Foro de Discusión</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">COMUNICACIÓN CON LA PLANTILLA Y FAMILIAS</p>
                </div>
              </div>
              <div className="bg-slate-50/30 rounded-xl border border-slate-150 p-4 shadow-sm space-y-4">
                {/* Comments List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { author: "Míster Juan", role: "Entrenador", text: "¡Gran esfuerzo de todos hoy! Victoria muy trabajada. Nos vemos el lunes en el entreno.", time: "Hace 2 horas" },
                    { author: "Padre de David", role: "Familiar", text: "Partidazo de todo el equipo, enhorabuena. El gol de Andrés fue espectacular.", time: "Hace 1 hora" },
                    { author: "Carlos Pérez", role: "Jugador (Capitán)", text: "Gracias míster. A por el siguiente partido ⚽💪", time: "Hace 45 min" }
                  ].map((c, i) => (
                    <div key={i} className="p-3 border border-slate-100 rounded-xl bg-white shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{c.author} <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full ml-1">{c.role}</span></span>
                        <span className="text-[9px] text-slate-400 font-medium">{c.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{c.text}</p>
                    </div>
                  ))}
                </div>
                {/* Message Input bar */}
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <input type="text" placeholder="Escribe un mensaje en el foro del partido..." className="flex-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white" />
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm">Enviar</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
