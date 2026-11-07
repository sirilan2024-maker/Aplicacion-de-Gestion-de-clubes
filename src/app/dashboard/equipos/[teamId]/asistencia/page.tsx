"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Stethoscope, Loader2, Calendar as CalendarIcon, ArrowLeft, BarChart2, ListChecks, ChevronDown, ChevronUp, Save, Clock, AlertTriangle, Download, FileDown, ChevronLeft, ChevronRight, FileSpreadsheet, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { exportTeamAttendancePdfAction, exportPlayerAttendancePdfAction } from "@/app/actions/attendance-report-actions";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
  avatar_url?: string | null;
}

interface PastEvent {
  id: string;
  title: string;
  date: string;
  event_type?: string;
}

interface AttendanceRecord {
  player_id: string;
  event_id: string | null;
  date: string;
  status: string;
  notes?: string | null;
}

// Funciones de formateo de fechas legibles en español peninsular
function formatSpanishSessionDateLong(dateStr: string) {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
    const formattedDate = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay}, ${formattedDate}`;
  } catch {
    return dateStr;
  }
}

function formatSpanishSessionDateShort(dateStr: string) {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
    return `${capitalizedDay} ${formattedDate}`;
  } catch {
    return dateStr;
  }
}

export default function AsistenciaEquipoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';
  
  const queryEventId = searchParams.get('eventId');
  const queryDate = searchParams.get('date');

  // --- STATE ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [summaryData, setSummaryData] = useState<AttendanceRecord[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'todos' | 'entrenamientos' | 'partidos'>('todos');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [teamCategory, setTeamCategory] = useState<string>('');

  // Buscador de jugadores en vista móvil
  const [mobileSearchQuery, setMobileSearchQuery] = useState<string>('');

  // Mobile session pagination state (5 sesiones por página en móvil)
  const [mobilePage, setMobilePage] = useState<number>(0);

  // Estados de exportación de informes (PDF y CSV)
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportPeriod, setExportPeriod] = useState<'temporada' | 'mes'>('temporada');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isExportingTeam, setIsExportingTeam] = useState<boolean>(false);
  const [isExportingPlayer, setIsExportingPlayer] = useState<Record<string, boolean>>({});

  // Refs y estados para sincronizar la doble barra de scroll (arriba y abajo) en PC
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollContentWidth, setScrollContentWidth] = useState<number>(0);
  const isSyncingTopRef = React.useRef<boolean>(false);
  const isSyncingTableRef = React.useRef<boolean>(false);

  const handleTopScroll = () => {
    if (isSyncingTopRef.current) {
      isSyncingTopRef.current = false;
      return;
    }
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingTableRef.current = true;
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (isSyncingTableRef.current) {
      isSyncingTableRef.current = false;
      return;
    }
    if (topScrollRef.current && tableScrollRef.current) {
      isSyncingTopRef.current = true;
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  // Single event recording state
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [singleEventAttendance, setSingleEventAttendance] = useState<Record<string, string>>({});
  const [singleEventNotes, setSingleEventNotes] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  // Modal para Justificación con motivo
  const [justifyingPlayer, setJustifyingPlayer] = useState<Player | null>(null);
  const [justifiedCategory, setJustifiedCategory] = useState<string>("Enfermedad");
  const [justifiedDetail, setJustifiedDetail] = useState<string>("");

  useEffect(() => {
    fetchPlayers();
    if (queryEventId) {
      fetchSingleEventDetails();
    } else {
      fetchSummaryData();
    }
  }, [teamId, queryEventId, queryDate]);

  const downloadBase64Pdf = (base64: string, fileName: string) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("Error al procesar el archivo PDF descargado");
    }
  };

  const fetchPlayers = async () => {
    if (!teamId) return;
    const supabase = createClient();
    try {
      // 1. Get team season or fallback to active season
      const { data: activeSeason } = await supabase.from('seasons').select('id').eq('is_active', true).limit(1).maybeSingle();
      const { data: teamData } = await supabase.from('teams').select('name, category, season_id').eq('id', teamId).single();
      if (teamData?.name) setTeamName(teamData.name);
      if (teamData?.category) setTeamCategory(teamData.category);
      let targetSeasonId = activeSeason?.id || (teamData?.season_id !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c' ? teamData?.season_id : null);

      if (!targetSeasonId) return;
      setActiveSeasonId(targetSeasonId);

      // 3. Fetch players via player_season_history (solo jugadores activos en la temporada activa)
      const { data: playersData, error } = await supabase
        .from("player_season_history")
        .select(`
          player_id,
          status,
          players (
            id, first_name, last_name, dorsal, avatar_url, status
          )
        `)
        .eq("team_id", teamId)
        .eq("season_id", targetSeasonId);

      if (error) throw error;
      
      const mappedPlayers = (playersData || [])
        .filter((history: any) => {
          const hStatus = history.status?.toLowerCase();
          const pStatus = history.players?.status?.toLowerCase();
          const isHistoryActive = !hStatus || hStatus === 'active' || hStatus === 'activo';
          const isPlayerActive = pStatus === 'active' || pStatus === 'activo';
          return isHistoryActive && isPlayerActive;
        })
        .map((history: any) => ({
          id: history.players.id,
          first_name: history.players.first_name,
          last_name: history.players.last_name,
          dorsal: history.players.dorsal,
          avatar_url: history.players.avatar_url
        })).sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''));

      setPlayers(mappedPlayers);
    } catch (err: any) {
      toast.error("Error al cargar jugadores: " + err.message);
    }
  };

  const fetchSummaryData = async () => {
    if (!teamId) return;
    setLoadingSummary(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Obtener la temporada del equipo o activa
      const { data: teamData } = await supabase.from('teams').select('name, category, season_id').eq('id', teamId).single();
      if (teamData?.name) setTeamName(teamData.name);
      if (teamData?.category) setTeamCategory(teamData.category);
      const teamSeasonId = teamData?.season_id;

      // 2. Cargar eventos de team_events (entrenamientos y sesiones, excluyendo partidos)
      let eventsQuery = supabase
        .from('team_events')
        .select('id, title, date, event_type')
        .eq('team_id', teamId)
        .neq('event_type', 'Partido')
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(50);

      if (teamSeasonId && teamSeasonId !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c') {
        eventsQuery = eventsQuery.eq('season_id', teamSeasonId);
      } else {
        eventsQuery = eventsQuery.neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');
      }

      const { data: evs, error: err1 } = await eventsQuery;
      if (err1) throw err1;

      // 3. Cargar partidos oficiales jugados (partidos)
      let matchesQuery = supabase
        .from('partidos')
        .select('id, rival_nombre, fecha_hora')
        .eq('equipo_id', teamId)
        .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
        .lte('fecha_hora', `${today}T23:59:59`)
        .order('fecha_hora', { ascending: false })
        .limit(30);

      if (teamSeasonId && teamSeasonId !== '584f508a-fc1a-4339-b5b2-4296ffde2f4c') {
        matchesQuery = matchesQuery.eq('season_id', teamSeasonId);
      }

      const { data: pastMatches } = await matchesQuery;

      // Fusionar eventos pasados evitando duplicados de fecha/id
      const allPastEventsMap = new Map<string, PastEvent>();

      (evs || []).forEach(e => {
        allPastEventsMap.set(e.id, {
          id: e.id,
          title: e.title,
          date: e.date,
          event_type: e.event_type || 'Sesión'
        });
      });

      (pastMatches || []).forEach(m => {
        const dStr = m.fecha_hora ? m.fecha_hora.split('T')[0] : today;
        if (!allPastEventsMap.has(m.id)) {
          allPastEventsMap.set(m.id, {
            id: m.id,
            title: `Jornada vs ${m.rival_nombre || 'Rival'}`,
            date: dStr,
            event_type: 'Partido'
          });
        }
      });

      const combinedPastEvents = Array.from(allPastEventsMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-40); // Hasta los últimos 40 eventos pasados de la temporada activa

      const combinedEventIds = combinedPastEvents.map(e => e.id);

      // 4. Cargar asistencias de la tabla attendance
      const { data: atts, error: err2 } = await supabase
        .from('attendance')
        .select('player_id, event_id, date, status, notes')
        .in('event_id', combinedEventIds.length > 0 ? combinedEventIds : ['none']);
        
      if (err2) throw err2;

      // 5. Cargar convocatorias de los partidos incluidos para incorporar automáticamente
      // a jugadores que hayan jugado o asistido al partido según acta oficial
      const matchIds = combinedPastEvents.filter(e => e.event_type === 'Partido').map(e => e.id);
      let convocatoriasAtts: AttendanceRecord[] = [];

      if (matchIds.length > 0) {
        const { data: matchConvs } = await supabase
          .from('convocatorias')
          .select('partido_id, player_id, titular, minutes_played, minutos_jugados, estado_asistencia, status')
          .in('partido_id', matchIds);

        if (matchConvs) {
          matchConvs.forEach(conv => {
            const ev = combinedPastEvents.find(e => e.id === conv.partido_id);
            const dateStr = ev ? ev.date : today;

            // Determinar si jugó / asistió según el acta o convocatoria:
            // - Si tiene minutos jugados > 0
            // - Si fue titular
            // - Si su estado_asistencia es Confirmado o Presente
            // - Si su status es 'convocado' y no 'lesionado'/'ausente'/'no_convocado'
            const minPlayed = Number(conv.minutes_played || conv.minutos_jugados || 0);
            const isConfirmed = conv.estado_asistencia === 'Confirmado' || conv.estado_asistencia === 'Presente';
            const isInjured = conv.status === 'lesionado' || conv.estado_asistencia === 'Justificado' || conv.estado_asistencia === 'Justificada';
            const isAbsent = conv.estado_asistencia === 'Ausente' || conv.status === 'ausente';
            const isNotCalled = conv.status === 'no_convocado' || conv.status === 'desconvocado';

            let deducedStatus: string | null = null;
            if (isNotCalled) {
              deducedStatus = 'not_called';
            } else if (isAbsent) {
              deducedStatus = 'absent';
            } else if (isInjured) {
              deducedStatus = 'excused';
            } else if (minPlayed > 0 || conv.titular || isConfirmed || conv.status === 'convocado') {
              deducedStatus = 'present';
            }

            if (deducedStatus) {
              convocatoriasAtts.push({
                player_id: conv.player_id,
                event_id: conv.partido_id,
                date: dateStr,
                status: deducedStatus
              });
            }
          });
        }
      }

      // Fusionar attendance explícita con la derivada de convocatorias/actas (attendance manual tiene precedencia)
      const mergedAttendanceMap = new Map<string, AttendanceRecord>();
      convocatoriasAtts.forEach(a => {
        mergedAttendanceMap.set(`${a.player_id}_${a.event_id}`, a);
      });
      (atts || []).forEach(a => {
        mergedAttendanceMap.set(`${a.player_id}_${a.event_id}`, a);
      });

      setPastEvents(combinedPastEvents);
      setSummaryData(Array.from(mergedAttendanceMap.values()));
    } catch (err: any) {
      toast.error("Error al cargar resumen: " + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSingleEventDetails = async () => {
    if (!queryEventId) return;
    setLoadingEvent(true);
    const supabase = createClient();
    try {
      // 1. Fetch Event info
      const { data: ev, error: evError } = await supabase
        .from('team_events')
        .select('*')
        .eq('id', queryEventId)
        .maybeSingle();
      
      if (evError) throw evError;
      
      let finalEvent = ev;

      // Si no encontramos un evento en team_events, puede que sea un Partido.
      // Creamos un evento "sombra" en team_events para poder usar la misma tabla de attendance.
      if (!finalEvent) {
        const { data: pEv } = await supabase.from('partidos').select('*').eq('id', queryEventId).maybeSingle();
        if (pEv) {
           const { data: newEv, error: insertError } = await supabase
             .from('team_events')
             .insert({
                id: pEv.id,
                team_id: pEv.equipo_id,
                event_type: 'Partido',
                title: `Jornada vs ${pEv.rival_nombre || 'Rival'}`,
                date: pEv.fecha_hora ? pEv.fecha_hora.split('T')[0] : new Date().toISOString().split('T')[0],
                start_time: pEv.fecha_hora ? pEv.fecha_hora.split('T')[1].substring(0, 5) : '00:00'
             })
             .select()
             .single();
             
           if (newEv) {
             finalEvent = newEv;
           } else if (insertError) {
             // If we failed to insert, maybe it was just inserted by another concurrent request, try fetching again
             const { data: retryEv } = await supabase.from('team_events').select('*').eq('id', queryEventId).maybeSingle();
             if (retryEv) finalEvent = retryEv;
           }
        }
      }

      if (!finalEvent) {
        toast.error("El evento no se encuentra.");
        setLoadingEvent(false);
        return;
      }
      
      setEventDetails(finalEvent);

      // 2. Fetch existing attendance records
      const { data: atts, error: attError } = await supabase
        .from('attendance')
        .select('player_id, status, notes')
        .eq('event_id', queryEventId);

      if (attError) throw attError;

      const attMap: Record<string, string> = {};
      const notesMap: Record<string, string> = {};

      // Si es un partido, pre-poblar con datos de la convocatoria/acta
      const { data: matchConvs } = await supabase
        .from('convocatorias')
        .select('player_id, titular, minutes_played, minutos_jugados, estado_asistencia, status')
        .eq('partido_id', queryEventId);

      if (matchConvs) {
        matchConvs.forEach(conv => {
          const minPlayed = Number(conv.minutes_played || conv.minutos_jugados || 0);
          const isConfirmed = conv.estado_asistencia === 'Confirmado' || conv.estado_asistencia === 'Presente';
          const isInjured = conv.status === 'lesionado' || conv.estado_asistencia === 'Justificado';
          const isAbsent = conv.estado_asistencia === 'Ausente' || conv.status === 'ausente';
          const isNotCalled = conv.status === 'no_convocado' || conv.status === 'desconvocado';

          if (minPlayed > 0 || conv.titular || isConfirmed || conv.status === 'convocado') {
            attMap[conv.player_id] = 'present';
          } else if (isInjured) {
            attMap[conv.player_id] = 'excused';
          } else if (isAbsent) {
            attMap[conv.player_id] = 'absent';
          } else if (isNotCalled) {
            attMap[conv.player_id] = 'not_called';
          }
        });
      }

      // La tabla attendance explícita sobrescribe los datos deducidos
      if (atts) {
        atts.forEach(a => {
          let s = a.status;
          const low = (s || '').toLowerCase();
          if (['justificado', 'justificada', 'justified', 'excused', 'lesionado', 'permiso', 'enfermedad'].includes(low)) {
            s = 'excused';
          } else if (['presente', 'present'].includes(low)) {
            s = 'present';
          } else if (['ausente', 'absent'].includes(low)) {
            s = 'absent';
          } else if (['retraso', 'late'].includes(low)) {
            s = 'late';
          }
          attMap[a.player_id] = s;
          if (a.notes) notesMap[a.player_id] = a.notes;
        });
      }
      setSingleEventAttendance(attMap);
      setSingleEventNotes(notesMap);
    } catch (err: any) {
      toast.error("Error al cargar detalles del evento: " + err.message);
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleStatusChange = async (playerId: string, status: string, notes?: string) => {
    if (!queryEventId || !queryDate) return;
    
    // Optimistic update
    setSingleEventAttendance(prev => ({ ...prev, [playerId]: status }));
    if (notes !== undefined) {
      setSingleEventNotes(prev => ({ ...prev, [playerId]: notes }));
    }
    setSavingStatus(prev => ({ ...prev, [playerId]: true }));

    const supabase = createClient();
    try {
      const payload: any = {
        session_id: queryEventId,
        event_id: queryEventId,
        player_id: playerId,
        status: status, // 'present', 'absent', 'excused'
        date: queryDate,
        season_id: activeSeasonId
      };
      if (notes !== undefined) {
        payload.notes = notes;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'session_id,player_id' });

      if (error) throw error;
      toast.success("Asistencia guardada correctamente", { id: 'save-toast', duration: 1000 });
    } catch (err: any) {
      toast.error("Error al guardar asistencia: " + err.message);
      // Revert optimistic update
      fetchSingleEventDetails();
    } finally {
      setSavingStatus(prev => ({ ...prev, [playerId]: false }));
    }
  };

  const handleOpenJustifyModal = (player: Player) => {
    setJustifyingPlayer(player);
    const existing = singleEventNotes[player.id] || "";
    if (existing.startsWith("[") && existing.includes("]")) {
      const endBracket = existing.indexOf("]");
      const cat = existing.substring(1, endBracket);
      const detail = existing.substring(endBracket + 1).trim();
      setJustifiedCategory(cat);
      setJustifiedDetail(detail);
    } else {
      setJustifiedCategory("Enfermedad");
      setJustifiedDetail(existing);
    }
  };

  const handleConfirmJustification = async () => {
    if (!justifyingPlayer) return;
    const finalNote = justifiedDetail.trim() 
      ? `[${justifiedCategory}] ${justifiedDetail.trim()}`
      : `[${justifiedCategory}]`;
    const pid = justifyingPlayer.id;
    setJustifyingPlayer(null);
    await handleStatusChange(pid, 'excused', finalNote);
  };

  const getPlayerPercentage = (playerId: string, eventsToUse: PastEvent[]) => {
    if (eventsToUse.length === 0) return { pct: 0, faltas: 0, justificadas: 0 };
    
    // Filtrar los eventos computables para este jugador:
    // - Los entrenamientos aplican a todos los jugadores activos del equipo.
    // - Los partidos solo computan si el jugador estuvo convocado (se excluyen partidos donde fue 'no_convocado' o no convocado).
    const applicableEvents = eventsToUse.filter(ev => {
      if (ev.event_type !== 'Partido') return true;
      const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
      if (att && (att.status === 'not_called' || att.status === 'no_convocado')) return false;
      if (!att) return false;
      return true;
    });

    if (applicableEvents.length === 0) return { pct: 100, faltas: 0, justificadas: 0 };

    const presents = summaryData.filter(a => 
      a.player_id === playerId && 
      (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      (
        a.status?.toLowerCase() === 'presente' || 
        a.status?.toLowerCase() === 'present' || 
        a.status?.toLowerCase() === 'retraso' || 
        a.status?.toLowerCase() === 'late' ||
        a.status?.toLowerCase() === 'justificado' ||
        a.status?.toLowerCase() === 'justificada' ||
        a.status?.toLowerCase() === 'justified' ||
        a.status?.toLowerCase() === 'excused' ||
        a.status?.toLowerCase() === 'lesionado' ||
        a.status?.toLowerCase() === 'permiso' ||
        a.status?.toLowerCase() === 'enfermedad'
      )
    ).length;
    
    const absents = summaryData.filter(a => 
      a.player_id === playerId && 
      (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      (a.status?.toLowerCase() === 'ausente' || a.status?.toLowerCase() === 'absent')
    ).length;

    const justificadas = summaryData.filter(a => 
      a.player_id === playerId && 
      (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) &&
      ['lesionado', 'excused', 'justificado', 'justificada', 'justified', 'permiso', 'enfermedad'].includes(a.status?.toLowerCase() || '')
    ).length;
    
    return {
      pct: Math.round((presents / applicableEvents.length) * 100),
      asistencias: presents,
      faltas: absents,
      justificadas
    };
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-400';
    const s = status.toLowerCase();
    if (s === 'presente' || s === 'present') return 'bg-emerald-500 text-white shadow-sm';
    if (s === 'retraso' || s === 'late') return 'bg-orange-500 text-white shadow-sm';
    if (s === 'ausente' || s === 'absent') return 'bg-red-500 text-white shadow-sm';
    if (['lesionado', 'excused', 'justificado', 'justificada', 'justified', 'permiso', 'enfermedad'].includes(s)) return 'bg-amber-500 text-white shadow-sm';
    if (s === 'not_called' || s === 'no_convocado') return 'bg-slate-100 text-slate-400 border border-slate-200';
    return 'bg-gray-100 text-gray-400';
  };

  // --- COMPUTATIONS AND HOOKS FOR SUMMARY GRID ---
  const filteredPastEvents = attendanceFilter === 'todos' 
    ? pastEvents 
    : pastEvents.filter(ev => ev.event_type === (attendanceFilter === 'entrenamientos' ? 'Entrenamiento' : 'Partido'));

  const mobileFilteredPlayers = players.filter(p => {
    if (!mobileSearchQuery.trim()) return true;
    const q = mobileSearchQuery.toLowerCase().trim();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const dorsalStr = p.dorsal ? String(p.dorsal) : '';
    return fullName.includes(q) || dorsalStr.includes(q);
  });

  const MOBILE_PAGE_SIZE = 5;
  const totalMobilePages = Math.max(1, Math.ceil(filteredPastEvents.length / MOBILE_PAGE_SIZE));
  const currentMobilePage = Math.min(mobilePage, totalMobilePages - 1);
  const mobileVisibleEvents = filteredPastEvents.slice(currentMobilePage * MOBILE_PAGE_SIZE, (currentMobilePage + 1) * MOBILE_PAGE_SIZE);

  const unrecordedTrainings = React.useMemo(() => {
    return pastEvents.filter(ev => {
      if (ev.event_type !== 'Entrenamiento') return false;
      const hasAnyAtt = summaryData.some(a => a.event_id === ev.id || a.date === ev.date);
      return !hasAnyAtt;
    });
  }, [pastEvents, summaryData]);

  // Sincronizar el ancho exacto del scroll para la barra horizontal superior en vista PC
  useEffect(() => {
    if (!tableScrollRef.current) return;
    const updateWidth = () => {
      if (tableScrollRef.current) {
        setScrollContentWidth(tableScrollRef.current.scrollWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(tableScrollRef.current);
    return () => ro.disconnect();
  }, [filteredPastEvents, players]);

  // --- RENDERING FOR SINGLE EVENT ---
  if (queryEventId) {
    if (loadingEvent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500 font-medium">Cargando sesión y asistencia...</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Toaster position="bottom-right" />
        
        {/* Navigation header */}
        <button 
          onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Volver a Resumen de Asistencia
        </button>

        {/* Event details card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                <CalendarIcon className="w-3.5 h-3.5" />
                {eventDetails?.event_type || 'Sesión'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{eventDetails?.title || 'Pasar Lista'}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {eventDetails?.date} • {eventDetails?.start_time?.substring(0, 5)} {eventDetails?.end_time ? `- ${eventDetails?.end_time?.substring(0, 5)}` : ''} • {eventDetails?.location || 'Sin ubicación'}
              </p>
            </div>
            
            <button
              onClick={() => router.push(`/dashboard/equipos/${teamId}/calendario`)}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto"
            >
              Ver en Calendario
            </button>
          </div>
        </div>

        {/* Players list to mark attendance */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-slate-700">
            Plantilla del Equipo
          </div>
          
          {players.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay jugadores inscritos en este equipo para la temporada activa.
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {players.map(player => {
                const currentStatus = singleEventAttendance[player.id];
                const isSaving = savingStatus[player.id];
                
                return (
                  <div key={player.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-blue-50/20 transition-colors border-b border-slate-200/80 odd:bg-white even:bg-slate-50/40">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                        ) : (
                          <span className="text-slate-600 font-extrabold text-xs">
                            {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Dorsal cuadrado uniforme */}
                      {player.dorsal ? (
                        <span className="min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                          #{player.dorsal}
                        </span>
                      ) : (
                        <span className="min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                          -
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-gray-900 text-sm sm:text-base leading-snug break-words">{player.first_name} {player.last_name}</p>
                        {currentStatus === 'excused' && singleEventNotes[player.id] && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {(() => {
                              const noteStr = singleEventNotes[player.id];
                              const match = noteStr.match(/^\[(.*?)\]\s*(.*)$/);
                              if (match) {
                                return (
                                  <>
                                    <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                                      {match[1]}
                                    </span>
                                    {match[2] && (
                                      <span className="text-[11px] text-slate-600 italic">
                                        {match[2]}
                                      </span>
                                    )}
                                  </>
                                );
                              }
                              return (
                                <span className="text-[11px] text-amber-800 italic">
                                  {noteStr}
                                </span>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => handleOpenJustifyModal(player)}
                              className="text-[10px] text-amber-700 underline font-semibold hover:text-amber-900 ml-1"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status selectors */}
                    <div className="grid grid-cols-4 sm:flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto gap-1 border border-gray-200/50 shadow-inner">
                      <button
                        onClick={() => handleStatusChange(player.id, 'present')}
                        disabled={isSaving}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50 ${
                          currentStatus === 'present' || currentStatus === 'Presente'
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                      >
                        {isSaving && (currentStatus === 'present' || currentStatus === 'Presente') ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"/> : <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Presente</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(player.id, 'retraso')}
                        disabled={isSaving}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50 ${
                          currentStatus === 'retraso' || currentStatus === 'Retraso'
                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                      >
                        {isSaving && (currentStatus === 'retraso' || currentStatus === 'Retraso') ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"/> : <Clock className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Retraso</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(player.id, 'absent')}
                        disabled={isSaving}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50 ${
                          currentStatus === 'absent' || currentStatus === 'ausente'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                      >
                        {isSaving && (currentStatus === 'absent' || currentStatus === 'ausente') ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"/> : <X className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">Ausente</span>
                      </button>
                      <button
                        onClick={() => handleOpenJustifyModal(player)}
                        disabled={isSaving}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${
                          ['excused', 'justificado', 'justificada', 'justified', 'lesionado'].includes(currentStatus?.toLowerCase() || '')
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-100'
                            : 'text-gray-600 hover:bg-gray-200/60'
                        }`}
                        title="Marcar como justificado e indicar motivo"
                      >
                        {isSaving && ['excused', 'justificado', 'justificada', 'justified', 'lesionado'].includes(currentStatus?.toLowerCase() || '') ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0"/> : <Stethoscope className="w-3.5 h-3.5 shrink-0" />}
                        <span className="sm:hidden truncate">Justif.</span>
                        <span className="hidden sm:inline truncate">Justificado</span>
                      </button>
                    </div>

                    {/* Badge de motivo si está justificado */}
                    {['excused', 'justificado', 'justificada', 'justified', 'lesionado'].includes(currentStatus?.toLowerCase() || '') && singleEventNotes[player.id] && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        <span>💬 Motivo: {singleEventNotes[player.id]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de Justificación de Falta */}
        {justifyingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Justificar Ausencia</h3>
                    <p className="text-xs text-slate-500">{justifyingPlayer.first_name} {justifyingPlayer.last_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setJustifyingPlayer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de categoría de justificación */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motivo principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Enfermedad",
                    "Lesión / Molestia",
                    "Examen / Estudios",
                    "Motivo Familiar",
                    "Viaje",
                    "Otro"
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setJustifiedCategory(cat)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        justifiedCategory === cat
                          ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalle libre opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Detalle o nota adicional (opcional)</label>
                <textarea
                  value={justifiedDetail}
                  onChange={(e) => setJustifiedDetail(e.target.value)}
                  placeholder="Ej: Fiebre alta, acudirá a sesión médica, justificante entregado..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setJustifyingPlayer(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmJustification}
                  className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Justificación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Exportar informe consolidado del equipo a CSV
  const handleDownloadTeamCsv = (period: 'temporada' | 'mes') => {
    try {
      const isMes = period === 'mes';
      const today = new Date();
      const cutoffDate = isMes ? new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;

      const eventsForExport = filteredPastEvents.filter(ev => {
        if (cutoffDate && ev.date < cutoffDate) return false;
        return true;
      });

      const headers = [
        "Dorsal",
        "Jugador",
        "Entrenamientos Asistidos",
        "Total Entrenamientos",
        "Partidos Jugados",
        "Total Partidos Convocado",
        "Faltas Injustificadas",
        "Faltas Justificadas",
        "Retrasos",
        "% Asistencia"
      ];

      const rows = players.map(player => {
        let trPresent = 0;
        let trTotal = 0;
        let mPresent = 0;
        let mTotal = 0;
        let absents = 0;
        let excused = 0;
        let late = 0;

        eventsForExport.forEach(ev => {
          const att = summaryData.find(a => a.player_id === player.id && (a.event_id === ev.id || a.date === ev.date));
          const s = (att?.status || '').toLowerCase();

          if (ev.event_type === 'Partido') {
            if (s === 'not_called' || s === 'no_convocado' || !s) return;
            mTotal++;
            if (s === 'present' || s === 'presente') mPresent++;
            else if (s === 'retraso' || s === 'late') { mPresent++; late++; }
            else if (['excused', 'justificado', 'justificada', 'lesionado'].includes(s)) excused++;
            else if (s === 'absent' || s === 'ausente') absents++;
          } else {
            trTotal++;
            if (s === 'present' || s === 'presente') trPresent++;
            else if (s === 'retraso' || s === 'late') { trPresent++; late++; }
            else if (['excused', 'justificado', 'justificada', 'lesionado'].includes(s)) excused++;
            else if (s === 'absent' || s === 'ausente') absents++;
          }
        });

        const totalApplicable = trTotal + mTotal;
        const pct = totalApplicable > 0 ? Math.round(((trPresent + mPresent + excused) / totalApplicable) * 100) : 100;

        return [
          player.dorsal || '',
          `"${player.last_name || ''}, ${player.first_name || ''}"`,
          trPresent,
          trTotal,
          mPresent,
          mTotal,
          absents,
          excused,
          late,
          `${pct}%`
        ].join(';');
      });

      const csvContent = '\uFEFF' + [
        `"Sporting Saladar - Informe de Asistencia de Equipo"`,
        `"Equipo: ${teamName || 'Equipo'}"`,
        `"Temporada: 2026/2027"`,
        `"Filtro: ${attendanceFilter} | Rango: ${isMes ? 'Ultimos 30 dias' : 'Temporada 26/27'}"`,
        `"Fecha de generacion: ${new Date().toLocaleDateString('es-ES')}"`,
        "",
        headers.join(';'),
        ...rows
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Asistencia_${(teamName || 'Equipo').replace(/[^a-zA-Z0-9_-]/g, '_')}_${isMes ? 'Mes' : '26-27'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Archivo CSV generado correctamente");
      setExportModalOpen(false);
    } catch (err: any) {
      toast.error("Error al exportar CSV: " + err.message);
    }
  };

  // Exportar informe consolidado del equipo a PDF
  const handleDownloadTeamPdf = async (period: 'temporada' | 'mes') => {
    setIsExportingTeam(true);
    try {
      const res = await exportTeamAttendancePdfAction({
        teamId,
        filterType: attendanceFilter,
        dateRange: period,
      });
      if (res.success && res.base64) {
        downloadBase64Pdf(res.base64, res.fileName || `Informe_Asistencia_${teamName || 'Equipo'}.pdf`);
        toast.success("Informe PDF del equipo descargado con éxito");
        setExportModalOpen(false);
      } else {
        toast.error(res.error || "No se pudo generar el informe PDF");
      }
    } catch (err: any) {
      toast.error("Error al generar PDF: " + err.message);
    } finally {
      setIsExportingTeam(false);
    }
  };

  // Exportar informe individual del jugador a PDF
  const handleDownloadPlayerPdf = async (playerId: string) => {
    setIsExportingPlayer(prev => ({ ...prev, [playerId]: true }));
    try {
      const res = await exportPlayerAttendancePdfAction({
        teamId,
        playerId,
        filterType: attendanceFilter,
        dateRange: 'temporada',
      });
      if (res.success && res.base64) {
        downloadBase64Pdf(res.base64, res.fileName || `Informe_Asistencia_Jugador.pdf`);
        toast.success("Informe PDF del jugador descargado con éxito");
      } else {
        toast.error(res.error || "No se pudo generar el informe individual");
      }
    } catch (err: any) {
      toast.error("Error al generar PDF del jugador: " + err.message);
    } finally {
      setIsExportingPlayer(prev => ({ ...prev, [playerId]: false }));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {unrecordedTrainings.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5 sm:mt-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                Sesión sin pasar lista ({unrecordedTrainings.length})
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                El entrenamiento <b>{unrecordedTrainings[unrecordedTrainings.length - 1].title}</b> ({unrecordedTrainings[unrecordedTrainings.length - 1].date}) aún no tiene registrada la asistencia.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const latest = unrecordedTrainings[unrecordedTrainings.length - 1];
              router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${latest.id}&date=${latest.date}`);
            }}
            className="shrink-0 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
          >
            <Check className="w-3.5 h-3.5" /> Pasar Lista Ahora
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Análisis de Asistencia</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Cuadrícula con el historial de eventos. En móvil puedes navegar de 5 en 5 sesiones sin scroll lateral incómodo.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => router.push(`/dashboard/equipos/${teamId}/calendario`)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>Ver Calendario Mes</span>
            </button>
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Informe</span>
            </button>
            <div className="w-full sm:w-auto grid grid-cols-3 sm:flex bg-gray-100 p-1 rounded-2xl sm:rounded-full border border-gray-200 shadow-inner gap-1">
            <button
              onClick={() => { setAttendanceFilter('todos'); setMobilePage(0); }}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-6 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all min-w-0 ${
                attendanceFilter === 'todos' 
                  ? 'bg-white text-slate-800 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Todos</span>
            </button>
            <button
              onClick={() => { setAttendanceFilter('entrenamientos'); setMobilePage(0); }}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-6 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all min-w-0 ${
                attendanceFilter === 'entrenamientos' 
                  ? 'bg-white text-emerald-700 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="sm:hidden truncate">Entrenos</span>
              <span className="hidden sm:inline">Entrenamientos</span>
            </button>
            <button
              onClick={() => { setAttendanceFilter('partidos'); setMobilePage(0); }}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-6 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all min-w-0 ${
                attendanceFilter === 'partidos' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="truncate">Partidos</span>
            </button>
          </div>
        </div>
      </div>
        
        {loadingSummary ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Calculando estadísticas...</p>
          </div>
        ) : filteredPastEvents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No hay eventos pasados para analizar en esta categoría.</p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════════════
                1. VISTA MÓVIL: Lista limpia de jugadores con tabla vertical desplegable
                ══════════════════════════════════════════════════════════════════════════ */}
            <div className="block sm:hidden">
              {/* Buscador de jugadores en móvil */}
              <div className="p-3 bg-slate-50 border-b border-gray-200">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={mobileSearchQuery}
                    onChange={(e) => setMobileSearchQuery(e.target.value)}
                    placeholder="Buscar jugador por nombre o dorsal..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  {mobileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMobileSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista limpia de jugadores con separación nítida */}
              <div className="p-3 bg-slate-100/70 space-y-3">
                {mobileFilteredPlayers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
                    No se encontraron jugadores que coincidan con la búsqueda.
                  </div>
                ) : (
                  mobileFilteredPlayers.map((player) => {
                    const stats = getPlayerPercentage(player.id, filteredPastEvents);
                    const isExpanded = expandedPlayerId === player.id;
                    const playerFullName = [player.first_name, player.last_name].filter(Boolean).join(' ') || (player as any).name || 'Jugador';

                    const pctBadgeColor = stats.pct >= 85
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : stats.pct >= 70
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <div 
                        key={'mob-card-' + player.id} 
                        className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                          isExpanded 
                            ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm' 
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        {/* Cabecera y métricas del jugador cuadradas y alineadas */}
                        <div 
                          onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                          className="p-3.5 cursor-pointer select-none"
                        >
                          {/* Fila 1: Avatar, Dorsal cuadrado fijo, Nombre y % Asistencia con Chevron */}
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                                {player.avatar_url ? (
                                  <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                                ) : (
                                  <span className="text-xs font-black text-slate-600">
                                    {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
                                  </span>
                                )}
                              </div>

                              {/* Dorsal cuadrado con anchura y alineación fija */}
                              {player.dorsal ? (
                                <span className="min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                                  #{player.dorsal}
                                </span>
                              ) : (
                                <span className="min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                                  -
                                </span>
                              )}

                              {/* Nombre del jugador completo (sin puntos suspensivos) */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-black text-slate-900 leading-snug break-words">
                                    {playerFullName}
                                  </span>
                                  {stats.faltas >= 3 && (
                                    <span className="shrink-0 text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase tracking-wider" title="Múltiples faltas">
                                      Alerta
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Porcentaje y Chevron alineados a la derecha */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`px-2.5 py-1 rounded-xl border text-xs font-black shadow-2xs ${pctBadgeColor}`}>
                                {stats.pct}%
                              </div>
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Fila 2: Grid cuadrado simétrico de 3 columnas para Asistencias, Faltas y Justificadas */}
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                            {/* Asistencias */}
                            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-xs font-black text-emerald-900">{stats.asistencias}</span>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase">asist.</span>
                            </div>

                            {/* Faltas */}
                            <div className={`rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs border ${
                              stats.faltas > 0 
                                ? 'bg-red-50/80 border-red-200/80 text-red-900' 
                                : 'bg-slate-50 border-slate-200/70 text-slate-500'
                            }`}>
                              <X className={`w-3.5 h-3.5 shrink-0 ${stats.faltas > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-black">{stats.faltas}</span>
                              <span className="text-[10px] font-bold uppercase">faltas</span>
                            </div>

                            {/* Justificadas */}
                            <div className={`rounded-xl py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-2xs border ${
                              stats.justificadas > 0 
                                ? 'bg-amber-50/80 border-amber-200/80 text-amber-900' 
                                : 'bg-slate-50 border-slate-200/70 text-slate-400'
                            }`}>
                              <Stethoscope className={`w-3.5 h-3.5 shrink-0 ${stats.justificadas > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                              <span className="text-xs font-black">{stats.justificadas}</span>
                              <span className="text-[10px] font-bold uppercase">justif.</span>
                            </div>
                          </div>
                        </div>

                        {/* Panel expandido con tabla vertical completa de todas las sesiones */}
                        {isExpanded && (
                          <div className="border-t border-slate-200/80 bg-slate-50 p-3.5 animate-in fade-in duration-200">
                            <PlayerAttendanceSummary 
                              playerId={player.id} 
                              events={filteredPastEvents} 
                              summaryData={summaryData}
                              onDownloadPdf={handleDownloadPlayerPdf}
                              isDownloadingPdf={Boolean(isExportingPlayer[player.id])}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════════
                2. VISTA ESCRITORIO / PC: Tabla completa con doble barra de scroll (arriba y abajo)
                ══════════════════════════════════════════════════════════════════════════ */}
            <div className="hidden sm:flex flex-col w-full">
              {/* Barra de scroll horizontal superior visible en PC */}
              <div 
                ref={topScrollRef} 
                onScroll={handleTopScroll}
                className="w-full overflow-x-auto overflow-y-hidden bg-slate-100/90 border-b border-gray-200 h-3.5"
                style={{ scrollbarWidth: 'thin' }}
                title="Desplazamiento horizontal de sesiones"
              >
                <div style={{ width: scrollContentWidth > 0 ? scrollContentWidth : '100%', height: '1px' }} />
              </div>

            <div 
              ref={tableScrollRef} 
              onScroll={handleTableScroll} 
              className="w-full overflow-x-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 sticky left-0 z-20 font-bold text-gray-700 min-w-[170px] sm:min-w-[270px] w-[170px] sm:w-[270px] shadow-[1px_0_0_0_#e5e7eb] text-xs sm:text-sm">
                    Jugador
                  </th>
                  <th className="hidden sm:table-cell p-3 sm:p-4 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700 w-16 sm:w-20 border-l border-gray-200">
                    Faltas
                  </th>
                  <th className="hidden sm:table-cell p-3 sm:p-4 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700 w-16 sm:w-20 border-l border-gray-200" title="Faltas Justificadas">
                    Justif.
                  </th>
                  <th className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700 min-w-[55px] w-[55px] sm:w-28 border-l border-gray-200 text-xs sm:text-sm">
                    % Total
                  </th>
                  {/* Columnas para Desktop (todas las sesiones) */}
                  {filteredPastEvents.map((ev, i) => (
                    <th 
                      key={'desk-h-' + (ev.id || i)} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${ev.id}&date=${ev.date}`)}
                      className="hidden sm:table-cell p-3 sm:p-4 border-b border-l border-gray-200 bg-gray-50 text-center text-xs font-bold text-gray-600 w-24 cursor-pointer hover:bg-gray-100/80 transition-colors group"
                    >
                      <div className="truncate w-full max-w-[80px] mx-auto text-blue-600 group-hover:underline" title={ev.title}>
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium mt-1">
                        {new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </th>
                  ))}
                  {/* Columnas para Móvil (bloque de 5 sesiones) */}
                  {mobileVisibleEvents.map((ev, i) => (
                    <th 
                      key={'mob-h-' + (ev.id || i)} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${ev.id}&date=${ev.date}`)}
                      className="table-cell sm:hidden p-2 border-b border-l border-gray-200 bg-gray-50 text-center text-[10px] font-bold text-gray-600 w-10 min-w-[40px] cursor-pointer"
                    >
                      <div className="truncate text-blue-600 font-bold" title={ev.title}>
                        {ev.event_type === 'Partido' ? 'Part.' : 'Ent.'}
                      </div>
                      <div className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">
                        {new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {players.map((player) => {
                  const stats = getPlayerPercentage(player.id, filteredPastEvents);
                  const pct = stats.pct;
                  const faltas = stats.faltas;
                  const isExpanded = expandedPlayerId === player.id;
                  const playerFullName = [player.first_name, player.last_name].filter(Boolean).join(' ') || (player as any).name || 'Jugador';
                  
                  return (
                    <Fragment key={player.id}>
                    <tr 
                      onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                      className={`hover:bg-blue-50/30 transition-colors cursor-pointer border-b border-slate-200 ${faltas >= 3 ? 'bg-red-50/15' : 'odd:bg-white even:bg-slate-50/50'} ${isExpanded ? '!bg-blue-50/50' : ''}`}
                    >
                      <td className={`p-3 sm:p-4 font-semibold text-gray-900 sticky left-0 z-10 min-w-[170px] sm:min-w-[270px] w-[170px] sm:w-[270px] border-r border-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] ${
                        isExpanded ? 'bg-blue-50/70' : faltas >= 3 ? 'bg-red-50/20' : 'bg-white'
                      }`}>
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0"/> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0"/>}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt={player.first_name} className="w-full h-full object-cover object-[center_25%]" />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500">
                                {player.first_name?.charAt(0)}{player.last_name?.charAt(0)}
                              </span>
                            )}
                          </div>
                          {player.dorsal ? (
                            <span className="text-[10px] sm:text-xs text-gray-500 font-black w-3.5 sm:w-4 text-right shrink-0">{player.dorsal}</span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 whitespace-normal break-words leading-tight block group-hover:text-blue-600 transition-colors">
                              {playerFullName}
                            </span>
                          </div>
                          {faltas >= 3 && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 shrink-0" title="Múltiples faltas"></div>}
                        </div>
                      </td>
                      
                      <td className="hidden sm:table-cell p-3 sm:p-4 text-center border-l border-gray-100 font-bold text-red-600 bg-red-50/30">
                        {faltas > 0 ? faltas : '-'}
                      </td>

                      <td className="hidden sm:table-cell p-3 sm:p-4 text-center border-l border-gray-100 font-bold text-amber-600 bg-amber-50/30">
                        {stats.justificadas > 0 ? stats.justificadas : '-'}
                      </td>
                      
                      <td className="p-2 sm:p-4 text-center font-black text-gray-900 border-l border-gray-200 bg-gray-50/50 text-xs sm:text-sm min-w-[50px] w-[50px] sm:w-28">
                        {pct}%
                      </td>

                      {/* Celdas para Desktop (todas) */}
                      {filteredPastEvents.map((ev, i) => {
                        const att = summaryData.find(a => a.player_id === player.id && (a.event_id === ev.id || a.date === ev.date));
                        const stat = att?.status;
                        return (
                          <td key={'desk-c-' + (ev.id || i)} className="hidden sm:table-cell p-3 sm:p-4 border-l border-gray-200 text-center">
                            <div 
                              className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center shadow-sm border border-black/5 ${getStatusColor(stat)}`}
                              title={att?.notes ? `${stat || 'Registrado'}: ${att.notes}` : stat || 'Sin registrar'}
                            >
                              {!stat && <span className="text-gray-300">-</span>}
                              {(stat?.toLowerCase() === 'not_called' || stat?.toLowerCase() === 'no_convocado') && <span className="text-xs font-bold text-slate-400" title="No convocado">-</span>}
                              {(stat?.toLowerCase() === 'presente' || stat?.toLowerCase() === 'present') && <Check className="w-4 h-4" />}
                              {(stat?.toLowerCase() === 'retraso' || stat?.toLowerCase() === 'late') && <Clock className="w-4 h-4" />}
                              {(stat?.toLowerCase() === 'ausente' || stat?.toLowerCase() === 'absent') && <X className="w-4 h-4" />}
                              {['lesionado', 'excused', 'justificado', 'justificada', 'justified', 'permiso', 'enfermedad'].includes(stat?.toLowerCase() || '') && <Stethoscope className="w-4 h-4" />}
                            </div>
                          </td>
                        );
                      })}

                      {/* Celdas para Móvil (bloque de 5 sesiones) */}
                      {mobileVisibleEvents.map((ev, i) => {
                        const att = summaryData.find(a => a.player_id === player.id && (a.event_id === ev.id || a.date === ev.date));
                        const stat = att?.status;
                        return (
                          <td key={'mob-c-' + (ev.id || i)} className="table-cell sm:hidden p-1 border-l border-gray-200 text-center w-9 max-w-[38px]">
                            <div 
                              className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center shadow-xs border border-black/5 ${getStatusColor(stat)}`}
                              title={att?.notes ? `${stat || 'Registrado'}: ${att.notes}` : stat || 'Sin registrar'}
                            >
                              {!stat && <span className="text-[10px] text-gray-300">-</span>}
                              {(stat?.toLowerCase() === 'not_called' || stat?.toLowerCase() === 'no_convocado') && <span className="text-[8px] font-bold text-slate-400">-</span>}
                              {(stat?.toLowerCase() === 'presente' || stat?.toLowerCase() === 'present') && <Check className="w-3 h-3" />}
                              {(stat?.toLowerCase() === 'retraso' || stat?.toLowerCase() === 'late') && <Clock className="w-3 h-3" />}
                              {(stat?.toLowerCase() === 'ausente' || stat?.toLowerCase() === 'absent') && <X className="w-3 h-3" />}
                              {['lesionado', 'excused', 'justificado', 'justificada', 'justified', 'permiso', 'enfermedad'].includes(stat?.toLowerCase() || '') && <Stethoscope className="w-3 h-3" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={999} className="p-0 border-b border-blue-100 bg-slate-50/90 shadow-inner">
                          <PlayerAttendanceSummary 
                            playerId={player.id} 
                            events={filteredPastEvents} 
                            summaryData={summaryData}
                            onDownloadPdf={handleDownloadPlayerPdf}
                            isDownloadingPdf={Boolean(isExportingPlayer[player.id])}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Modal de Descarga de Informe de Asistencia del Equipo */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Descargar Informe de Asistencia</h3>
                  <p className="text-xs text-slate-500">{teamName || 'Equipo'} • Sporting Saladar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Formato */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Formato del informe</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    exportFormat === 'pdf'
                      ? 'bg-blue-50/60 border-blue-500 text-blue-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black">Documento PDF</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">Membrete oficial, KPIs y formato para compartir.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    exportFormat === 'csv'
                      ? 'bg-blue-50/60 border-blue-500 text-blue-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black">Archivo Excel / CSV</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">Datos tabulares para hojas de cálculo.</span>
                </button>
              </div>
            </div>

            {/* Selector de Periodo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Rango de fechas</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportPeriod('temporada')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    exportPeriod === 'temporada'
                      ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Toda la Temporada 26/27
                </button>
                <button
                  type="button"
                  onClick={() => setExportPeriod('mes')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    exportPeriod === 'mes'
                      ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Últimos 30 días
                </button>
              </div>
            </div>

            {/* Información del filtro activo */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Filtro de actividades:</span>
              <span className="font-bold text-blue-700 capitalize">{attendanceFilter}</span>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isExportingTeam}
                onClick={() => {
                  if (exportFormat === 'pdf') {
                    handleDownloadTeamPdf(exportPeriod);
                  } else {
                    handleDownloadTeamCsv(exportPeriod);
                  }
                }}
                className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isExportingTeam ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar {exportFormat === 'pdf' ? 'PDF' : 'CSV'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente para mostrar un resumen visual de la asistencia con tabla vertical completa
function PlayerAttendanceSummary({ 
  playerId, 
  events, 
  summaryData,
  onDownloadPdf,
  isDownloadingPdf,
}: { 
  playerId: string;
  events: PastEvent[];
  summaryData: AttendanceRecord[];
  onDownloadPdf?: (playerId: string) => void;
  isDownloadingPdf?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [sessionFilter, setSessionFilter] = useState<'todos' | 'faltas'>('todos');

  if (events.length === 0) return <div className="p-3 text-center text-xs text-slate-500">No hay eventos para mostrar.</div>;

  const applicableEvents = events.filter(ev => {
    if (ev.event_type !== 'Partido') return true;
    const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
    if (att && (att.status === 'not_called' || att.status === 'no_convocado')) return false;
    if (!att) return false;
    return true;
  });

  const totalEvents = applicableEvents.length;
  const isActualPresentStatus = (s?: string) => ['presente', 'present', 'retraso', 'late'].includes(s?.toLowerCase() || '');
  const isAbsentsStatus = (s?: string) => ['ausente', 'absent'].includes(s?.toLowerCase() || '');
  const isExcusedStatus = (s?: string) => ['lesionado', 'excused', 'justificado', 'justificada', 'justified', 'permiso', 'enfermedad'].includes(s?.toLowerCase() || '');

  const presents = summaryData.filter(a => a.player_id === playerId && (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) && isActualPresentStatus(a.status)).length;
  const absents = summaryData.filter(a => a.player_id === playerId && (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) && isAbsentsStatus(a.status)).length;
  const excused = summaryData.filter(a => a.player_id === playerId && (applicableEvents.some(ev => ev.id === a.event_id || ev.date === a.date)) && isExcusedStatus(a.status)).length;

  const pct = totalEvents > 0 ? Math.round(((presents + excused) / totalEvents) * 100) : 100;

  // Lista ordenada cronológicamente (más recientes primero)
  const sortedApplicableEvents = [...applicableEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const absencesList = sortedApplicableEvents.filter(ev => {
    const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
    return att && (isAbsentsStatus(att.status) || isExcusedStatus(att.status));
  });

  const eventsToShow = sessionFilter === 'faltas' ? absencesList : sortedApplicableEvents;

  return (
    <div className="w-full space-y-3">
      {/* Fila compacta de 4 métricas clave */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-center">
          <div className="text-base font-black text-slate-900 leading-tight">{pct}%</div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Total</div>
        </div>

        <div className="bg-white px-2 py-1.5 rounded-xl border border-emerald-100 shadow-2xs text-center">
          <div className="text-base font-black text-emerald-600 leading-tight">{presents}</div>
          <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-tight">Asistencias</div>
        </div>

        <div className="bg-white px-2 py-1.5 rounded-xl border border-red-100 shadow-2xs text-center">
          <div className="text-base font-black text-red-600 leading-tight">{absents}</div>
          <div className="text-[9px] font-bold text-red-700 uppercase tracking-tight">Faltas</div>
        </div>

        <div className="bg-white px-2 py-1.5 rounded-xl border border-amber-100 shadow-2xs text-center">
          <div className="text-base font-black text-amber-600 leading-tight">{excused}</div>
          <div className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">Justificadas</div>
        </div>
      </div>

      {/* Tabla vertical estructurada con todas las fechas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Cabecera con selector de filtro */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-black text-slate-800">
              Historial de Asistencias ({sortedApplicableEvents.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSessionFilter('todos'); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                sessionFilter === 'todos' 
                  ? 'bg-slate-900 text-white shadow-2xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({sortedApplicableEvents.length})
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSessionFilter('faltas'); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                sessionFilter === 'faltas' 
                  ? 'bg-red-600 text-white shadow-2xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Faltas ({absencesList.length})
            </button>
          </div>
        </div>

        {/* Filas estructuradas de sesiones con fecha completa y legible */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {eventsToShow.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-medium">
              {sessionFilter === 'faltas' ? '🎉 Sin faltas registradas' : 'No hay sesiones para mostrar.'}
            </div>
          ) : (
            eventsToShow.map((ev) => {
              const att = summaryData.find(a => a.player_id === playerId && (a.event_id === ev.id || a.date === ev.date));
              const stat = att?.status?.toLowerCase();
              const isPresent = isActualPresentStatus(stat);
              const isAbsent = isAbsentsStatus(stat);
              const isExcused = isExcusedStatus(stat);
              const isLate = stat === 'retraso' || stat === 'late';
              const isNotCalled = stat === 'not_called' || stat === 'no_convocado';

              let statusBadge = (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Sin registrar
                </span>
              );

              if (isLate) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Retraso
                  </span>
                );
              } else if (isPresent) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Presente
                  </span>
                );
              } else if (isAbsent) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <X className="w-3 h-3" /> Falta
                  </span>
                );
              } else if (isExcused) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> Justificada
                  </span>
                );
              } else if (isNotCalled) {
                statusBadge = (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    No convocado
                  </span>
                );
              }

              let noteText = '';
              let noteTag = '';
              if (att?.notes) {
                const match = att.notes.match(/^\[(.*?)\]\s*(.*)$/);
                if (match) {
                  noteTag = match[1];
                  noteText = match[2];
                } else {
                  noteText = att.notes;
                }
              }

              return (
                <div 
                  key={'mob-ev-' + ev.id}
                  className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-900">
                        {formatSpanishSessionDateLong(ev.date)}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                        ev.event_type === 'Partido' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ev.event_type === 'Partido' ? '🏆 Partido' : '⚽ Entreno'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                      {ev.title}
                    </div>

                    {noteTag && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
                        <span className="font-black uppercase">[{noteTag}]</span>
                        {noteText && <span className="italic">{noteText}</span>}
                      </div>
                    )}
                    {noteText && !noteTag && (
                      <div className="mt-0.5 text-[10px] italic text-slate-500">
                        Nota: {noteText}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {statusBadge}
                    {teamId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/equipos/${teamId}/asistencia?eventId=${ev.id}&date=${ev.date}`);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        title="Pasar lista / ver esta sesión"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botón para descargar informe individual del jugador */}
      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">Ficha individual con historial detallado</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownloadPdf?.(playerId);
          }}
          disabled={isDownloadingPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          {isDownloadingPdf ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5" />
              <span>Descargar Informe PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
