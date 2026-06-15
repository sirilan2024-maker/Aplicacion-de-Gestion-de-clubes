"use client"

import { useState, useTransition } from "react"
import { Sparkles, Save, CheckCircle2, AlertCircle, Users, Star, BarChart2, FileText } from "lucide-react"
import { saveMatchReport } from "@/app/actions/match-actions"
import { Button } from "@/components/ui/button"
import { MatchFullReportModal } from "./MatchFullReportModal"

export function PostMatchTab({ matchId, initialData, players = [], convocatorias = [] }: { matchId: string, initialData?: any, players?: any[], convocatorias?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [showFullReportModal, setShowFullReportModal] = useState(false)

  const [rating, setRating] = useState<string>(initialData?.coach_rating?.toString() || "7")
  const [summary, setSummary] = useState(initialData?.coach_summary || "")
  const [positive, setPositive] = useState(initialData?.positive_aspects || "")
  const [improvement, setImprovement] = useState(initialData?.improvement_aspects || "")
  const [attitude, setAttitude] = useState(initialData?.attitude_notes || "")

  const handleSave = () => {
    startTransition(async () => {
      await saveMatchReport(matchId, {
        coach_rating: parseInt(rating),
        coach_summary: summary,
        positive_aspects: positive,
        improvement_aspects: improvement,
        attitude_notes: attitude
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {showFullReportModal && (
        <MatchFullReportModal
          matchId={matchId}
          matchDate={initialData?.fecha_hora || ""}
          teamId={initialData?.equipo_id || ""}
          players={players}
          convocatorias={convocatorias}
          onClose={() => setShowFullReportModal(false)}
        />
      )}

      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Informe Técnico del Partido</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Análisis táctico, rendimiento y evaluación post-partido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFullReportModal(true)}
            className="w-full mt-4 px-4 py-4 border-2 border-slate-200 text-slate-700 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 group shadow-sm hover:shadow"
          >
            <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            Rellenar Informe Completo del Partido
          </button>
          <Button 
            variant="outline" 
            className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-bold"
            onClick={() => alert('Analizando informe con IA...')}
          >
            <Sparkles className="w-4 h-4" />
            Análisis IA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Rating y Resumen */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
              Nota del Partido (1-10)
            </label>
            <select 
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full text-2xl font-black text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>Nota: {n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
              Valoración General (Coach Summary)
            </label>
            <textarea 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Resumen del rendimiento general, sensaciones y desarrollo del encuentro..."
              className="w-full h-40 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Columna Derecha: Aspectos */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600 tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> Aspectos Positivos
              </label>
              <textarea 
                value={positive}
                onChange={(e) => setPositive(e.target.value)}
                placeholder="¿Qué se hizo bien táctica, física o mentalmente? (Presión, posesión...)"
                className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-black uppercase text-red-500 tracking-wider mb-2">
                <AlertCircle className="w-4 h-4" /> Aspectos a Mejorar
              </label>
              <textarea 
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="Errores detectados, faltas de concentración o debilidades tácticas..."
                className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
              Actitud del Equipo y Observaciones Adicionales (Attitude Notes)
            </label>
            <textarea 
              value={attitude}
              onChange={(e) => setAttitude(e.target.value)}
              placeholder="Comportamiento de la plantilla, intensidad, deportividad u otras notas sobre el rival o arbitraje..."
              className="w-full h-24 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
            >
              {isPending ? <span className="animate-spin text-xl leading-none">⟳</span> : <Save className="w-4 h-4" />}
              {success ? "Guardado Correctamente" : "Guardar Informe"}
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
