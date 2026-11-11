"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Sparkles, Save, CheckCircle2, AlertCircle, Users, Star, BarChart2, 
  FileText, Loader2, Mic, MicOff, Send, MessageSquare, TrendingUp, Shield,
  Plus, Minus, ChevronDown, ChevronUp, LayoutGrid, Table
} from "lucide-react"
import { saveMatchReport, sendMatchSummaryToCoordinatorsAction, updateMatchFullReportBatch } from "@/app/actions/match-actions"
import { generateMatchAIReportAction } from "@/app/actions/match-ai-report-actions"
import { Button } from "@/components/ui/button"
import { MatchFullReportModal } from "./MatchFullReportModal"
import { MatchTrendsModal } from "./MatchTrendsModal"
import { ScorePickerPopover } from "./ScorePickerPopover"
import { StatPickerPopover } from "./StatPickerPopover"
import { PlayerAvatar, getPositionTheme } from "./PlayerAvatar"
import { AttendanceJustificationModal } from "./AttendanceJustificationModal"
import { toast } from "react-hot-toast"

const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

const ATTENDANCE_OPTIONS = [
  { value: 'Presente', label: 'Asiste', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'Ausente', label: 'No Asiste', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { value: 'Justificado', label: 'Justificado', color: 'text-amber-700 bg-amber-50 border-amber-200' }
];

export function PostMatchTab({ 
  matchId, 
  initialData, 
  players = [], 
  convocatorias = [], 
  allMatches = [] 
}: { 
  matchId: string
  initialData?: any
  players?: any[]
  convocatorias?: any[]
  allMatches?: any[] 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFullReportModal, setShowFullReportModal] = useState(() => searchParams.get("action") === "pasar-lista");
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [hasConfirmedAiWarning, setHasConfirmedAiWarning] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);

  // Estado para desplegar u ocultar la evaluación individual de jugadores
  const [isPlayerSectionOpen, setIsPlayerSectionOpen] = useState(true);
  // Estado para alternar entre vista de tarjetas y tabla (en escritorio)
  const [viewModeLayout, setViewModeLayout] = useState<'cards' | 'table'>('cards');
  // Jugador seleccionado para justificar asistencia
  const [justifyingPlayerId, setJustifyingPlayerId] = useState<string | null>(null);

  // 1. Filtrar estrictamente jugadores válidos (aislamiento temporada 25/26, bajas/inactivos y staff)
  const eligiblePlayers = (players || []).filter(p => {
    const sId = p.team?.season_id;
    if (sId === CLOSED_SEASON_ID) return false;

    const st = (p.status || '').toLowerCase().trim();
    if (st.includes('inactiv') || st.includes('baja')) return false;

    const pos = (p.posicion || p.posicion_principal || '').toLowerCase();
    if (pos.includes('entrenador') || pos.includes('delegado') || pos.includes('tecnico') || pos.includes('staff')) return false;

    return true;
  });

  const convocadosSet = new Set(
    (convocatorias || [])
      .filter(c => c.status !== 'no_convocado')
      .map(c => c.player_id)
  );

  const rawList = convocadosSet.size > 0
    ? eligiblePlayers.filter(p => convocadosSet.has(p.id))
    : eligiblePlayers.filter(p => p.team_id === initialData?.equipo_id || p.team?.id === initialData?.equipo_id || !p.team_id);

  // Deduplicación por id y nombre normalizado
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const playerList = rawList.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);

    const normName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normName) {
      if (seenNames.has(normName)) return false;
      seenNames.add(normName);
    }

    return true;
  });

  // Estado de evaluación individual de jugadores
  const [playerReports, setPlayerReports] = useState<Record<string, {
    status: string
    rating: number | null
    actitud: number | null
    goals: number
    assists: number
    yellows: number
    reds: number
    minutes: number
    motive?: string
  }>>(() => {
    const initial: Record<string, any> = {};
    playerList.forEach(p => {
      const conv = convocatorias.find(c => c.player_id === p.id);
      const initialStatus = (conv?.estado_asistencia === 'Ausente' || conv?.estado_asistencia === 'Justificado')
        ? conv.estado_asistencia
        : 'Presente';

      const hasCoachRating = conv?.coach_rating !== null && conv?.coach_rating !== undefined && conv.coach_rating > 0;
      const hasActitud = conv?.actitud !== null && conv?.actitud !== undefined && conv.actitud > 0;

      initial[p.id] = {
        status: initialStatus,
        rating: hasCoachRating ? conv.coach_rating : null,
        actitud: hasActitud ? conv.actitud : null,
        goals: conv?.goals || conv?.goles || 0,
        assists: conv?.assists || conv?.asistencias || 0,
        yellows: conv?.yellow_cards || conv?.tarjetas_amarillas || 0,
        reds: conv?.red_cards || conv?.tarjetas_rojas || 0,
        minutes: conv?.minutes_played || conv?.minutos_jugados || 0,
        motive: conv?.notes || conv?.motivo || ''
      };
    });
    return initial;
  });

  // Manejadores de cambios en jugadores
  const handlePlayerStatusChange = (playerId: string, status: string) => {
    setPlayerReports(prev => {
      const current = prev[playerId] || {
        status: 'Presente',
        rating: null,
        actitud: null,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        minutes: 0,
        motive: ''
      };
      if (status === 'Ausente' || status === 'Justificado') {
        return {
          ...prev,
          [playerId]: {
            ...current,
            status,
            rating: null,
            actitud: null,
            minutes: 0
          }
        };
      }
      return {
        ...prev,
        [playerId]: {
          ...current,
          status: 'Presente'
        }
      };
    });

    if (status === 'Justificado') {
      setJustifyingPlayerId(playerId);
    }
  };

  const handleSaveMotive = (playerId: string, motive: string) => {
    setPlayerReports(prev => {
      const current = prev[playerId];
      if (!current) return prev;
      return {
        ...prev,
        [playerId]: {
          ...current,
          status: 'Justificado',
          motive
        }
      };
    });
  };

  const handlePlayerScoreChange = (playerId: string, field: 'rating' | 'actitud', val: number | null) => {
    setPlayerReports(prev => {
      const current = prev[playerId] || {
        status: 'Presente',
        rating: null,
        actitud: null,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        minutes: 0
      };
      return {
        ...prev,
        [playerId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  const handlePlayerStatSet = (playerId: string, field: 'goals' | 'yellows' | 'reds', val: number) => {
    setPlayerReports(prev => {
      const current = prev[playerId] || {
        status: 'Presente',
        rating: null,
        actitud: null,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        minutes: 0
      };
      return {
        ...prev,
        [playerId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  const handlePlayerMinutesChange = (playerId: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;
    setPlayerReports(prev => {
      const current = prev[playerId] || {
        status: 'Presente',
        rating: null,
        actitud: null,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        minutes: 0
      };
      return {
        ...prev,
        [playerId]: {
          ...current,
          minutes: Math.min(120, num)
        }
      };
    });
  };

  // Cálculo estricto de completitud de la evaluación
  const isPlayerEvaluated = (playerId: string) => {
    const rep = playerReports[playerId];
    if (!rep) return false;
    if (rep.status === 'Ausente' || rep.status === 'Justificado') return true;
    if (rep.status === 'Presente') {
      return rep.rating !== null && rep.rating !== undefined && rep.actitud !== null && rep.actitud !== undefined;
    }
    return false;
  };

  const totalPlayers = playerList.length;
  const pendingPlayers = playerList.filter(p => !isPlayerEvaluated(p.id));
  const evaluatedCount = totalPlayers - pendingPlayers.length;
  const isEvaluationComplete = totalPlayers > 0 ? pendingPlayers.length === 0 : true;

  // Render del estado del jugador
  const renderPlayerStatusPill = (playerId: string) => {
    const rep = playerReports[playerId];
    if (!rep) return null;

    if (rep.status === 'Ausente') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          No Asiste
        </span>
      );
    }

    if (rep.status === 'Justificado') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Justificado
        </span>
      );
    }

    const hasBothScores = rep.rating !== null && rep.rating !== undefined && rep.actitud !== null && rep.actitud !== undefined;

    if (hasBothScores) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Listo
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
        <AlertCircle className="w-3 h-3 text-amber-600" />
        Puntuar
      </span>
    );
  };

  // Campos tácticos del informe del entrenador
  const [rating, setRating] = useState<string>(initialData?.coach_rating?.toString() || "7");
  const [summary, setSummary] = useState(initialData?.coach_summary || "");
  const [positive, setPositive] = useState(initialData?.positive_aspects || "");
  const [improvement, setImprovement] = useState(initialData?.improvement_aspects || "");
  const [attitude, setAttitude] = useState(initialData?.attitude_notes || "");

  const parsedCoachReport = typeof initialData?.coach_report === 'string'
    ? (() => { try { return JSON.parse(initialData.coach_report) } catch { return {} } })()
    : (initialData?.coach_report || {});
  const initialRival = parsedCoachReport?.rival_analysis || {};
  const [rivalSystem, setRivalSystem] = useState(initialRival.system || "");
  const [rivalGoalsDesc, setRivalGoalsDesc] = useState(initialRival.goals_description || "");
  const [rivalKeyPlayers, setRivalKeyPlayers] = useState(initialRival.key_players || "");
  const [rivalNotableData, setRivalNotableData] = useState(initialRival.notable_data || "");

  // Dictado por Voz (SpeechRecognition API)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Tu navegador no soporta el reconocimiento de voz. Usa Chrome, Edge o Safari.");
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.success("🎙️ Escuchando... Habla tu valoración del partido");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          setSummary((prev: string) => (prev ? `${prev.trim()} ${text}` : text));
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsRecording(false);
        toast.error("Error en el reconocimiento de voz");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo iniciar el dictado por voz");
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Dictado finalizado");
    }
  };

  // Guardado unificado: Jugadores (Paso 1) + Informe Táctico (Paso 2)
  const handleSave = () => {
    if (!isEvaluationComplete || pendingPlayers.length > 0) {
      setIsPlayerSectionOpen(true);
      const names = pendingPlayers.slice(0, 3).map(p => `${p.first_name} ${p.last_name}`).join(', ');
      const more = pendingPlayers.length > 3 ? ` y ${pendingPlayers.length - 3} más` : '';
      toast.error(`No se puede guardar el informe: faltan por evaluar ${pendingPlayers.length} jugador(es) convocados (${names}${more}).`, {
        duration: 5000,
        icon: "⚠️"
      });
      return;
    }

    startTransition(async () => {
      // 1. Guardar informe individual de jugadores
      const reportsArray = Object.entries(playerReports).map(([playerId, data]) => ({
        playerId,
        status: data.status,
        rating: data.rating ?? 0,
        actitud: data.actitud ?? 0,
        goals: data.goals ?? 0,
        assists: data.assists ?? 0,
        yellows: data.yellows ?? 0,
        reds: data.reds ?? 0,
        minutes: data.minutes ?? 0,
        motive: data.motive || ''
      }));

      const batchRes = await updateMatchFullReportBatch(
        matchId,
        initialData?.equipo_id || "",
        initialData?.fecha_hora || null,
        reportsArray
      );

      if (!batchRes.success) {
        toast.error(batchRes.error || "Error al guardar las notas de los jugadores.");
        return;
      }

      // 2. Guardar informe táctico del entrenador
      const res = await saveMatchReport(matchId, {
        coach_rating: parseInt(rating),
        coach_summary: summary,
        positive_aspects: positive,
        improvement_aspects: improvement,
        attitude_notes: attitude,
        coach_report: {
          rival_analysis: {
            system: rivalSystem,
            goals_description: rivalGoalsDesc,
            key_players: rivalKeyPlayers,
            notable_data: rivalNotableData
          }
        }
      });

      if (res?.success) {
        setSuccess(true);
        toast.success("¡Informe completo y evaluación de jugadores guardados con éxito!");
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        toast.error(res?.error || "Error al guardar el informe post-partido");
      }
    });
  };

  const handleGenerateAIReport = async () => {
    if (!summary.trim() && !hasConfirmedAiWarning) {
      toast.error("Para que el análisis sea lo más fehaciente posible, el entrenador debe dejar primero su valoración.", {
        duration: 5000,
        icon: "⚠️"
      });
      setHasConfirmedAiWarning(true);
      return;
    }

    setIsAiLoading(true);
    const toastId = toast.loading("Analizando datos del partido y valoraciones tácticas...");
    try {
      const res = await generateMatchAIReportAction(matchId);
      if (res.success && res.data) {
        setRating(res.data.coach_rating.toString());
        if (res.data.coach_summary) {
          setAttitude(res.data.coach_summary);
        } else if (res.data.attitude_notes) {
          setAttitude(res.data.attitude_notes);
        }
        setPositive(res.data.positive_aspects);
        setImprovement(res.data.improvement_aspects);
        toast.success("¡Informe generado con éxito!", { id: toastId });
        setHasConfirmedAiWarning(false);
      } else {
        toast.error(res.error || "No se pudo generar el informe.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con la IA.", { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      
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

      {showTrendsModal && (
        <MatchTrendsModal
          allMatches={allMatches}
          currentMatchId={matchId}
          onClose={() => setShowTrendsModal(false)}
        />
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Informe Técnico del Partido</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Evaluación de jugadores, estadísticas y análisis táctico post-partido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTrendsModal(true)}
            className="px-3.5 py-2.5 border border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Tendencias Multi-Partido
          </button>
          <Button 
            variant="outline" 
            disabled={isAiLoading}
            onClick={handleGenerateAIReport}
            className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-bold cursor-pointer"
          >
            {isAiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-600" />
            )}
            {isAiLoading ? "Generando..." : "Análisis IA"}
          </Button>
        </div>
      </div>

      {/* ── PASO 1: EVALUACIÓN INDIVIDUAL DE JUGADORES (DESPLEGABLE / COLLAPSIBLE) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm transition-all">
        {/* Cabecera Paso 1 (Clicable para desplegar u ocultar) */}
        <div 
          onClick={() => setIsPlayerSectionOpen(!isPlayerSectionOpen)}
          className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-t-2xl cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
              1
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                  Evaluación Individual de Jugadores
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Obligatorio
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">
                Primero marca la asistencia y luego añade nota y actitud para puntuar de 0 a 10 con 1 toque. Los goles y tarjetas se añaden automáticamente desde el acta del partido, revisa si están bien.
              </p>
            </div>
          </div>

          {/* Contador de Estado y Botón Desplegable */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-2xs ${
              isEvaluationComplete && pendingPlayers.length === 0
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              {isEvaluationComplete && pendingPlayers.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              )}
              <span>
                {isEvaluationComplete && pendingPlayers.length === 0
                  ? `Todos evaluados (${evaluatedCount}/${totalPlayers})`
                  : `${evaluatedCount} de ${totalPlayers} evaluados (Faltan ${pendingPlayers.length})`}
              </span>
            </div>

            {/* Selector de Vista en Escritorio */}
            <div className="hidden md:inline-flex p-0.5 bg-slate-200/80 rounded-xl border border-slate-300/60">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewModeLayout('cards'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewModeLayout === 'cards'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Fichas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Fichas</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewModeLayout('table'); }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewModeLayout === 'table'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Tabla"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayerSectionOpen(!isPlayerSectionOpen);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isPlayerSectionOpen ? "Ocultar evaluación de jugadores" : "Ver jugadores a evaluar"}
            >
              <span>{isPlayerSectionOpen ? "Ocultar" : "Ver Jugadores"}</span>
              {isPlayerSectionOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Contenido Desplegable */}
        {isPlayerSectionOpen && (
          <div className="animate-in fade-in duration-200">
            {/* 1. Vista de Fichas (Por defecto y recomendada para Entrenadores en Móvil y Escritorio) */}
            {viewModeLayout === 'cards' ? (
              <div className="p-3 sm:p-5 bg-slate-50/60 rounded-b-2xl pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {playerList.map((player, idx) => {
                    const rep = playerReports[player.id] || { status: 'Presente', rating: null, actitud: null, minutes: 0, goals: 0, assists: 0, yellows: 0, reds: 0, motive: '' };
                    const isPresent = rep.status === 'Presente';
                    const isEvaluated = isPlayerEvaluated(player.id);
                    const isNearBottom = idx >= playerList.length - 2;
                    const conv = convocatorias.find(c => c.player_id === player.id);
                    const posTheme = getPositionTheme(player.posicion || player.posicion_principal);
                    const dorsal = conv?.dorsal ?? player.dorsal;
                    const isTitular = conv?.titular === true || conv?.titular === 1 || String(conv?.titular) === '1';

                    return (
                      <div 
                        key={player.id} 
                        className={`bg-white border rounded-3xl p-4 shadow-sm space-y-3.5 transition-all ${
                          isEvaluated 
                            ? "border-slate-200 hover:border-slate-300 hover:shadow-md" 
                            : "border-amber-300 ring-2 ring-amber-200/50 bg-gradient-to-b from-white to-amber-50/20"
                        }`}
                      >
                        {/* 1. PARTE DE ARRIBA: Avatar en grande a la izquierda + Nombre completo centrado al lado */}
                        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3">
                          <PlayerAvatar
                            player={player}
                            dorsal={dorsal}
                            size="xl"
                            showDorsalBadge={true}
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                                {player.first_name} {player.last_name}
                              </h4>
                              {isTitular && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  Titular
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${posTheme.badgeBg}`}>
                                {posTheme.code} · {posTheme.label}
                              </span>
                              {dorsal !== undefined && dorsal !== null && String(dorsal).trim() !== '' && (
                                <span className="text-xs font-black text-slate-400">
                                  #{dorsal}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. JUSTO DEBAJO: Asistencia (Asiste, No Asiste, Justificado) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Asistencia
                            </span>
                            {rep.status === 'Justificado' && (
                              <button
                                type="button"
                                onClick={() => setJustifyingPlayerId(player.id)}
                                className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer truncate max-w-[200px]"
                                title="Editar motivo de justificación"
                              >
                                <span className="truncate">{rep.motive ? `Motivo: ${rep.motive}` : "+ Añadir motivo"}</span>
                                <span className="text-amber-600 font-bold">✏️</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                            {ATTENDANCE_OPTIONS.map(opt => {
                              const isSelected = rep.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handlePlayerStatusChange(player.id, opt.value)}
                                  className={`py-2 px-1 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? opt.value === 'Presente'
                                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                                        : opt.value === 'Ausente'
                                        ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                                        : 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-300'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. JUSTO DEBAJO: Minutos, Nota, Actitud */}
                        <div className="p-3 bg-slate-50/80 border border-slate-150 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Rendimiento y Minutos
                            </span>
                            <div>
                              {renderPlayerStatusPill(player.id)}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {/* Minutos */}
                            <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">⏱️ Minutos</span>
                              <input
                                type="number"
                                min="0"
                                max="120"
                                disabled={!isPresent}
                                value={rep.minutes || ''}
                                onChange={(e) => handlePlayerMinutesChange(player.id, e.target.value)}
                                placeholder="0"
                                className="w-14 h-8 text-center text-sm font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-30 disabled:bg-slate-100"
                              />
                            </div>

                            {/* Nota */}
                            <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">⭐ Nota</span>
                              <ScorePickerPopover
                                value={rep.rating}
                                onChange={(val) => handlePlayerScoreChange(player.id, 'rating', val)}
                                label="Nota"
                                disabled={!isPresent}
                                forceUpwards={isNearBottom}
                                size="md"
                              />
                            </div>

                            {/* Actitud */}
                            <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">🔥 Actitud</span>
                              <ScorePickerPopover
                                value={rep.actitud}
                                onChange={(val) => handlePlayerScoreChange(player.id, 'actitud', val)}
                                label="Actitud"
                                disabled={!isPresent}
                                forceUpwards={isNearBottom}
                                size="md"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 4. JUSTO DEBAJO: Goles, Amarillas, Roja */}
                        <div className="p-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 border border-slate-150 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Estadísticas Oficiales (Acta)
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">1 toque</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Goles */}
                            <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                              <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">⚽ Goles</span>
                              <StatPickerPopover
                                value={rep.goals}
                                onChange={(val) => handlePlayerStatSet(player.id, 'goals', val)}
                                type="goals"
                                disabled={!isPresent}
                                forceUpwards={isNearBottom}
                              />
                            </div>

                            {/* Amarillas */}
                            <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                              <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">🟨 Amar.</span>
                              <StatPickerPopover
                                value={rep.yellows}
                                onChange={(val) => handlePlayerStatSet(player.id, 'yellows', val)}
                                type="yellows"
                                disabled={!isPresent}
                                forceUpwards={isNearBottom}
                              />
                            </div>

                            {/* Rojas */}
                            <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-2xs">
                              <span className="text-[10px] font-black text-slate-700 mb-1 flex items-center gap-1">🟥 Roja</span>
                              <StatPickerPopover
                                value={rep.reds}
                                onChange={(val) => handlePlayerStatSet(player.id, 'reds', val)}
                                type="reds"
                                disabled={!isPresent}
                                forceUpwards={isNearBottom}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 2. Vista de Tabla (Alternativa en Escritorio) */
              <div className="p-3 sm:p-5 bg-slate-50/40 rounded-b-2xl pb-6 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3 min-w-[170px]">Jugador</th>
                      <th className="py-3 px-2 text-center w-28">Asistencia</th>
                      <th className="py-3 px-1 text-center w-12">Min.</th>
                      <th className="py-3 px-1 text-center w-12">Nota</th>
                      <th className="py-3 px-1 text-center w-12">Actitud</th>
                      <th className="py-3 px-1 text-center w-14">⚽ Goles</th>
                      <th className="py-3 px-1 text-center w-14">🟨 Amar.</th>
                      <th className="py-3 px-1 text-center w-14">🟥 Roja</th>
                      <th className="py-3 px-2 text-center w-20">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {playerList.map((player, idx) => {
                      const rep = playerReports[player.id] || { status: 'Presente', rating: null, actitud: null, minutes: 0, goals: 0, assists: 0, yellows: 0, reds: 0, motive: '' };
                      const isPresent = rep.status === 'Presente';
                      const isNearBottom = idx >= playerList.length - 2;
                      const conv = convocatorias.find(c => c.player_id === player.id);
                      const posTheme = getPositionTheme(player.posicion || player.posicion_principal);
                      const dorsal = conv?.dorsal ?? player.dorsal;
                      const isTitular = conv?.titular === true || conv?.titular === 1 || String(conv?.titular) === '1';

                      return (
                        <tr key={player.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Jugador con Avatar Profesional y Demarcación */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <PlayerAvatar
                                player={player}
                                dorsal={dorsal}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-black text-slate-900 leading-tight truncate">
                                    {player.first_name} {player.last_name}
                                  </p>
                                  {isTitular && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200" title="Titular según acta">
                                      TIT
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${posTheme.badgeBg}`}>
                                    {posTheme.code} · {posTheme.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Asistencia */}
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                              {ATTENDANCE_OPTIONS.map(opt => {
                                const isSelected = rep.status === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handlePlayerStatusChange(player.id, opt.value)}
                                    className={`text-[9px] font-extrabold px-1.5 py-1 rounded-lg transition-all cursor-pointer ${
                                      isSelected
                                        ? opt.value === 'Presente'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : opt.value === 'Ausente'
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'bg-amber-500 text-white shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                            {rep.status === 'Justificado' && rep.motive && (
                              <button
                                type="button"
                                onClick={() => setJustifyingPlayerId(player.id)}
                                className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 block mx-auto truncate max-w-[120px]"
                                title={rep.motive}
                              >
                                {rep.motive}
                              </button>
                            )}
                          </td>

                          {/* Minutos */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              disabled={!isPresent}
                              value={rep.minutes || ''}
                              onChange={(e) => handlePlayerMinutesChange(player.id, e.target.value)}
                              placeholder="0"
                              className="w-10 h-8 text-center text-xs font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Nota */}
                          <td className="py-2 px-1 text-center">
                            <ScorePickerPopover
                              value={rep.rating}
                              onChange={(val) => handlePlayerScoreChange(player.id, 'rating', val)}
                              label="Nota"
                              disabled={!isPresent}
                              forceUpwards={isNearBottom}
                              size="sm"
                            />
                          </td>

                          {/* Actitud */}
                          <td className="py-2 px-1 text-center">
                            <ScorePickerPopover
                              value={rep.actitud}
                              onChange={(val) => handlePlayerScoreChange(player.id, 'actitud', val)}
                              label="Actitud"
                              disabled={!isPresent}
                              forceUpwards={isNearBottom}
                              size="sm"
                            />
                          </td>

                          {/* Goles (1 toque) */}
                          <td className="py-2 px-1 text-center">
                            <StatPickerPopover
                              value={rep.goals}
                              onChange={(val) => handlePlayerStatSet(player.id, 'goals', val)}
                              type="goals"
                              disabled={!isPresent}
                              forceUpwards={isNearBottom}
                            />
                          </td>

                          {/* Amarillas (1 toque) */}
                          <td className="py-2 px-1 text-center">
                            <StatPickerPopover
                              value={rep.yellows}
                              onChange={(val) => handlePlayerStatSet(player.id, 'yellows', val)}
                              type="yellows"
                              disabled={!isPresent}
                              forceUpwards={isNearBottom}
                            />
                          </td>

                          {/* Rojas (1 toque) */}
                          <td className="py-2 px-1 text-center">
                            <StatPickerPopover
                              value={rep.reds}
                              onChange={(val) => handlePlayerStatSet(player.id, 'reds', val)}
                              type="reds"
                              disabled={!isPresent}
                              forceUpwards={isNearBottom}
                            />
                          </td>

                          {/* Estado (Siempre visible en pantalla) */}
                          <td className="py-2 px-2 text-center">
                            {renderPlayerStatusPill(player.id)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {playerList.length === 0 && (
              <div className="text-center py-8 text-sm font-medium text-slate-500">
                No hay jugadores disponibles para evaluar en esta convocatoria.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PASO 2: VALORACIÓN TÁCTICA DEL ENTRENADOR ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
              2
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                Valoración Táctica del Entrenador
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Resumen táctico, aspectos a mejorar y notas del rival.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna Izquierda: Rating y Resumen */}
          <div className="md:col-span-1 space-y-6">
            {/* Selector de Nota Global del Partido (Modal / Popover 0-10 táctil) */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex items-center justify-between">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1">
                  Nota Global del Partido
                </label>
                <p className="text-[11px] text-slate-400 font-medium">
                  Rendimiento del equipo (0 - 10)
                </p>
              </div>
              <ScorePickerPopover
                value={rating ? parseInt(rating) : null}
                onChange={(val) => setRating(val !== null ? val.toString() : "7")}
                label="Nota Partido"
                size="lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">
                  Valoración General del Entrenador
                </label>
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceDictation : startVoiceDictation}
                  className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isRecording 
                      ? "bg-red-500 text-white border-red-600 animate-pulse shadow-md" 
                      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  }`}
                  title={isRecording ? "Detener dictado por voz" : "Dictar valoración por voz"}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecording ? "Grabando..." : "Dictar por Voz"}</span>
                </button>
              </div>
              <textarea 
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Escribe o dicta por voz la opinión táctica y sensaciones del partido..."
                className="w-full h-40 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              {/* Opciones de envío al Coordinador */}
              <div className="mt-3 bg-slate-100/80 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                  Enviar Valoración
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSendingSummary || !summary.trim()}
                    onClick={async () => {
                      if (!summary.trim()) {
                        toast.error("Escribe primero una valoración antes de enviar.");
                        return;
                      }
                      setIsSendingSummary(true);
                      const toastId = toast.loading("Enviando valoración al coordinador...");
                      const res = await sendMatchSummaryToCoordinatorsAction(matchId, summary);
                      setIsSendingSummary(false);
                      if (res.success) {
                        toast.success(res.message || "Valoración enviada correctamente", { id: toastId });
                      } else {
                        toast.error(res.error || "Error al enviar la valoración.", { id: toastId });
                      }
                    }}
                    className="py-2 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>App Interna</span>
                  </button>

                  <button
                    type="button"
                    disabled={!summary.trim()}
                    onClick={async () => {
                      if (!summary.trim()) {
                        toast.error("Escribe primero una valoración antes de enviar.");
                        return;
                      }
                      const text = encodeURIComponent(`📋 *Valoración del Partido*\n\n"${summary.trim()}"`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                      toast.success("Abriendo WhatsApp para compartir la valoración...");
                    }}
                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
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
                  className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-2xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                  className="w-full h-32 resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-2xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-indigo-700 tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> RESUMEN GENERAL DEL PARTIDO
              </label>
              <textarea 
                value={attitude}
                onChange={(e) => setAttitude(e.target.value)}
                placeholder="Resumen general del partido generado por la IA basándose en los datos recabados en vivo y las observaciones del entrenador..."
                className="w-full h-36 resize-none rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 text-sm font-medium text-slate-700 shadow-2xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Bloque Análisis Detallado del Rival */}
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Shield className="w-4 h-4 text-slate-700" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Informe y Datos del Rival
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Completa la información táctica para enriquecer el historial y análisis del equipo rival.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sistema de Juego del Rival
                  </label>
                  <input 
                    type="text"
                    value={rivalSystem}
                    onChange={(e) => setRivalSystem(e.target.value)}
                    placeholder="Ej. 4-3-3 bloque medio, 5-3-2 repliegue intensivo..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jugadores Destacados del Rival
                  </label>
                  <input 
                    type="text"
                    value={rivalKeyPlayers}
                    onChange={(e) => setRivalKeyPlayers(e.target.value)}
                    placeholder="Ej. #10 Mediapunta zurdo muy rápido, #9 fuerte de cabeza..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ¿Cómo fueron los Goles?
                  </label>
                  <textarea 
                    value={rivalGoalsDesc}
                    onChange={(e) => setRivalGoalsDesc(e.target.value)}
                    placeholder="Detalla cómo se produjeron los goles a favor y en contra (balón parado, contragolpe, fallo en salida, centro lateral...)"
                    className="w-full h-20 resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Otros Datos Destacables del Rival
                  </label>
                  <textarea 
                    value={rivalNotableData}
                    onChange={(e) => setRivalNotableData(e.target.value)}
                    placeholder="Puntos débiles a explotar, agresividad, comportamiento arbitral, estado del césped, etc."
                    className="w-full h-20 resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Botón de Guardado con Guardia de Obligatoriedad Estricta ── */}
        <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {!isEvaluationComplete || pendingPlayers.length > 0 ? (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl w-full sm:w-auto">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Para guardar el informe, debes calificar Nota y Actitud de todos los convocados que asisten. <strong>Faltan {pendingPlayers.length} jugador(es) por evaluar.</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Todos los jugadores convocados evaluados correctamente ({evaluatedCount}/{totalPlayers}).
              </span>
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isPending || !isEvaluationComplete || pendingPlayers.length > 0}
            className={`w-full sm:w-auto gap-2 font-bold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer ${
              isEvaluationComplete && pendingPlayers.length === 0
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:scale-[1.02]" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <span className="animate-spin text-xl leading-none">⟳</span>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {success 
              ? "Guardado Correctamente" 
              : isEvaluationComplete && pendingPlayers.length === 0
              ? "Guardar Informe Completo del Partido" 
              : `Faltan ${pendingPlayers.length} jugador(es) por evaluar`}
          </Button>
        </div>
      </div>

      {/* Modal para Añadir Motivo de Justificación */}
      <AttendanceJustificationModal
        isOpen={justifyingPlayerId !== null}
        onClose={() => setJustifyingPlayerId(null)}
        player={
          justifyingPlayerId 
            ? (() => {
                const p = playerList.find(item => item.id === justifyingPlayerId);
                if (!p) return null;
                const conv = convocatorias.find(c => c.player_id === p.id);
                return {
                  ...p,
                  dorsal: conv?.dorsal ?? p.dorsal
                };
              })()
            : null
        }
        currentMotive={justifyingPlayerId ? (playerReports[justifyingPlayerId]?.motive || '') : ''}
        onSaveMotive={(motive) => {
          if (justifyingPlayerId) {
            handleSaveMotive(justifyingPlayerId, motive);
          }
        }}
      />

    </div>
  )
}
