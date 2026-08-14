"use client"

import { Award, Star, Calendar, MapPin, Clock } from "lucide-react"

interface MatchHeaderProps {
  localGoals: number
  awayGoals: number
  goalsList: { local: string; away: string }
  match?: any
  allMatches?: any[]
}

export function MatchHeader({ localGoals, awayGoals, goalsList, match, allMatches }: MatchHeaderProps) {
  const isLocal = match?.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(match?.lugar || '');
  const teamName = match?.equipo?.name || "Sporting Saladar";
  const rivalName = match?.rival_nombre || "Rival por definir";
  
  const localName = isLocal ? teamName : rivalName;
  const awayName = isLocal ? rivalName : teamName;
  
  const localIcon = isLocal ? "🛡️" : "🏆";
  const awayIcon = isLocal ? "🏆" : "🛡️";

  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora) : new Date();
  const matchLocation = match?.lugar || "Ubicación sin definir";

  const displayLocalGoals = isLocal ? localGoals : awayGoals;
  const displayAwayGoals = isLocal ? awayGoals : localGoals;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Carrusel de Partidos (Recientes / Próximos) ── */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
        {(allMatches || []).slice(0, 5).map((m: any) => {
          const isCurrent = m.id === match?.id
          const isFinished = m.estado === 'Finalizado'
          const isMatchLocal = m.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(m.lugar || '');
          const hScore = isMatchLocal ? (m.resultado_propio ?? '-') : (m.resultado_rival ?? '-');
          const aScore = isMatchLocal ? (m.resultado_rival ?? '-') : (m.resultado_propio ?? '-');
          const score = `${hScore} - ${aScore}`
          
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
                <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="capitalize">{new Date(m.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="text-slate-300">•</span>
                  <span>{new Date(m.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h</span>
                </p>
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
        <div className="bg-blue-600 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-2 text-xs font-bold tracking-wide">
          <span className="uppercase block w-full sm:w-auto truncate">{match?.competicion_nombre || 'Competición FFCV'}</span>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 opacity-90 text-[11px] sm:text-xs w-full sm:w-auto">
            <span className="flex items-center gap-1.5 break-words whitespace-normal"><Calendar className="w-4 h-4 shrink-0" /> {matchDate.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} • {matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h</span>
            <span className="flex items-center gap-1.5 break-words whitespace-normal"><MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{matchLocation}</span></span>
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
          {(() => {
            const isFinished = match?.estado === 'Finalizado';
            const isDescanso = !isFinished && (match?.estado === 'Descanso' || 
              (match?.first_half_duration_seconds !== null && 
               match?.first_half_duration_seconds > 0 &&
               match?.live_timer_elapsed_seconds === match?.first_half_duration_seconds && 
               !match?.live_timer_started_at));
            const isLive = !isFinished && !isDescanso && (match?.estado === 'En curso' || match?.estado === 'En Curso' || match?.live_timer_started_at !== null || (match?.live_timer_elapsed_seconds && match?.live_timer_elapsed_seconds > 0));
            const isSecondHalf = match?.first_half_duration_seconds !== null && match?.first_half_duration_seconds > 0;

            return (
              <div className="flex items-center gap-5 shrink-0 my-2 md:my-0">
                <span className={`text-5xl font-extrabold tracking-tighter tabular-nums leading-none ${isLive ? 'text-green-600' : isDescanso ? 'text-amber-600' : 'text-slate-800'}`}>
                  {displayLocalGoals}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-3 py-1 rounded-lg">
                    {matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-[10px] font-black mt-1 uppercase px-2.5 py-0.5 rounded ${
                    isFinished 
                      ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                      : isDescanso 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : isLive 
                      ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' 
                      : 'bg-slate-50 text-slate-400 border border-slate-150'
                  }`}>
                    {isFinished ? 'Finalizado' : isDescanso ? 'Descanso' : isLive ? (isSecondHalf ? '2ª Parte' : '1ª Parte') : (match?.estado || 'Programado')}
                  </span>
                </div>
                <span className={`text-5xl font-extrabold tracking-tighter tabular-nums leading-none ${isLive ? 'text-green-600' : isDescanso ? 'text-amber-600' : 'text-slate-800'}`}>
                  {displayAwayGoals}
                </span>
              </div>
            );
          })()}

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

        {/* Pie (Goleadores Alineados) */}
        {(() => {
          const matchEvents = match?.match_events || [];
          const goalEvents = matchEvents.filter((e: any) => {
            const tipo = (e.tipo_evento || e.tipo || '').toLowerCase();
            return tipo.includes('gol');
          });

          const localGoalEvents = goalEvents.filter((e: any) => {
            const tipo = (e.tipo_evento || e.tipo || '').toLowerCase();
            const isGol = tipo.includes('gol') && !tipo.includes('propia');
            const isAutogol = tipo.includes('propia') || tipo.includes('pp');
            const notas = e.notas || '';
            
            if (notas.includes('[LOCAL]')) return isGol ? true : false;
            if (notas.includes('[VISITANTE]')) return isGol ? false : true;
            
            const isSportingPoint = (isGol && e.player_id) || (isAutogol && !e.player_id);
            return isLocal ? isSportingPoint : !isSportingPoint;
          }).sort((a: any, b: any) => (a.minuto || 0) - (b.minuto || 0));

          const awayGoalEvents = goalEvents.filter((e: any) => {
            const tipo = (e.tipo_evento || e.tipo || '').toLowerCase();
            const isGol = tipo.includes('gol') && !tipo.includes('propia');
            const isAutogol = tipo.includes('propia') || tipo.includes('pp');
            const notas = e.notas || '';
            
            if (notas.includes('[VISITANTE]')) return isGol ? true : false;
            if (notas.includes('[LOCAL]')) return isGol ? false : true;
            
            const isSportingPoint = (isGol && e.player_id) || (isAutogol && !e.player_id);
            return isLocal ? !isSportingPoint : isSportingPoint;
          }).sort((a: any, b: any) => (a.minuto || 0) - (b.minuto || 0));

          const getCleanNameFromNotas = (rawNotes: string) => {
            let clean = rawNotes.replace(/^\[(LOCAL|VISITANTE)\]\s*/i, '').trim();
            if (clean.includes(',')) {
              const parts = clean.split(',').map(p => p.trim());
              clean = `${parts[1]} ${parts[0]}`;
            }
            return clean.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
          };

          return (
            <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-700">
              {/* Columna Goles Local */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-0.5">
                  <span>⚽ {localName}</span>
                </div>
                {localGoalEvents.length > 0 ? (
                  localGoalEvents.map((g: any, i: number) => {
                    const tipo = (g.tipo_evento || g.tipo || '').toLowerCase();
                    const isOwnGoal = tipo.includes('propia') || tipo.includes('pp');
                    const isSportingPlayer = Boolean(g.player_id);
                    let pName = '';
                    if (isSportingPlayer) {
                      pName = isOwnGoal ? 'Sporting (p.p.)' : (g.player?.first_name ? g.player.first_name.trim() : (g.notas ? getCleanNameFromNotas(g.notas) : 'Jugador'));
                    } else {
                      pName = isOwnGoal ? 'Rival (p.p.)' : (g.notas ? getCleanNameFromNotas(g.notas) : 'Rival');
                    }
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <span className="font-bold">{pName}</span>
                        <span className="text-slate-400 font-semibold text-[11px]">({g.minuto}')</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-slate-400 italic text-[11px]">Sin goles</span>
                )}
              </div>

              {/* Columna Goles Visitante */}
              <div className="flex flex-col items-end gap-1 text-right border-l border-slate-200/60 pl-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-0.5 justify-end">
                  <span>{awayName} ⚽</span>
                </div>
                {awayGoalEvents.length > 0 ? (
                  awayGoalEvents.map((g: any, i: number) => {
                    const tipo = (g.tipo_evento || g.tipo || '').toLowerCase();
                    const isOwnGoal = tipo.includes('propia') || tipo.includes('pp');
                    const isSportingPlayer = Boolean(g.player_id);
                    let pName = '';
                    if (isSportingPlayer) {
                      pName = isOwnGoal ? 'Sporting (p.p.)' : (g.player?.first_name ? g.player.first_name.trim() : (g.notas ? getCleanNameFromNotas(g.notas) : 'Jugador'));
                    } else {
                      pName = isOwnGoal ? 'Rival (p.p.)' : (g.notas ? getCleanNameFromNotas(g.notas) : 'Rival');
                    }
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-slate-700 font-medium justify-end">
                        <span className="text-slate-400 font-semibold text-[11px]">({g.minuto}')</span>
                        <span className="font-bold">{pName}</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-slate-400 italic text-[11px]">Sin goles</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  )
}
