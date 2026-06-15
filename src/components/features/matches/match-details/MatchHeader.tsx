"use client"

import { Award, Star, Calendar, MapPin } from "lucide-react"

interface MatchHeaderProps {
  localGoals: number
  awayGoals: number
  goalsList: { local: string; away: string }
  match?: any
  allMatches?: any[]
}

export function MatchHeader({ localGoals, awayGoals, goalsList, match, allMatches }: MatchHeaderProps) {
  const isLocal = true; // Always show Sporting Saladar on the left
  const teamName = match?.equipo?.name || "Sporting Saladar";
  const rivalName = match?.rival_nombre || "Rival por definir";
  
  const localName = isLocal ? teamName : rivalName;
  const awayName = isLocal ? rivalName : teamName;
  
  const localIcon = isLocal ? "🛡️" : "🏆";
  const awayIcon = isLocal ? "🏆" : "🛡️";

  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora) : new Date();
  const matchLocation = match?.lugar || "Ubicación sin definir";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Carrusel de Partidos (Recientes / Próximos) ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
        {(allMatches || []).slice(0, 5).map((m: any) => {
          const isCurrent = m.id === match?.id
          const isFinished = m.estado === 'Finalizado'
          const localGoals = m.resultado_propio ?? '-'
          const awayGoals = m.resultado_rival ?? '-'
          const score = `${localGoals} - ${awayGoals}`
          
          return (
            <div 
              key={m.id} 
              className={[
                "flex-none w-64 p-4 rounded-xl border snap-start cursor-pointer transition-all",
                isCurrent 
                  ? "bg-blue-50 border-blue-200 shadow-md shadow-blue-500/10 ring-1 ring-blue-500" 
                  : "bg-white border-slate-150 hover:border-slate-300 hover:shadow-sm opacity-70 hover:opacity-100"
              ].join(" ")}
              onClick={() => {
                if (!isCurrent) {
                  window.location.href = `/dashboard/equipos/${m.equipo_id}/partidos/${m.id}`
                }
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{m.equipo?.category || 'CADETE'}</span>
                <span>{isFinished ? "🏆" : (isCurrent ? "⚡" : "⚽")}</span>
              </div>
              <div className="my-2">
                <p className="text-xs font-bold text-slate-900 truncate">vs {m.rival_nombre}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{new Date(m.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={[
                  "text-xs font-black px-2 py-0.5 rounded-lg",
                  isCurrent ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
                ].join(" ")}>
                  {score}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Marcador Central (Scoreboard) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
        {/* Cabecera Azul */}
        <div className="bg-blue-600 text-white px-6 py-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 text-xs font-bold tracking-wide">
          <span className="uppercase">{match?.competicion_nombre || 'Competición FFCV'}</span>
          <div className="flex flex-wrap items-center gap-4 opacity-90 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {matchDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {matchLocation}</span>
          </div>
        </div>

        {/* Cuerpo del Marcador */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          {/* Local */}
          <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-250 flex items-center justify-center text-2xl shadow-sm shrink-0">
              {localIcon}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">{localName}</h2>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 truncate max-w-[180px]">{matchLocation}</span>
            </div>
          </div>

          {/* Marcador Gigante */}
          <div className="flex items-center gap-5 shrink-0 my-2 md:my-0">
            <span className="text-5xl font-extrabold text-slate-800 tracking-tighter tabular-nums leading-none">
              {localGoals}
            </span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-3 py-1 rounded-lg">
                {matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{match?.estado || 'FINALIZADO'}</span>
            </div>
            <span className="text-5xl font-extrabold text-slate-800 tracking-tighter tabular-nums leading-none">
              {awayGoals}
            </span>
          </div>

          {/* Visitante */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 flex-1 text-center md:text-right">
            <div className="w-14 h-14 rounded-xl bg-red-50 border border-red-250 flex items-center justify-center text-2xl shadow-sm shrink-0">
              {awayIcon}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">{awayName}</h2>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1">Visitante</span>
            </div>
          </div>
        </div>

        {/* Pie (Goleadores) */}
        <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">⚽</span>
            <span>
              <strong>{localName}:</strong> {goalsList.local || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-sm shrink-0">⚽</span>
            <span>
              <strong>{awayName}:</strong> {goalsList.away || "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
