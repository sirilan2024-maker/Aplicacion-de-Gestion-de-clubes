'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Target, ShieldAlert, Zap, Goal, Activity } from 'lucide-react'
import { generateRivalScoutingAction, ScoutingReport } from '@/app/actions/scouting-actions'

interface RivalScoutingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RivalScoutingModal({ isOpen, onClose }: RivalScoutingModalProps) {
  const [rivalName, setRivalName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ScoutingReport | null>(null)

  const handleAnalyze = async () => {
    if (!rivalName.trim()) return

    setLoading(true)
    setError(null)
    setReport(null)

    const result = await generateRivalScoutingAction(rivalName.trim())
    
    if (result.success && result.data) {
      setReport(result.data)
    } else {
      setError(result.error || "Ocurrió un error al generar el reporte.")
    }
    
    setLoading(false)
  }

  const handleClose = () => {
    setRivalName('')
    setError(null)
    setReport(null)
    onClose()
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="relative w-full max-w-3xl bg-zinc-950/90 backdrop-blur-2xl border border-emerald-500/20 text-white rounded-3xl shadow-[0_0_50px_-12px_rgba(52,211,153,0.3)] overflow-hidden p-0 transition-all duration-300 animate-in zoom-in-95" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Dynamic Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/10 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 relative z-10 flex flex-col max-h-[85vh]">
          <header className="mb-6 flex-shrink-0">
            <h2 className="text-4xl font-black flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Target className="w-8 h-8 text-emerald-400" />
              </div>
              Scouting de Rivales AI
            </h2>
            <p className="text-zinc-400 text-lg mt-3 font-medium">
              Analiza el historial de partidos e identifica debilidades tácticas de cualquier rival.
            </p>
          </header>

          <div className="flex gap-4 mb-8 flex-shrink-0">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur group-hover:bg-emerald-500/10 transition-all" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500 group-focus-within:text-emerald-400 transition-colors z-10" />
              <Input
                placeholder="Ej. Real Madrid, FC Barcelona..."
                value={rivalName}
                onChange={(e) => setRivalName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="relative z-10 pl-14 h-14 bg-zinc-900/80 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-xl rounded-2xl transition-all shadow-inner"
              />
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !rivalName.trim()}
              className="relative group h-14 px-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg rounded-2xl transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 flex items-center gap-2">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Activity className="w-6 h-6" />}
                {loading ? 'Analizando...' : 'Analizar'}
              </span>
            </Button>
          </div>

          <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[300px]">
            {!report && !error && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60">
                <Target className="w-16 h-16 mb-4 stroke-[1.5]" />
                <p className="text-xl">Ingresa un equipo rival para comenzar</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md">
                <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                <p className="text-lg font-medium">{error}</p>
              </div>
            )}

            {report && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
                
                {/* Historical Record */}
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-zinc-900/60 backdrop-blur-md border border-emerald-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-zinc-800/80 transition-colors">
                    <span className="text-zinc-400 text-sm font-semibold mb-2 uppercase tracking-wider">Victorias</span>
                    <span className="text-4xl font-black text-emerald-400">{report.historicalRecord.wins}</span>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-md border border-amber-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-zinc-800/80 transition-colors">
                    <span className="text-zinc-400 text-sm font-semibold mb-2 uppercase tracking-wider">Empates</span>
                    <span className="text-4xl font-black text-amber-400">{report.historicalRecord.draws}</span>
                  </div>
                  <div className="bg-zinc-900/60 backdrop-blur-md border border-red-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-zinc-800/80 transition-colors">
                    <span className="text-zinc-400 text-sm font-semibold mb-2 uppercase tracking-wider">Derrotas</span>
                    <span className="text-4xl font-black text-red-400">{report.historicalRecord.losses}</span>
                  </div>
                </div>
                
                <div className="flex gap-5">
                   <div className="flex-1 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex justify-between px-8 items-center hover:border-emerald-500/30 transition-colors">
                     <div className="flex items-center gap-3">
                       <Goal className="w-5 h-5 text-emerald-500" />
                       <span className="text-zinc-300 font-semibold text-lg">Goles a Favor</span>
                     </div>
                     <span className="text-2xl font-black text-emerald-400">{report.historicalRecord.goalsFor}</span>
                   </div>
                   <div className="flex-1 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex justify-between px-8 items-center hover:border-red-500/30 transition-colors">
                     <div className="flex items-center gap-3">
                       <ShieldAlert className="w-5 h-5 text-red-500" />
                       <span className="text-zinc-300 font-semibold text-lg">Goles en Contra</span>
                     </div>
                     <span className="text-2xl font-black text-red-400">{report.historicalRecord.goalsAgainst}</span>
                   </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 p-6 rounded-3xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
                  <h3 className="text-xl font-bold text-red-400 flex items-center gap-3 mb-5 relative z-10">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Target className="w-6 h-6" />
                    </div>
                    Debilidades Tácticas Identificadas
                  </h3>
                  <ul className="space-y-4 relative z-10">
                    {report.tacticalWeaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-4 text-zinc-300 group">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform" />
                        <span className="leading-relaxed text-lg">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tactical Plan */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
                  <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-3 mb-4 relative z-10">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Zap className="w-6 h-6" />
                    </div>
                    Plan Táctico Sugerido (IA)
                  </h3>
                  <p className="text-zinc-300 leading-relaxed text-lg relative z-10">
                    {report.tacticalPlan}
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
