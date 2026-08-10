"use client"
import { useState } from "react"
import { MatchTrendsModal } from "@/components/features/matches/match-details/MatchTrendsModal"
import { RivalScoutingModal } from "@/components/features/ai-reports/RivalScoutingModal"
import PlayerEvolutionModal from "@/components/features/ai-reports/PlayerEvolutionModal"
import ClubBigDataModal from "@/components/features/ai-reports/ClubBigDataModal"
import AdminFinancialModal from "@/components/features/ai-reports/AdminFinancialModal"
import FatigueAlertModal from "@/components/features/ai-reports/FatigueAlertModal"
import { createClient } from "@/lib/supabase/client"
import { Brain, TrendingUp, Sparkles, User, Shield, BarChart3, Loader2, Target, Zap, Wallet, Activity } from "lucide-react"

export default function InformesIAPage() {
  const [showGlobalTrendsModal, setShowGlobalTrendsModal] = useState(false)
  const [showScoutingModal, setShowScoutingModal] = useState(false)
  const [showPlayerEvolutionModal, setShowPlayerEvolutionModal] = useState(false)
  const [showClubBigDataModal, setShowClubBigDataModal] = useState(false)
  const [showFinancialModal, setShowFinancialModal] = useState(false)
  const [showFatigueModal, setShowFatigueModal] = useState(false) // Alerta Fatiga

  const [teamMatches, setTeamMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  
  const openTrendsModal = async () => {
    setLoading(true);
    try {
      const { data: matches } = await supabase
        .from('partidos')
        .select('id, fecha_hora, rival_nombre, resultado_propio, resultado_rival, estado')
        .order('fecha_hora', { ascending: true });
      setTeamMatches(matches || []);
      setShowGlobalTrendsModal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <Brain size={32} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Laboratorio de IA y Datos</h1>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-1">Generación de informes avanzados, análisis táctico y detección de patrones automatizada.</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* SECCIÓN: INFORMES POR EQUIPOS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Análisis y Táctica Colectiva (Equipos)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-5">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Tendencias Tácticas Multi-Partido</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Escanea el histórico de partidos de un equipo para extraer debilidades, distribución de goles y generar un dictamen mediante Inteligencia Artificial.
                </p>
              </div>
              <button 
                onClick={openTrendsModal}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />}
                {loading ? "Cargando..." : "Abrir Herramienta"}
              </button>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">Nuevo</div>
              <div>
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-5">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Scouting de Rivales</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Busca cualquier rival y descubre cómo solemos jugar contra ellos basándose en todo nuestro historial histórico.
                </p>
              </div>
              <button 
                onClick={() => setShowScoutingModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                <Sparkles className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />
                Abrir Herramienta
              </button>
            </div>
          </div>
        </section>

        {/* SECCIÓN: INFORMES PERSONALES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800">Rendimiento Individual (Jugadores)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">Nuevo</div>
              <div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Evolución de Jugador</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Análisis predictivo de la progresión de un jugador, estadísticas globales y evaluación integral con IA.
                </p>
              </div>
              <button 
                onClick={() => setShowPlayerEvolutionModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                <Sparkles className="w-5 h-5 text-emerald-300 group-hover:text-white transition-colors" />
                Abrir Herramienta
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">Nuevo</div>
              <div>
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-5">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Alerta Fatiga</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Prevención de lesiones analizando sobrecarga de minutos reales en toda la plantilla.
                </p>
              </div>
              <button 
                onClick={() => setShowFatigueModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                <Sparkles className="w-5 h-5 text-rose-300 group-hover:text-white transition-colors" />
                Abrir Herramienta
              </button>
            </div>
          </div>
        </section>

        {/* SECCIÓN: INFORMES DE CLUB / FINANCIEROS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Directiva: Institucional y Finanzas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">Nuevo</div>
              <div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Auditoría Deportiva Global</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Extrae un balance global de victorias, goles y situación crítica de todos los equipos del club.
                </p>
              </div>
              <button 
                onClick={() => setShowClubBigDataModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                <Sparkles className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors" />
                Abrir Herramienta
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">Nuevo</div>
              <div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-5">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">IA Tesorería y Cobros</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  Inteligencia artificial que escanea estados de pagos, detecta morosidad y resume la salud financiera.
                </p>
              </div>
              <button 
                onClick={() => setShowFinancialModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group mt-4"
              >
                <Sparkles className="w-5 h-5 text-amber-300 group-hover:text-white transition-colors" />
                Abrir Herramienta
              </button>
            </div>
          </div>
        </section>
      </div>

      {showGlobalTrendsModal && <MatchTrendsModal allMatches={teamMatches} onClose={() => setShowGlobalTrendsModal(false)} />}
      <RivalScoutingModal isOpen={showScoutingModal} onClose={() => setShowScoutingModal(false)} />
      <PlayerEvolutionModal isOpen={showPlayerEvolutionModal} onClose={() => setShowPlayerEvolutionModal(false)} />
      <ClubBigDataModal isOpen={showClubBigDataModal} onClose={() => setShowClubBigDataModal(false)} />
      <AdminFinancialModal isOpen={showFinancialModal} onClose={() => setShowFinancialModal(false)} />
      <FatigueAlertModal isOpen={showFatigueModal} onClose={() => setShowFatigueModal(false)} />
    </div>
  )
}
