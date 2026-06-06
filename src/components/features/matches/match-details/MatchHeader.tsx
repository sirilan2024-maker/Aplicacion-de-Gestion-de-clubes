"use client"

import { Award, Star } from "lucide-react"

interface CarouselEvent {
  id: string
  title: string
  date: string
  opponent: string
  score: string
  isFinished: boolean
  isCurrent: boolean
  logo: string
}

const CAROUSEL_EVENTS: CarouselEvent[] = [
  { id: "e1", title: "Jornada 20", date: "06 May", opponent: "Real Betis EB", score: "2 - 1", isFinished: true, isCurrent: false, logo: "⚽" },
  { id: "e2", title: "Jornada 21", date: "13 May", opponent: "Sevilla CF EB", score: "1 - 2", isFinished: true, isCurrent: false, logo: "🏆" },
  { id: "e3", title: "Jornada 22", date: "Hoy, 15:30", opponent: "Atlético Écija", score: "5 - 1", isFinished: true, isCurrent: true, logo: "⚡" },
  { id: "e4", title: "Jornada 23", date: "25 May", opponent: "CD Utrera", score: "VS", isFinished: false, isCurrent: false, logo: "🛡️" },
  { id: "e5", title: "Jornada 24", date: "01 Jun", opponent: "Betis Balón", score: "VS", isFinished: false, isCurrent: false, logo: "🔥" },
  { id: "e6", title: "Jornada 25", date: "08 Jun", opponent: "Écija Balompié", score: "VS", isFinished: false, isCurrent: false, logo: "⚽" }
]

interface MatchHeaderProps {
  localGoals: number
  awayGoals: number
  goalsList: { local: string; away: string }
}

export function MatchHeader({ localGoals, awayGoals, goalsList }: MatchHeaderProps) {
  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
        <span>Infantil Brave</span>
        <span className="text-slate-300">/</span>
        <span>Calendario</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 font-bold">Partido vs Atl. Écija</span>
      </div>

      {/* ── Carrusel Deslizable ── */}
      <div className="flex overflow-x-auto gap-4 pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {CAROUSEL_EVENTS.map(event => (
          <div
            key={event.id}
            className={[
              "flex-shrink-0 w-44 rounded-xl p-4 transition-all duration-300 border flex flex-col justify-between cursor-pointer hover:shadow-sm",
              event.isCurrent
                ? "border-blue-500 bg-blue-50/70 shadow-sm shadow-blue-100"
                : "bg-white border-slate-200/80 hover:border-slate-300"
            ].join(" ")}
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className={event.isCurrent ? "text-blue-600" : ""}>{event.title}</span>
              <span>{event.logo}</span>
            </div>
            <div className="my-2">
              <p className="text-xs font-bold text-slate-900 truncate">vs {event.opponent}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{event.date}</p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className={[
                "text-xs font-black px-2 py-0.5 rounded-lg",
                event.isCurrent ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
              ].join(" ")}>
                {event.isCurrent ? `${localGoals} - ${awayGoals}` : event.score}
              </span>
              {event.isFinished && (
                <span className="text-[9px] text-emerald-600 font-extrabold uppercase">Finalizado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Marcador Central (Scoreboard) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
        {/* Cabecera Azul */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center text-xs font-bold tracking-wide">
          <span className="uppercase">Liga Provincial Sevilla · Jornada 22</span>
          <span className="opacity-90">Miércoles, 20 de Mayo de 2026</span>
        </div>

        {/* Cuerpo del Marcador */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
          {/* Local */}
          <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-250 flex items-center justify-center text-2xl shadow-sm shrink-0">
              🛡️
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">Sporting Saladar</h2>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">Local</span>
            </div>
          </div>

          {/* Marcador Gigante */}
          <div className="flex items-center gap-5 shrink-0 my-2 md:my-0">
            <span className="text-5xl font-extrabold text-red-500 tracking-tighter tabular-nums leading-none">
              {localGoals}
            </span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-3 py-1 rounded-lg">
                15:30 - 17:00
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-1">FINALIZADO</span>
            </div>
            <span className="text-5xl font-extrabold text-red-500 tracking-tighter tabular-nums leading-none">
              {awayGoals}
            </span>
          </div>

          {/* Visitante */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 flex-1 text-center md:text-right">
            <div className="w-14 h-14 rounded-xl bg-red-50 border border-red-250 flex items-center justify-center text-2xl shadow-sm shrink-0">
              🏆
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 leading-tight">Atlético Écija</h2>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1">Visitante</span>
            </div>
          </div>
        </div>

        {/* Pie (Goleadores) */}
        <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">⚽</span>
            <span>
              <strong>Sporting:</strong> {goalsList.local || "Carlos Pérez (18', 42'), Andrés Gil (65'), Rubén Díaz (81')"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-sm shrink-0">⚽</span>
            <span>
              <strong>Atl. Écija:</strong> {goalsList.away || "J. Gómez (30')"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tarjetas de Destacados (Grid 2 columnas) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MVP Card */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex items-center gap-5 border border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <img
            src="/mvp_player_avatar.png"
            className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-105"
            alt="MVP"
          />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5">
              <Award className="w-3 h-3" />
              Estrella del Partido
            </div>
            <h3 className="text-base font-black text-white leading-tight">Carlos Pérez</h3>
            <p className="text-xs text-slate-400">Centrocampista · Dorsal #10</p>
            <p className="text-xs font-bold text-amber-300 mt-1">⚽ 2 Goles · 🎯 1 Asistencia</p>
          </div>
        </div>

        {/* Rating/Notes Card */}
        <div className="bg-white rounded-xl p-5 border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nota del partido</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-850">3.5</span>
                <span className="text-slate-400 font-bold text-sm">/ 6</span>
              </div>
            </div>
            {/* 3.5 rating stars */}
            <div className="flex gap-0.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <Star
                  key={i}
                  className={[
                    "w-4 h-4",
                    i < 3
                      ? "text-amber-400 fill-amber-400"
                      : i === 3
                      ? "text-amber-300/40 fill-amber-400/25"
                      : "text-slate-200"
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3 italic border-l border-blue-500 pl-3">
            "Buen partido en general. La presión alta funcionó bien, aunque debemos controlar mejor los balones aéreos en el último tramo."
          </p>
        </div>
      </div>
    </div>
  )
}
