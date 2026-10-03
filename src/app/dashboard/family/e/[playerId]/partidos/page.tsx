"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, Calendar as CalendarIcon, MapPin, CheckCircle2, 
  Clock, ChevronRight, FileText, BarChart3, Filter
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FFCVActaModal } from "@/components/features/matches/FFCVActaModal";
import { findRivalShield } from "@/lib/ffcv/rival-shields";
import { normalizeImageUrl } from "@/lib/ffcv/parser";

function normalizeTeamName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(c\.?d\.?|c\.?f\.?|u\.?d\.?|f\.?c\.?|a\.?d\.?|club|deportivo|futbol)\b/gi, '')
    .replace(/['"“”‘’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function findMatchingFfcvMatch(partido: any, ffcvMatches: any[], teamsList: any[]) {
  if (!partido || !ffcvMatches || ffcvMatches.length === 0) return null;

  // 1. Direct match by acta_oficial_url CodPartido
  if (partido.acta_oficial_url) {
    const match = partido.acta_oficial_url.match(/CodPartido=(\d+)/);
    if (match) {
      const found = ffcvMatches.find(m => String(m.ffcv_match_id) === match[1] || String(m.codacta) === match[1]);
      if (found) return found;
    }
  }

  // 2. Direct match by ffcv_match_id or id
  if (partido.ffcv_match_id) {
    const found = ffcvMatches.find(m => String(m.ffcv_match_id) === String(partido.ffcv_match_id) || String(m.codacta) === String(partido.ffcv_match_id));
    if (found) return found;
  }

  // 3. Fallback matching within same group with strict date and location criteria
  const team = teamsList.find(t => t.id === partido.equipo_id) || partido.equipo;
  if (!team || !team.ffcv_group_id) return null;

  const partidoDate = partido.fecha_hora ? new Date(partido.fecha_hora) : null;
  const isLocal = partido.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(partido.lugar || '');
  const rivalNorm = normalizeTeamName(partido.rival_nombre || '');

  const groupMatches = ffcvMatches.filter(m => m.ffcv_group_id === team.ffcv_group_id);

  let bestMatch = null;
  let bestScore = 0;

  for (const fm of groupMatches) {
    let score = 0;
    
    // Strict date guard: fallback must NEVER cross-match matches further than 7 days apart
    if (partidoDate && fm.match_date) {
      const fmDate = new Date(fm.match_date);
      const diffDays = Math.abs((partidoDate.getTime() - fmDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) continue;
      if (diffDays <= 1) score += 4;
      else if (diffDays <= 3) score += 2;
      else score += 1;
    }

    const isOurTeamHome = team.ffcv_team_id ? fm.home_team_ffcv_id === team.ffcv_team_id : normalizeTeamName(fm.home_team_name).includes('saladar');
    const isOurTeamAway = team.ffcv_team_id ? fm.away_team_ffcv_id === team.ffcv_team_id : normalizeTeamName(fm.away_team_name).includes('saladar');

    if (isLocal && isOurTeamHome) score += 3;
    else if (!isLocal && isOurTeamAway) score += 3;
    else if (isOurTeamHome || isOurTeamAway) score += 1;
    else continue;

    const fmRivalNorm = isOurTeamHome ? normalizeTeamName(fm.away_team_name) : normalizeTeamName(fm.home_team_name);
    if (rivalNorm && fmRivalNorm) {
      if (rivalNorm === fmRivalNorm) score += 5;
      else if (rivalNorm.includes(fmRivalNorm) || fmRivalNorm.includes(rivalNorm)) score += 4;
      else {
        const wordsA = rivalNorm.split(' ').filter(w => w.length > 2);
        const wordsB = fmRivalNorm.split(' ').filter(w => w.length > 2);
        const overlap = wordsA.filter(w => wordsB.includes(w)).length;
        if (overlap > 0) score += overlap * 2;
      }
    }

    if (score > bestScore && score >= 7) {
      bestScore = score;
      bestMatch = fm;
    }
  }

  return bestMatch;
}

export default function FamilyMatchesPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [ffcvMatches, setFfcvMatches] = useState<any[]>([]);
  const [ffcvStandings, setFfcvStandings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'Finalizado' | 'Todos'>('Finalizado');
  const [viewingFfcvActa, setViewingFfcvActa] = useState<{
    codacta: string;
    matchId?: string;
    teamId?: string;
    homeTeamName?: string;
    awayTeamName?: string;
  } | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [playerId]);

  const fetchMatches = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setTeamName((pData.teams as any)?.name || "Equipo");
      setPlayerTeamId(pData.team_id);

      if (pData.team_id) {
        // Fetch convocatorias for this specific player to identify any cross-team call-ups (e.g. Senior)
        const { data: cData } = await supabase
          .from('convocatorias')
          .select('partido_id')
          .eq('player_id', playerId);

        const convMatchIds = (cData || []).map(c => c.partido_id).filter(Boolean);

        // Fetch matches: base team matches OR any match where player was convened
        let query = supabase
          .from('partidos')
          .select('*, equipo:teams(id, name, color, category, ffcv_group_id, ffcv_team_id, ffcv_url), match_events(*, player:players(first_name, last_name))')
          .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
          .order('fecha_hora', { ascending: true });

        if (convMatchIds.length > 0) {
          query = query.or(`equipo_id.eq.${pData.team_id},id.in.(${convMatchIds.join(',')})`);
        } else {
          query = query.eq('equipo_id', pData.team_id);
        }

        // Fetch teams of active season 26/27
        const teamsQuery = supabase
          .from('teams')
          .select('id, name, color, category, ffcv_group_id, ffcv_team_id, ffcv_url')
          .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');

        // Fetch official FFCV matches and standings
        const ffcvMatchesQuery = supabase
          .from('ffcv_matches')
          .select('*')
          .eq('ffcv_season_id', '22')
          .limit(2000);

        const ffcvStandingsQuery = supabase
          .from('ffcv_standings')
          .select('*')
          .eq('ffcv_season_id', '22')
          .limit(1000);

        const [{ data: mData, error: mError }, { data: tData }, { data: fmData }, { data: fsData }] = await Promise.all([
          query,
          teamsQuery,
          ffcvMatchesQuery,
          ffcvStandingsQuery
        ]);

        if (mError) throw mError;
        if (tData) setTeams(tData);
        if (fmData) setFfcvMatches(fmData);
        if (fsData) setFfcvStandings(fsData);

        // Orden cronológico estricto: del más cercano en fecha al más lejano
        const sorted = (mData || []).sort((a: any, b: any) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
        setMatches(sorted);
      }

    } catch (err: any) {
      toast.error("Error al cargar partidos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar según la pestaña seleccionada (por defecto solo partidos Finalizados)
  const filteredMatches = useMemo(() => {
    if (statusFilter === 'Finalizado') {
      return matches.filter(m => m.estado === 'Finalizado');
    }
    return matches;
  }, [matches, statusFilter]);

  const handleOpenReport = (match: any, ffcvMatch: any) => {
    // 1. Extraer codacta si existe
    let codacta = ffcvMatch?.codacta || null;
    if (!codacta && match.acta_oficial_url) {
      const matchExtract = match.acta_oficial_url.match(/CodPartido=(\d+)/);
      if (matchExtract) codacta = matchExtract[1];
    }

    if (codacta) {
      const isLocal = match.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(match.lugar || '');
      const homeTeam = isLocal ? (match.equipo?.name || 'Mi Equipo') : (match.rival_nombre || 'Rival');
      const awayTeam = isLocal ? (match.rival_nombre || 'Rival') : (match.equipo?.name || 'Mi Equipo');

      setViewingFfcvActa({
        codacta,
        matchId: ffcvMatch?.ffcv_match_id || match.id,
        teamId: match.equipo_id,
        homeTeamName: ffcvMatch?.home_team_name || homeTeam,
        awayTeamName: ffcvMatch?.away_team_name || awayTeam
      });
    } else {
      // Fallback a la vista de detalle interno del partido si no hay acta oficial
      router.push(`/dashboard/family/e/${playerId}/partidos/${match.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-xs">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Partidos</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Calendario y resultados oficiales del {teamName}</p>
          </div>
        </div>

        {/* Selector de filtro: Finalizado vs Todos */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setStatusFilter('Finalizado')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'Finalizado'
                ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Finalizados ({matches.filter(m => m.estado === 'Finalizado').length})
          </button>
          <button
            onClick={() => setStatusFilter('Todos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'Todos'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({matches.length})
          </button>
        </div>
      </div>

      {!filteredMatches.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center text-slate-500">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-base">
            {statusFilter === 'Finalizado' 
              ? 'No hay partidos finalizados en la competición.' 
              : 'No hay partidos registrados en el calendario.'}
          </p>
          {statusFilter === 'Finalizado' && matches.length > 0 && (
            <button
              onClick={() => setStatusFilter('Todos')}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              Ver todos los partidos programados
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMatches.map((match) => {
            const ffcvMatch = findMatchingFfcvMatch(match, ffcvMatches, teams);
            const isLocal = match.lugar === 'Local' || !/\b(fuera|visitante)\b/i.test(match.lugar || '');
            
            const currentMatchTeamName = match.equipo?.name || teamName;
            const isDifferentTeam = match.equipo_id && playerTeamId && match.equipo_id !== playerTeamId;

            const homeTeamName = isLocal ? currentMatchTeamName : (match.rival_nombre || 'Rival');
            const awayTeamName = isLocal ? (match.rival_nombre || 'Rival') : currentMatchTeamName;

            const internalHomeScore = isLocal ? (match.resultado_propio ?? null) : (match.resultado_rival ?? null);
            const internalAwayScore = isLocal ? (match.resultado_rival ?? null) : (match.resultado_propio ?? null);
            const homeColor = isLocal ? (match.equipo?.color || '#22c55e') : '#94a3b8';
            const awayColor = isLocal ? '#94a3b8' : (match.equipo?.color || '#22c55e');

            const resolvedRivalShield = findRivalShield(match.rival_nombre, ffcvMatches, ffcvStandings);
            const homeShieldUrl = isLocal 
              ? "/apple-icon.png" 
              : (ffcvMatch?.home_shield_url ? normalizeImageUrl(ffcvMatch.home_shield_url) : resolvedRivalShield);
            const awayShieldUrl = !isLocal 
              ? "/apple-icon.png" 
              : (ffcvMatch?.away_shield_url ? normalizeImageUrl(ffcvMatch.away_shield_url) : resolvedRivalShield);

            const hasInternalScore = internalHomeScore !== null && internalAwayScore !== null && match.estado !== 'Programado';
            const hasFfcvScore = ffcvMatch && ffcvMatch.status === 'played' && ffcvMatch.home_score !== null && ffcvMatch.away_score !== null;

            let displayHomeScore = internalHomeScore;
            let displayAwayScore = internalAwayScore;
            let scoreBadge: React.ReactNode = null;

            if (hasInternalScore && hasFfcvScore) {
              const isMatchEqual = internalHomeScore === ffcvMatch.home_score && internalAwayScore === ffcvMatch.away_score;
              if (isMatchEqual) {
                scoreBadge = (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Oficial FFCV
                  </span>
                );
              } else {
                scoreBadge = (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1" title={`Discrepancia: Interno (${internalHomeScore}-${internalAwayScore}) vs FFCV (${ffcvMatch.home_score}-${ffcvMatch.away_score})`}>
                    ⚠️ FFCV: {ffcvMatch.home_score}-{ffcvMatch.away_score}
                  </span>
                );
              }
            } else if (!hasInternalScore && hasFfcvScore) {
              displayHomeScore = ffcvMatch.home_score;
              displayAwayScore = ffcvMatch.away_score;
              scoreBadge = (
                <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1">
                  Oficial FFCV
                </span>
              );
            }

            const showScore = hasInternalScore || hasFfcvScore;

            // Extraer codacta para ver si hay acta oficial FFCV disponible
            let codacta = ffcvMatch?.codacta || null;
            if (!codacta && match.acta_oficial_url) {
              const matchExtract = match.acta_oficial_url.match(/CodPartido=(\d+)/);
              if (matchExtract) codacta = matchExtract[1];
            }

            return (
              <div 
                key={match.id}
                onClick={() => handleOpenReport(match, ffcvMatch)}
                className="flex flex-col rounded-2xl bg-white shadow-xs ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-indigo-500 group cursor-pointer relative overflow-hidden"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Fila superior: Estado y Fecha / Hora */}
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        match.estado === 'Finalizado' || (!hasInternalScore && hasFfcvScore)
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : match.estado === 'En Curso'
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {(match.estado === 'Descanso' || (match.first_half_duration_seconds !== null && match.live_timer_elapsed_seconds === match.first_half_duration_seconds && !match.live_timer_started_at)) ? 'Descanso' : (match.estado === 'Programado' && hasFfcvScore ? 'Finalizado' : match.estado)}
                      </div>

                      {isDifferentTeam && (
                        <div className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          {currentMatchTeamName}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="capitalize">{new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="text-slate-300">•</span>
                      <span>{new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h</span>
                    </div>
                  </div>
                  
                  {/* Marcador Central con Escudos */}
                  <div className="flex justify-between items-center py-4 gap-2">
                    {/* Equipo Local */}
                    <div className="flex flex-col items-center flex-1 text-center min-w-0">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-xs border border-slate-200 p-1.5 shrink-0 overflow-hidden">
                        {homeShieldUrl ? (
                          <img src={homeShieldUrl} alt={homeTeamName} className="w-full h-full object-contain drop-shadow-xs" onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }} />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: homeColor }} />
                        )}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.25rem]">{homeTeamName}</span>
                    </div>
                    
                    {/* Marcador o VS */}
                    <div className="px-2 sm:px-4 flex flex-col items-center justify-center shrink-0">
                      {!showScore ? (
                        <span className="text-slate-300 font-black text-xl italic">VS</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${(displayHomeScore ?? 0) > (displayAwayScore ?? 0) ? "text-emerald-600" : "text-slate-700"}`}>{displayHomeScore}</span>
                            <span className="text-slate-300 font-bold">-</span>
                            <span className={`text-2xl font-black ${(displayAwayScore ?? 0) > (displayHomeScore ?? 0) ? "text-emerald-600" : "text-slate-700"}`}>{displayAwayScore}</span>
                          </div>
                          {scoreBadge}
                        </div>
                      )}
                    </div>

                    {/* Equipo Visitante */}
                    <div className="flex flex-col items-center flex-1 text-center min-w-0">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2 shadow-xs border border-slate-200 p-1.5 shrink-0 overflow-hidden">
                        {awayShieldUrl ? (
                          <img src={awayShieldUrl} alt={awayTeamName} className="w-full h-full object-contain drop-shadow-xs" onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }} />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: awayColor }} />
                        )}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[2.25rem]">{awayTeamName}</span>
                    </div>
                  </div>

                  {/* Metadatos del partido: Lugar y Competición */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[130px] font-semibold text-slate-700">
                          {match.lugar ? (match.lugar === 'Local' ? 'Campo Propio (Local)' : 'Visitante') : 'Visitante'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-700">{match.competicion_nombre || 'LIGA FFCV'}</span>
                      </div>
                    </div>

                    {/* Barra de acción: Ver Estadísticas abre el Acta FFCV */}
                    <div className="flex items-center justify-between pt-1">
                      {codacta ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReport(match, ffcvMatch);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Acta FFCV</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReport(match, ffcvMatch);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform ml-auto"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Ver Estadísticas</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ACTA OFICIAL FFCV */}
      {viewingFfcvActa && (
        <FFCVActaModal
          codacta={viewingFfcvActa.codacta}
          matchId={viewingFfcvActa.matchId}
          teamId={viewingFfcvActa.teamId}
          homeTeamName={viewingFfcvActa.homeTeamName}
          awayTeamName={viewingFfcvActa.awayTeamName}
          onClose={() => setViewingFfcvActa(null)}
        />
      )}
    </div>
  );
}

