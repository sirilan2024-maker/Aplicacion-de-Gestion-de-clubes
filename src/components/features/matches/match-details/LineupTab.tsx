"use client"

import { useState, useTransition, useEffect, useRef, useMemo } from "react"
import { Users, Save, X, HelpCircle, Plus, Trash2, AlertCircle, RotateCcw, Pencil } from "lucide-react"
import { useUserRole } from "@/hooks/useUserRole"
import { saveLineup, updatePlayerNickname } from "@/app/actions/match-actions"

interface Player {
  id: string
  name: string
  firstName?: string
  lastName?: string
  fullName?: string
  displayNameShort?: string
  nickname?: string | null
  pos: string
  avatar: string
  demarcation: string
  number?: number | string
  avatarUrl?: string | null
}

const INITIAL_PLAYERS: Player[] = []

export const DEFAULT_FORMATIONS: Record<string, { id: string; label: string; x: number; y: number }[]> = {
  "4-3-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 50, y: 55 },
    { id: "slot-6", label: "MC", x: 30, y: 45 },
    { id: "slot-7", label: "MC", x: 70, y: 45 },
    { id: "slot-8", label: "ED", x: 20, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "EI", x: 80, y: 25 }
  ],
  "4-4-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MD", x: 20, y: 45 },
    { id: "slot-6", label: "MC", x: 40, y: 48 },
    { id: "slot-7", label: "MC", x: 60, y: 48 },
    { id: "slot-8", label: "MI", x: 80, y: 45 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ],
  "3-5-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 75 },
    { id: "slot-2", label: "DFC", x: 50, y: 78 },
    { id: "slot-3", label: "DFC", x: 75, y: 75 },
    { id: "slot-4", label: "CAD", x: 15, y: 50 },
    { id: "slot-5", label: "MCD", x: 50, y: 58 },
    { id: "slot-6", label: "MC", x: 35, y: 45 },
    { id: "slot-7", label: "MC", x: 65, y: 45 },
    { id: "slot-8", label: "CAI", x: 85, y: 50 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ],
  "4-2-3-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 75 },
    { id: "slot-3", label: "DFC", x: 62, y: 75 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 38, y: 58 },
    { id: "slot-6", label: "MCD", x: 62, y: 58 },
    { id: "slot-7", label: "MD", x: 20, y: 40 },
    { id: "slot-8", label: "MCO", x: 50, y: 38 },
    { id: "slot-9", label: "MI", x: 80, y: 40 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "3-4-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 75 },
    { id: "slot-2", label: "DFC", x: 50, y: 78 },
    { id: "slot-3", label: "DFC", x: 75, y: 75 },
    { id: "slot-4", label: "MD", x: 15, y: 48 },
    { id: "slot-5", label: "MC", x: 38, y: 50 },
    { id: "slot-6", label: "MC", x: 62, y: 50 },
    { id: "slot-7", label: "MI", x: 85, y: 48 },
    { id: "slot-8", label: "ED", x: 25, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "EI", x: 75, y: 25 }
  ],
  "4-1-4-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 50, y: 58 },
    { id: "slot-6", label: "MD", x: 20, y: 42 },
    { id: "slot-7", label: "MC", x: 40, y: 45 },
    { id: "slot-8", label: "MC", x: 60, y: 45 },
    { id: "slot-9", label: "MI", x: 80, y: 42 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "5-3-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "CAD", x: 10, y: 65 },
    { id: "slot-2", label: "DFC", x: 30, y: 73 },
    { id: "slot-3", label: "DFC", x: 50, y: 75 },
    { id: "slot-4", label: "DFC", x: 70, y: 73 },
    { id: "slot-5", label: "CAI", x: 90, y: 65 },
    { id: "slot-6", label: "MC", x: 35, y: 48 },
    { id: "slot-7", label: "MCD", x: 50, y: 52 },
    { id: "slot-8", label: "MC", x: 65, y: 48 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ]
}


function formatToTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getSingleFirstName(rawFirstName: string): string {
  if (!rawFirstName) return 'Jugador';
  const words = rawFirstName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Jugador';
  if (words.length >= 2 && /^(el|al)$/i.test(words[0])) {
    return formatToTitleCase(`${words[0]} ${words[1]}`);
  }
  return formatToTitleCase(words[0]);
}

function getFirstSurname(rawLastName: string): string {
  if (!rawLastName) return '';
  const parts = rawLastName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length >= 2 && /^(de|del|de\s+la|el|al)$/i.test(parts[0])) {
    return formatToTitleCase(`${parts[0]} ${parts[1]}`);
  }
  return formatToTitleCase(parts[0]);
}

export function LineupTab({ 
  matchId, 
  players = [], 
  convocatorias = [],
  onLineupSaved
}: { 
  matchId?: string
  players?: any[]
  convocatorias?: any[]
  onLineupSaved?: (updatedConvocatorias: any[]) => void
}) {
  const { rol } = useUserRole()
  const [isPending, startTransition] = useTransition()
  
  const buildMappedPlayers = (sourcePlayers: any[]): Player[] => {
    return sourcePlayers.map(p => {
      const rawFirst = (p.first_name || p.nombre || '').trim();
      const rawLast = (p.last_name || p.apellidos || '').trim();
      const customNickname = (p.nickname || p.apodo || '').trim();
      
      let baseFirst = rawFirst;
      let baseLast = rawLast;
      if (!baseFirst && (p.name || p.full_name)) {
        const full = (p.name || p.full_name || '').trim();
        const parts = full.split(/\s+/);
        baseFirst = parts[0] || '';
        baseLast = parts.slice(1).join(' ') || '';
      }

      const singleFirstName = customNickname 
        ? formatToTitleCase(customNickname) 
        : (baseFirst ? getSingleFirstName(baseFirst) : 'Jugador');
      const firstSurname = getFirstSurname(baseLast);
      const displayNameShort = customNickname 
        ? formatToTitleCase(customNickname) 
        : (firstSurname ? `${singleFirstName} ${firstSurname}` : (baseFirst || p.name || 'Jugador'));

      const fullRaw = (p.full_name || p.nombre_completo || p.name || '').trim();
      let fullFormatted = '';
      if (rawFirst || rawLast) {
        fullFormatted = `${formatToTitleCase(rawFirst)} ${formatToTitleCase(rawLast)}`.trim();
      } else if (fullRaw) {
        fullFormatted = formatToTitleCase(fullRaw);
      }
      const fullName = fullFormatted || p.name || displayNameShort;

      const dorsalNum = p.dorsal != null && p.dorsal !== '' 
        ? p.dorsal 
        : (p.number != null && p.number !== '' ? p.number : '-');

      const init1 = (singleFirstName && singleFirstName[0]) || (p.name && p.name[0]) || 'J';
      const init2 = (firstSurname && firstSurname[0]) || '';
      const avatarInitials = `${init1}${init2}`.toUpperCase();

      return {
        id: p.id,
        name: fullName,
        firstName: singleFirstName,
        lastName: baseLast,
        fullName: fullName,
        displayNameShort,
        nickname: customNickname || null,
        pos: p.posicion_principal || p.posicion || "N/A",
        avatar: avatarInitials,
        demarcation: p.posicion || "Jugador",
        number: dorsalNum,
        avatarUrl: p.avatar_url || p.foto_url || p.photo_url || p.foto || null
      };
    });
  };

  const [playersList, setPlayersList] = useState<Player[]>(() => {
    const list = buildMappedPlayers(players);
    return list.length > 0 ? list : INITIAL_PLAYERS;
  });

  useEffect(() => {
    if (players && players.length > 0) {
      setPlayersList(buildMappedPlayers(players));
    }
  }, [players]);

  const initialPlayersList = playersList;

  // Cargar sistemas personalizados guardados en localStorage
  const [customFormations, setCustomFormations] = useState<Record<string, { id: string; label: string; x: number; y: number }[]>>({})
  const [showSaveTacticModal, setShowSaveTacticModal] = useState(false)
  const [newTacticName, setNewTacticName] = useState("")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("custom_lineup_tactics")
      if (saved) {
        setCustomFormations(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Error al cargar tácticas personalizadas:", e)
    }
  }, [])

  const allFormations = { ...DEFAULT_FORMATIONS, ...customFormations }

  // Cargar desde base de datos usando tactical_x y tactical_y si existen
  interface PitchPlayerPosition {
    x: number;
    y: number;
    slotId?: string;
    slotLabel?: string;
  }

  const initialPitchPlayers: Record<string, PitchPlayerPosition> = {};
  
  // Titulares
  const titularesDb = convocatorias.filter(c => c.titular);
  const defaultSlots = DEFAULT_FORMATIONS["4-3-3"];

  if (titularesDb.length > 0 && playersList.length > 0) {
    const assignedSlots = new Set<string>();

    titularesDb.forEach((c, idx) => {
      let matchedSlot: { id: string; label: string; x: number; y: number } | null = null;
      if (c.tactical_x != null && c.tactical_y != null) {
        let minDist = Infinity;
        for (const s of defaultSlots) {
          if (assignedSlots.has(s.id)) continue;
          const dist = Math.hypot(c.tactical_x - s.x, c.tactical_y - s.y);
          if (dist < minDist) {
            minDist = dist;
            matchedSlot = s;
          }
        }
      }

      if (!matchedSlot) {
        matchedSlot = defaultSlots.find(s => !assignedSlots.has(s.id)) || defaultSlots[idx] || null;
      }

      if (matchedSlot) {
        assignedSlots.add(matchedSlot.id);
      }

      initialPitchPlayers[c.player_id] = { 
        x: c.tactical_x != null ? c.tactical_x : (matchedSlot ? matchedSlot.x : 50), 
        y: c.tactical_y != null ? c.tactical_y : (matchedSlot ? matchedSlot.y : 50),
        slotId: matchedSlot?.id,
        slotLabel: matchedSlot?.label
      };
    });
  } else {
    // Si no hay datos, cargar la táctica inicial
    let i = 0;
    for (const p of initialPlayersList) {
      if (i < 11 && defaultSlots[i]) {
        initialPitchPlayers[p.id] = { 
          x: defaultSlots[i].x, 
          y: defaultSlots[i].y,
          slotId: defaultSlots[i].id,
          slotLabel: defaultSlots[i].label
        };
        i++;
      }
    }
  }

  const [tactic, setTactic] = useState<string>("4-3-3")
  const [pitchPlayers, setPitchPlayers] = useState<Record<string, PitchPlayerPosition>>(initialPitchPlayers)
  const [savedAlert, setSavedAlert] = useState(false)
  const [limitWarning, setLimitWarning] = useState<string | null>(null)
  const [contextMenuPlayerId, setContextMenuPlayerId] = useState<string | null>(null);
  const [benchPlayerModalId, setBenchPlayerModalId] = useState<string | null>(null);
  const [showBenchListModal, setShowBenchListModal] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showClearPitchModal, setShowClearPitchModal] = useState(false);
  const [editingNicknamePlayer, setEditingNicknamePlayer] = useState<Player | null>(null);
  const [newNicknameInput, setNewNicknameInput] = useState("");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const currentFormationSlots = useMemo(() => {
    return allFormations[tactic] || DEFAULT_FORMATIONS["4-3-3"] || [];
  }, [allFormations, tactic]);

  // Slots tácticos vacíos en el campo de la formación actual:
  // Solo se muestran las posiciones que NO tengan ya un jugador asignado
  const emptySlots = useMemo(() => {
    const activePlayerCount = Object.keys(pitchPlayers).length;
    if (activePlayerCount >= 11) return [];

    const occupiedSlotIds = new Set<string>();

    // 1. Añadir slotIds explícitos asignados a los jugadores
    Object.values(pitchPlayers).forEach(p => {
      if (p.slotId) {
        occupiedSlotIds.add(p.slotId);
      }
    });

    // 2. Si hay algún jugador sin slotId explícito, asignarlo al slot libre más cercano
    Object.values(pitchPlayers).forEach(p => {
      if (!p.slotId) {
        let closestSlot: { id: string; dist: number } | null = null;
        for (const slot of currentFormationSlots) {
          if (occupiedSlotIds.has(slot.id)) continue;
          const dist = Math.hypot(p.x - slot.x, p.y - slot.y);
          if (!closestSlot || dist < closestSlot.dist) {
            closestSlot = { id: slot.id, dist };
          }
        }
        if (closestSlot) {
          occupiedSlotIds.add(closestSlot.id);
        }
      }
    });

    return currentFormationSlots.filter(slot => !occupiedSlotIds.has(slot.id));
  }, [pitchPlayers, currentFormationSlots]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotId) return null;
    return currentFormationSlots.find(s => s.id === selectedSlotId) || null;
  }, [selectedSlotId, currentFormationSlots]);

  const getCoordsStyle = (x: number, y: number) => {
    if (isDesktop) {
      return {
        left: `${y}%`,
        top: `${100 - x}%`
      };
    }
    return {
      left: `${x}%`,
      top: `${y}%`
    };
  };

  const handleSavePlayerNickname = async () => {
    if (!editingNicknamePlayer) return;
    setIsSavingNickname(true);
    try {
      const trimmed = newNicknameInput.trim();
      const res = await updatePlayerNickname(editingNicknamePlayer.id, trimmed);
      if (res.success) {
        setPlayersList(prev => prev.map(p => {
          if (p.id !== editingNicknamePlayer.id) return p;
          const rawLast = p.lastName || '';
          const singleFirst = trimmed ? formatToTitleCase(trimmed) : getSingleFirstName(p.fullName || p.name);
          const firstSurname = getFirstSurname(rawLast);
          const displayNameShort = trimmed 
            ? formatToTitleCase(trimmed) 
            : (firstSurname ? `${singleFirst} ${firstSurname}` : singleFirst);

          return {
            ...p,
            nickname: trimmed || null,
            firstName: singleFirst,
            displayNameShort,
            name: p.fullName || displayNameShort
          };
        }));
        setEditingNicknamePlayer(null);
      } else {
        alert(res.error || 'Error al guardar el apodo');
      }
    } catch (err: any) {
      console.error('Error saving nickname:', err);
    } finally {
      setIsSavingNickname(false);
    }
  };

  // Mapa de nombres calculados para los jugadores actualmente en el campo:
  // Si hay más de uno con el mismo nombre de pila, se muestra "Nombre + Inicial del Apellido" (ej. "Carlos G." y "Carlos M.")
  // Si no hay duplicados, se muestra solo el nombre de pila ("Carlos")
  const pitchPlayerDisplayNames = useMemo(() => {
    const activePitchIds = Object.keys(pitchPlayers);
    const activePitchPlayers = activePitchIds
      .map(id => playersList.find(p => p.id === id))
      .filter(Boolean) as Player[];

    const firstNameCounts = new Map<string, number>();
    activePitchPlayers.forEach(p => {
      const fn = (p.firstName || '').toLowerCase().trim();
      firstNameCounts.set(fn, (firstNameCounts.get(fn) || 0) + 1);
    });

    const displayMap: Record<string, string> = {};
    activePitchPlayers.forEach(p => {
      const fn = p.firstName || 'Jugador';
      const fnKey = fn.toLowerCase().trim();
      const count = firstNameCounts.get(fnKey) || 0;

      if (count > 1) {
        // Si hay 2 o más jugadores con el mismo nombre en el campo, desambiguamos con inicial del primer apellido
        const firstSurname = getFirstSurname(p.lastName || '');
        const initial = firstSurname ? `${firstSurname[0].toUpperCase()}.` : '';
        displayMap[p.id] = initial ? `${fn} ${initial}` : fn;
      } else {
        // Nombre único en el campo -> estrictamente solo el primer nombre o apodo
        displayMap[p.id] = fn;
      }
    });

    return displayMap;
  }, [pitchPlayers, playersList]);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStartPlayer = (playerId: string) => {
    if (isFamilyView) return;
    setDraggedPlayerId(playerId);
    
    // Iniciar temporizador de 500ms para Long-Press (pulsación prolongada)
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setContextMenuPlayerId(playerId);
      setDraggedPlayerId(null);
    }, 500);
  };

  const handleTouchEndPlayer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };
  
  const pitchRef = useRef<HTMLDivElement>(null)
  const isFamilyView = rol === "familia" || rol === "jugador"
  
  const assignedPlayerIds = Object.keys(pitchPlayers);
  const availablePlayers = initialPlayersList.filter(p => !assignedPlayerIds.includes(p.id));

  // Función para mostrar alerta si se sobrepasa el límite de 11 jugadores
  const showLimitError = () => {
    setLimitWarning("Solo pueden haber 11 jugadores en el campo al mismo tiempo.")
    setTimeout(() => setLimitWarning(null), 4000)
  }

  // Función de un toque para añadir jugador al campo en el slot seleccionado o en el primer slot libre
  const handleQuickAddPlayer = (playerId: string) => {
    if (isFamilyView) return
    if (pitchPlayers[playerId]) return

    if (Object.keys(pitchPlayers).length >= 11) {
      showLimitError()
      return
    }

    // 1. Si hay una posición táctica vacía seleccionada en el campo, colocar directamente ahí
    if (selectedSlotId) {
      const targetSlot = currentFormationSlots.find(s => s.id === selectedSlotId);
      if (targetSlot) {
        setPitchPlayers(prev => ({
          ...prev,
          [playerId]: { 
            x: targetSlot.x, 
            y: targetSlot.y,
            slotId: targetSlot.id,
            slotLabel: targetSlot.label
          }
        }));
        setSelectedSlotId(null);
        return;
      }
    }

    // 2. Si no hay posición seleccionada, buscar el primer slot libre de la formación táctica
    const occupiedSlotIds = new Set(
      Object.values(pitchPlayers).map(p => p.slotId).filter(Boolean)
    );
    const freeSlot = currentFormationSlots.find(slot => !occupiedSlotIds.has(slot.id));

    if (freeSlot) {
      setPitchPlayers(prev => ({
        ...prev,
        [playerId]: { 
          x: freeSlot.x, 
          y: freeSlot.y,
          slotId: freeSlot.id,
          slotLabel: freeSlot.label
        }
      }))
    } else {
      const assignedCount = Object.keys(pitchPlayers).length
      const fallbackSlot = currentFormationSlots[assignedCount] || { id: `slot-${assignedCount}`, label: "JUG", x: 50, y: 50 }
      setPitchPlayers(prev => ({
        ...prev,
        [playerId]: { 
          x: fallbackSlot.x, 
          y: fallbackSlot.y,
          slotId: fallbackSlot.id,
          slotLabel: fallbackSlot.label
        }
      }))
    }
  }

  const handleTacticChange = (newTactic: string) => {
    setTactic(newTactic);
    const newPitchPlayers: Record<string, PitchPlayerPosition> = {};
    const slots = allFormations[newTactic];
    if (!slots) return;
    
    let slotIdx = 0;
    for (const playerId of assignedPlayerIds) {
      if (slotIdx < 11 && slots[slotIdx]) {
        newPitchPlayers[playerId] = { 
          x: slots[slotIdx].x, 
          y: slots[slotIdx].y,
          slotId: slots[slotIdx].id,
          slotLabel: slots[slotIdx].label
        };
        slotIdx++;
      }
    }
    setPitchPlayers(newPitchPlayers);
    setSelectedPlayerId(null);
    setSelectedSlotId(null);
  }

  const handleSaveCustomTactic = () => {
    const trimmed = newTacticName.trim()
    if (!trimmed) return

    // Generar un sistema basado en las posiciones actuales en el campo
    const slots = Object.values(pitchPlayers).map((coords, idx) => ({
      id: `slot-${idx}`,
      label: "JUG",
      x: coords.x,
      y: coords.y
    }))

    const updated = { ...customFormations, [trimmed]: slots }
    setCustomFormations(updated)
    try {
      localStorage.setItem("custom_lineup_tactics", JSON.stringify(updated))
    } catch (e) {
      console.error("Error al guardar táctica personalizada:", e)
    }
    setTactic(trimmed)
    setNewTacticName("")
    setShowSaveTacticModal(false)
  }

  const handleDeleteCustomTactic = (tacticName: string) => {
    const next = { ...customFormations }
    delete next[tacticName]
    setCustomFormations(next)
    try {
      localStorage.setItem("custom_lineup_tactics", JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
    if (tactic === tacticName) {
      setTactic("4-3-3")
    }
  }

  const handleSave = () => {
    if (isFamilyView || !matchId) return
    startTransition(async () => {
      const assigned = Object.keys(pitchPlayers).map(playerId => ({
        playerId,
        x: pitchPlayers[playerId].x,
        y: pitchPlayers[playerId].y
      }));
      await saveLineup(matchId, assigned, tactic)

      if (onLineupSaved) {
        // Generar lista actualizada de convocatorias con los titulares y sus coordenadas
        const updated = convocatorias.map(c => {
          const isTitular = !!pitchPlayers[c.player_id];
          const coords = pitchPlayers[c.player_id];
          return {
            ...c,
            titular: isTitular,
            tactical_x: isTitular ? coords?.x : null,
            tactical_y: isTitular ? coords?.y : null
          };
        });

        // Asegurar que jugadores en pitchPlayers que no estuvieran en convocatorias también se incluyan
        for (const [playerId, coords] of Object.entries(pitchPlayers)) {
          if (!updated.some(c => c.player_id === playerId)) {
            updated.push({
              partido_id: matchId,
              player_id: playerId,
              titular: true,
              tactical_x: coords.x,
              tactical_y: coords.y,
              status: 'convocado'
            });
          }
        }
        onLineupSaved(updated);
      }

      setSavedAlert(true)
      setTimeout(() => setSavedAlert(false), 3000)
    })
  }

  const placePlayerOnPitchAtCoords = (playerId: string, xRatio: number, yRatio: number) => {
    let x = Math.max(0, Math.min(100, xRatio * 100));
    let y = Math.max(0, Math.min(100, yRatio * 100));
    
    // Si estamos en Desktop (pitch horizontal), invertimos las coordenadas para guardar en formato vertical
    if (window.innerWidth >= 768) {
      const tempX = x;
      x = 100 - y;
      y = tempX;
    }

    // Verificar si es un jugador nuevo y ya hay 11 en el campo
    if (!pitchPlayers[playerId] && Object.keys(pitchPlayers).length >= 11) {
      showLimitError();
      return;
    }

    setPitchPlayers(prev => {
      const existing = prev[playerId];
      let slotId = existing?.slotId;
      let slotLabel = existing?.slotLabel;

      if (!slotId) {
        const occupied = new Set(Object.values(prev).map(p => p.slotId).filter(Boolean));
        const freeSlot = currentFormationSlots.find(s => !occupied.has(s.id));
        if (freeSlot) {
          slotId = freeSlot.id;
          slotLabel = freeSlot.label;
        }
      }

      return {
        ...prev,
        [playerId]: {
          x,
          y,
          slotId,
          slotLabel
        }
      };
    });
    setSelectedPlayerId(null);
    setSelectedSlotId(null);
  }

  const handlePitchDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isFamilyView) return;
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId") || draggedPlayerId;
    if (!playerId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    placePlayerOnPitchAtCoords(playerId, xRatio, yRatio);
    setDraggedPlayerId(null);
  }

  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFamilyView) return;
    
    if (selectedPlayerId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      placePlayerOnPitchAtCoords(selectedPlayerId, xRatio, yRatio);
    }
    setSelectedSlotId(null);
  }

  // Soporte Touch (Arrastrar en móvil)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isFamilyView || !draggedPlayerId || !pitchRef.current) return;
    const touch = e.touches[0];
    const rect = pitchRef.current.getBoundingClientRect();
    
    if (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      const xRatio = (touch.clientX - rect.left) / rect.width;
      const yRatio = (touch.clientY - rect.top) / rect.height;
      placePlayerOnPitchAtCoords(draggedPlayerId, xRatio, yRatio);
    }
  }

  const handleTouchEnd = () => {
    setDraggedPlayerId(null);
  }

  const handleRemoveFromPitch = (playerId: string) => {
    if (isFamilyView) return;
    setPitchPlayers(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
  }

  return (
    <div className={isFamilyView ? "max-w-xl mx-auto space-y-4" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
      
      {/* ── Columna Izquierda / Central: Pizarra Interactiva (Lectura si familiar) ── */}
      <div className={isFamilyView ? "space-y-4" : "lg:col-span-2 space-y-4"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación Táctica</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              {isFamilyView ? "VISTA PREVIA TÁCTICA (MODO LECTURA)" : "MODO EDICIÓN INTERACTIVO (TOCA O ARRASTRA)"}
            </p>
          </div>

          {!isFamilyView && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={tactic}
                onChange={e => handleTacticChange(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <optgroup label="Sistemas Predeterminados">
                  {Object.keys(DEFAULT_FORMATIONS).map(name => (
                    <option key={name} value={name}>Sistema: {name}</option>
                  ))}
                </optgroup>
                {Object.keys(customFormations).length > 0 && (
                  <optgroup label="Mis Sistemas Personalizados">
                    {Object.keys(customFormations).map(name => (
                      <option key={name} value={name}>⭐ {name}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                onClick={() => setShowBenchListModal(true)}
                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Ver lista de suplentes para añadir al campo"
              >
                <Users className="w-3.5 h-3.5" />
                <span>+ Suplentes ({availablePlayers.length})</span>
              </button>

              <button
                onClick={() => setShowSaveTacticModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors"
                title="Guardar alineación como nuevo sistema personalizado"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar Sistema</span>
              </button>

              {assignedPlayerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearPitchModal(true)}
                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                  title="Quitar a todos los titulares del campo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vaciar Campo</span>
                </button>
              )}

              {customFormations[tactic] && (
                <button
                  onClick={() => handleDeleteCustomTactic(tactic)}
                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 text-xs font-bold transition-colors"
                  title="Eliminar este sistema personalizado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {savedAlert && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl animate-in fade-in duration-200">
            ✅ ¡Alineación táctica guardada con éxito!
          </div>
        )}

{/* Modal de Confirmación para Vaciar Campo */}
        {showClearPitchModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">¿Vaciar alineación del campo?</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Se quitarán los <strong>{assignedPlayerIds.length} titulares</strong> del campo y volverán a la lista de disponibles para que puedas rearmar el once desde cero.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearPitchModal(false)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPitchPlayers({});
                    setSelectedPlayerId(null);
                    setSelectedSlotId(null);
                    setShowClearPitchModal(false);
                  }}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors active:scale-98"
                >
                  Sí, vaciar campo
                </button>
              </div>
            </div>
          </div>
        )}

{/* Modal para Editar Apodo / Nombre Deportivo */}
        {editingNicknamePlayer && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shadow-xs">
                    {editingNicknamePlayer.number != null && editingNicknamePlayer.number !== '' ? editingNicknamePlayer.number : '-'}
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {editingNicknamePlayer.fullName || editingNicknamePlayer.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nombre Deportivo / Apodo</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingNicknamePlayer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Apodo o nombre a mostrar en el campo:
                </label>
                <input
                  type="text"
                  value={newNicknameInput}
                  onChange={(e) => setNewNicknameInput(e.target.value)}
                  placeholder={`Ej. ${editingNicknamePlayer.firstName || 'Nombre'}`}
                  className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePlayerNickname();
                    }
                  }}
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Este nombre se guardará en su ficha y se mostrará en la pizarra táctica y convocatorias.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNicknamePlayer(null)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePlayerNickname}
                  disabled={isSavingNickname}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors active:scale-98"
                >
                  {isSavingNickname ? 'Guardando...' : 'Guardar Apodo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Guardar Nuevo Sistema Personalizado */}
        {showSaveTacticModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <h4 className="text-sm font-black text-slate-900 uppercase">Guardar Sistema Personalizado</h4>
              <p className="text-xs text-slate-500 font-medium">
                Guarda la disposición actual de los {Object.keys(pitchPlayers).length} jugadores como un nuevo esquema táctico.
              </p>
              <input
                type="text"
                value={newTacticName}
                onChange={e => setNewTacticName(e.target.value)}
                placeholder="Ej. 4-1-2-3 Presión Alta"
                className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSaveTacticModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCustomTactic}
                  disabled={!newTacticName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  Guardar Sistema
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pitch Container */}
        <div className="bg-white border border-slate-150 rounded-xl p-3 sm:p-5 shadow-sm space-y-4">
          {/* Badge de contador de titulares y posición seleccionada */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold px-1">
            <span className="text-slate-500">
              Titulares en campo: <strong className={assignedPlayerIds.length === 11 ? "text-emerald-600" : "text-slate-800"}>{assignedPlayerIds.length}/11</strong>
            </span>
            {selectedSlot && (
              <span className="flex items-center gap-1.5 text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg text-[11px] font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                Posición <strong>{selectedSlot.label}</strong> iluminada: elige un jugador de la lista
                <button
                  type="button"
                  onClick={() => setSelectedSlotId(null)}
                  className="ml-1 text-cyan-600 hover:text-cyan-900 font-extrabold"
                  title="Cancelar selección"
                >
                  ✕
                </button>
              </span>
            )}
            {!selectedSlot && selectedPlayerId && (
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[11px] animate-pulse">
                Toca una zona o posición vacía del campo para colocar al jugador seleccionado
              </span>
            )}
          </div>

          <div 
            ref={pitchRef}
            className="relative w-full aspect-[3/4.2] max-w-[360px] md:max-w-none md:aspect-auto md:w-full md:h-[480px] mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md transition-all cursor-pointer md:cursor-default touch-none"
            onDragOver={isFamilyView ? undefined : e => e.preventDefault()}
            onDrop={handlePitchDrop}
            onClick={handlePitchClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Campo de fútbol marcajes */}
            <div className="absolute inset-3 sm:inset-4 border border-white/20 pointer-events-none md:-rotate-90 md:origin-center md:scale-[1.3] md:w-[150%] md:-left-[25%]">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
              <div className="absolute top-0 left-1/4 right-1/4 h-12 border-b border-x border-white/20" />
              <div className="absolute bottom-0 left-1/4 right-1/4 h-12 border-t border-x border-white/20" />
            </div>

            {/* Posiciones Tácticas Vacías del Sistema */}
            {!isFamilyView && emptySlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  style={getCoordsStyle(slot.x, slot.y)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-150 select-none"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPlayerId) {
                        setPitchPlayers(prev => ({
                          ...prev,
                          [selectedPlayerId]: { 
                            x: slot.x, 
                            y: slot.y,
                            slotId: slot.id,
                            slotLabel: slot.label
                          }
                        }));
                        setSelectedPlayerId(null);
                        setSelectedSlotId(null);
                      } else {
                        setSelectedSlotId(isSelected ? null : slot.id);
                      }
                    }}
                    className={[
                      "w-12 h-12 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-sm active:scale-95 group",
                      isSelected 
                        ? "border-2 border-cyan-300 bg-cyan-500/50 text-white shadow-lg shadow-cyan-400/60 ring-4 ring-cyan-400/40 scale-110 animate-pulse z-20"
                        : "border-2 border-dashed border-white/60 bg-emerald-950/45 hover:bg-emerald-900/70 hover:border-white text-white/90 hover:scale-105"
                    ].join(" ")}
                    title={`Posición vacía: ${slot.label}. Toca para iluminar y colocar jugador.`}
                  >
                    <span className={[
                      "font-black tracking-tight leading-none",
                      isSelected ? "text-xs sm:text-sm text-white drop-shadow-md" : "text-[11px] sm:text-xs text-white/90"
                    ].join(" ")}>
                      {slot.label}
                    </span>
                    <Plus className={[
                      "transition-transform",
                      isSelected ? "w-3 h-3 text-cyan-200 mt-0.5" : "w-3 h-3 text-white/60 -mt-0.5 group-hover:scale-110"
                    ].join(" ")} />
                  </button>
                  <span className={[
                    "text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded shadow-2xs whitespace-nowrap select-none leading-tight",
                    isSelected ? "bg-cyan-600 text-white font-extrabold" : "bg-emerald-950/80 text-emerald-200/90"
                  ].join(" ")}>
                    {isSelected ? 'Elegir' : 'Libre'}
                  </span>
                </div>
              );
            })}

            {/* Jugadores en el campo */}
            {Object.entries(pitchPlayers).map(([playerId, coords]) => {
              const player = initialPlayersList.find(p => p.id === playerId);
              if (!player) return null;
              
              const tacticalPositionLabel = coords.slotLabel || (coords.slotId ? currentFormationSlots.find(s => s.id === coords.slotId)?.label : null);

              return (
                <div
                  key={playerId}
                  style={getCoordsStyle(coords.x, coords.y)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all duration-75 touch-none"
                >
                  <div className="relative group flex flex-col items-center">
                    {/* Badge de posición táctica centrada y ajustada a la parte superior del círculo */}
                    {tacticalPositionLabel && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 border border-white text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-tight z-20 pointer-events-none select-none whitespace-nowrap leading-none">
                        {tacticalPositionLabel}
                      </div>
                    )}

                    <div
                      className={[
                        "w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-900 border-2 overflow-hidden flex items-center justify-center shadow-md transition-all duration-200 select-none",
                        isFamilyView ? "cursor-default select-none border-white text-white" : "cursor-grab active:cursor-grabbing",
                        selectedPlayerId === player.id ? "border-cyan-400 scale-110 shadow-cyan-500/50 shadow-lg ring-4 ring-cyan-400/40" : "border-white"
                      ].join(" ")}
                      draggable={!isFamilyView}
                      onClick={(e) => {
                        if (!isFamilyView) {
                          e.stopPropagation();
                          setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
                          setSelectedSlotId(null);
                        }
                      }}
                      onTouchStart={(e) => {
                        if (!isFamilyView) {
                          handleTouchStartPlayer(player.id);
                        }
                      }}
                      onTouchMove={() => {
                        handleTouchEndPlayer();
                      }}
                      onTouchEnd={() => {
                        handleTouchEndPlayer();
                      }}
                      onDragStart={isFamilyView ? undefined : e => {
                        e.dataTransfer.setData("playerId", player.id);
                        setDraggedPlayerId(player.id);
                        setTimeout(() => {
                           const el = e.target as HTMLElement;
                           if(el.parentElement) el.parentElement.style.opacity = '0.5';
                        }, 0);
                      }}
                      onDragEnd={isFamilyView ? undefined : e => {
                         const el = e.target as HTMLElement;
                         if(el.parentElement) el.parentElement.style.opacity = '1';
                         setDraggedPlayerId(null);
                      }}
                    >
                      {/* Foto del jugador o iniciales como fallback */}
                      {player.avatarUrl ? (
                        <img 
                          src={player.avatarUrl} 
                          alt={player.fullName || player.name} 
                          draggable={false}
                          className="w-full h-full object-cover object-[center_20%] pointer-events-none select-none" 
                        />
                      ) : (
                        <span className="text-sm font-black text-white tracking-wider pointer-events-none select-none">
                          {player.avatar || ((player.fullName || player.name) ? (player.fullName || player.name)[0] : 'J')}
                        </span>
                      )}
                    </div>

                    {/* Pastilla inferior: Dorsal (#) y Nombre de pila/apodo desambiguado sin puntos suspensivos */}
                    <span className="text-[9px] sm:text-[9.5px] font-black text-white mt-1 bg-slate-950/90 border border-white/20 px-2 py-0.5 rounded-md shadow-md whitespace-nowrap flex items-center gap-1.5 select-none leading-tight">
                      {player.number != null && player.number !== '' && player.number !== '-' && (
                        <span className="text-amber-400 font-mono font-black text-[9px] sm:text-[9.5px] shrink-0">
                          #{player.number}
                        </span>
                      )}
                      <span>{pitchPlayerDisplayNames[player.id] || player.firstName || player.name.split(" ")[0]}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Modal Contextual tras Pulsación Prolongada (0.5s Long-Press) en Móvil */}
          {contextMenuPlayerId && (
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setContextMenuPlayerId(null)}
            >
              <div 
                className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                {(() => {
                  const targetPlayer = initialPlayersList.find(p => p.id === contextMenuPlayerId);
                  return (
                    <>
                      <div className="flex items-center justify-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {targetPlayer?.number || "?"}
                        </div>
                        <div className="text-left">
                          <h4 className="font-extrabold text-slate-900 text-sm">{targetPlayer?.name || "Jugador"}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{targetPlayer?.pos || "Jugador"}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => {
                            handleRemoveFromPitch(contextMenuPlayerId);
                            setContextMenuPlayerId(null);
                          }}
                          className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-all active:scale-98"
                        >
                          <Trash2 className="w-4 h-4" />
                          Quitar del Campo
                        </button>

                        <button
                          onClick={() => setContextMenuPlayerId(null)}
                          className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Mobile Direct Player Buttons Dock (sin scroll molesto en móvil) */}
          {!isFamilyView && (
            <div className="block lg:hidden border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  {selectedSlot ? `Toca para colocar en ${selectedSlot.label}` : `Toca para añadir (${availablePlayers.length} disponibles)`}
                </span>
                {limitWarning && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Máximo 11 jugadores
                  </span>
                )}
              </div>

              {selectedSlot && (
                <div className="flex items-center justify-between p-2.5 bg-cyan-50 border border-cyan-300 rounded-xl text-cyan-900 text-xs font-bold animate-in fade-in shadow-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                    <span>Colocando en posición: <strong className="underline uppercase tracking-wide">{selectedSlot.label}</strong></span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedSlotId(null)}
                    className="text-[10px] font-extrabold text-cyan-700 bg-cyan-100 hover:bg-cyan-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {availablePlayers.length > 0 ? (
                <div className="space-y-2 p-1.5 bg-slate-50/80 rounded-xl border border-slate-200/80 max-h-[360px] overflow-y-auto">
                  {availablePlayers.map(player => (
                    <div
                      key={player.id}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl shadow-xs transition-all text-left ${
                        selectedSlot 
                          ? 'bg-cyan-50/60 border border-cyan-300 hover:bg-cyan-100/70' 
                          : 'bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Columna 1: Dorsal + Foto (Toque para añadir) */}
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlayer(player.id)}
                        className="flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
                        title={`Añadir ${player.fullName || player.name}`}
                      >
                        {/* Dorsal destacado y visible */}
                        <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {player.number != null && player.number !== '' ? player.number : '-'}
                        </span>

                        {/* Foto de perfil del jugador o avatar con iniciales */}
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-black text-blue-700 shrink-0 shadow-2xs">
                          {player.avatarUrl ? (
                            <img src={player.avatarUrl} alt={player.fullName || player.name} className="w-full h-full object-cover object-[center_25%]" />
                          ) : (
                            <span>{player.avatar || ((player.fullName || player.name) ? (player.fullName || player.name)[0] : 'J')}</span>
                          )}
                        </div>
                      </button>

                      {/* Columna 2: Nombre entero y demarcación (Toque para añadir) */}
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlayer(player.id)}
                        className="min-w-0 overflow-hidden text-left cursor-pointer active:opacity-75 transition-opacity pr-1"
                        title={`Añadir ${player.fullName || player.name}`}
                      >
                        <h4 
                          className="text-xs sm:text-sm font-black text-slate-800 leading-tight break-words whitespace-normal"
                          title={player.fullName || player.name}
                        >
                          {player.fullName || player.name}
                          {player.nickname && (
                            <span className="ml-1.5 text-blue-600 font-extrabold text-[11px] inline-block">
                              ({player.nickname})
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold block whitespace-normal">
                          {player.demarcation || 'Jugador'}
                        </span>
                      </button>

                      {/* Columna 3: Botones de acción: Editar apodo (✏️) y Añadir (+) */}
                      <div className="flex items-center gap-1.5 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNicknamePlayer(player);
                            setNewNicknameInput(player.nickname || player.firstName || "");
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 flex items-center justify-center transition-colors shadow-2xs shrink-0"
                          title="Editar apodo o nombre para el campo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddPlayer(player.id);
                          }}
                          className={`h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 font-extrabold text-[11px] transition-colors shadow-2xs active:scale-95 shrink-0 ${
                            selectedSlot 
                              ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-500/30 ring-2 ring-cyan-400/40 animate-pulse' 
                              : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200'
                          }`}
                          title={selectedSlot ? `Colocar en ${selectedSlot.label}` : "Añadir al campo"}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span className="hidden xs:inline">{selectedSlot ? selectedSlot.label : 'Añadir'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-200 text-center">
                  ✅ Todos los jugadores han sido colocados en el campo
                </p>
              )}
            </div>
          )}

          {!isFamilyView && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isPending ? "Guardando..." : "Guardar alineación"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Columna Derecha: Banquillo / Lista (Sólo en Desktop lg:block, sin scroll en móvil) ── */}
      {!isFamilyView && (
        <div className="hidden lg:block space-y-4">
          {/* Alerta de límite de 11 jugadores */}
          {limitWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{limitWarning}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Lista de jugadores</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {availablePlayers.length} Suplentes
            </span>
          </div>

          <div 
            className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm space-y-3 min-h-[500px]"
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const playerId = e.dataTransfer.getData("playerId") || draggedPlayerId;
              if (playerId) handleRemoveFromPitch(playerId);
            }}
          >
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              Toca o arrastra un jugador para colocarlo en el campo
            </p>

            <div className="space-y-2 pr-1">
              {availablePlayers.map(player => (
                <div
                  key={player.id}
                  draggable={true}
                  onClick={() => {
                    if (!isFamilyView) {
                      if (Object.keys(pitchPlayers).length >= 11 && !pitchPlayers[player.id]) {
                        showLimitError();
                        return;
                      }
                      if (selectedSlotId) {
                        handleQuickAddPlayer(player.id);
                        return;
                      }
                      setBenchPlayerModalId(player.id);
                    }
                  }}
                  onTouchStart={() => {
                    if (!isFamilyView) setDraggedPlayerId(player.id);
                  }}
                  onDragStart={e => {
                    e.dataTransfer.setData("playerId", player.id);
                    setDraggedPlayerId(player.id);
                  }}
                  onDragEnd={() => setDraggedPlayerId(null)}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 border rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                    selectedSlotId
                      ? 'bg-cyan-50/40 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300'
                      : selectedPlayerId === player.id 
                        ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500 shadow-md' 
                        : 'border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 hover:shadow-sm'
                  }`}
                >
                  {/* Columna 1: Dorsal + Foto */}
                  <div 
                    onClick={() => handleQuickAddPlayer(player.id)}
                    className="flex items-center gap-2 shrink-0 cursor-pointer"
                    title={`Añadir ${player.fullName || player.name}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {player.number != null && player.number !== '' ? player.number : '-'}
                    </span>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-700 shrink-0">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={player.fullName || player.name} className="w-full h-full object-cover object-[center_25%]" />
                      ) : (
                        <span>{player.avatar}</span>
                      )}
                    </div>
                  </div>

                  {/* Columna 2: Nombre entero y demarcación */}
                  <div 
                    onClick={() => handleQuickAddPlayer(player.id)}
                    className="min-w-0 overflow-hidden cursor-pointer pr-1"
                    title={`Añadir ${player.fullName || player.name}`}
                  >
                    <h4 
                      className="text-xs font-bold text-slate-900 leading-tight break-words whitespace-normal"
                      title={player.fullName || player.name}
                    >
                      {player.fullName || player.name}
                      {player.nickname && (
                        <span className="ml-1.5 text-blue-600 font-extrabold text-[10px] inline-block">
                          ({player.nickname})
                        </span>
                      )}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-semibold block whitespace-normal">{player.demarcation}</span>
                  </div>

                  {/* Columna 3: Botones de acción (Lápiz + Botón Añadir) */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNicknamePlayer(player);
                        setNewNicknameInput(player.nickname || player.firstName || "");
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0"
                      title="Editar apodo o nombre para el campo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAddPlayer(player.id);
                      }}
                      className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-md flex items-center gap-1 transition-all shrink-0 ${
                        selectedSlot 
                          ? 'text-cyan-700 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 animate-pulse' 
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      {selectedSlot ? `+ En ${selectedSlot.label}` : '+ Añadir'}
                    </button>
                  </div>
                </div>
              ))}

              {availablePlayers.length === 0 && (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Todos los jugadores colocados</p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Lista Completa de Suplentes (Acceso rápido Móvil y Desktop) */}
          {showBenchListModal && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setShowBenchListModal(false)}
            >
              <div 
                className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Jugadores Suplentes</h3>
                    <p className="text-[10px] text-slate-400 font-bold">SELECCIONA UN JUGADOR PARA AÑADIR AL CAMPO</p>
                  </div>
                  <button 
                    onClick={() => setShowBenchListModal(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {availablePlayers.map(player => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 p-2.5 border border-slate-150 rounded-xl bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-300 transition-all text-left"
                    >
                      {/* Columna 1: Dorsal */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBenchListModal(false);
                          if (Object.keys(pitchPlayers).length >= 11 && !pitchPlayers[player.id]) {
                            showLimitError();
                            return;
                          }
                          if (selectedSlotId) {
                            handleQuickAddPlayer(player.id);
                            return;
                          }
                          setBenchPlayerModalId(player.id);
                        }}
                        className="flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 transition-transform"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {player.number != null && player.number !== '' ? player.number : player.avatar}
                        </div>
                      </button>

                      {/* Columna 2: Nombre entero */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBenchListModal(false);
                          if (Object.keys(pitchPlayers).length >= 11 && !pitchPlayers[player.id]) {
                            showLimitError();
                            return;
                          }
                          if (selectedSlotId) {
                            handleQuickAddPlayer(player.id);
                            return;
                          }
                          setBenchPlayerModalId(player.id);
                        }}
                        className="min-w-0 overflow-hidden text-left cursor-pointer active:opacity-75 transition-opacity pr-1"
                      >
                        <h4 className="text-xs font-bold text-slate-900 leading-tight break-words whitespace-normal" title={player.fullName || player.name}>
                          {player.fullName || player.name}
                          {player.nickname && (
                            <span className="ml-1 text-blue-600 font-extrabold text-[10px]">
                              ({player.nickname})
                            </span>
                          )}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-semibold block whitespace-normal">{player.demarcation}</span>
                      </button>

                      {/* Columna 3: Botones */}
                      <div className="flex items-center gap-1.5 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNicknamePlayer(player);
                            setNewNicknameInput(player.nickname || player.firstName || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors shrink-0"
                          title="Editar apodo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowBenchListModal(false);
                            if (Object.keys(pitchPlayers).length >= 11 && !pitchPlayers[player.id]) {
                              showLimitError();
                              return;
                            }
                            if (selectedSlotId) {
                              handleQuickAddPlayer(player.id);
                              return;
                            }
                            setBenchPlayerModalId(player.id);
                          }}
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                            selectedSlot 
                              ? 'text-cyan-700 bg-cyan-100 border-cyan-300 animate-pulse' 
                              : 'text-blue-600 bg-blue-50 border-blue-200'
                          }`}
                        >
                          {selectedSlot ? `+ En ${selectedSlot.label}` : '+ Seleccionar'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {availablePlayers.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium">Todos los jugadores ya están en el campo</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowBenchListModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Modal Selector de Posición para Añadir al Campo */}
          {benchPlayerModalId && (
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setBenchPlayerModalId(null)}
            >
              <div 
                className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                {(() => {
                  const targetPlayer = initialPlayersList.find(p => p.id === benchPlayerModalId);
                  const currentFormSlots = allFormations[tactic] || DEFAULT_FORMATIONS["4-3-3"];
                  
                  return (
                    <>
                      <div className="flex items-center justify-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {targetPlayer?.number || "?"}
                        </div>
                        <div className="text-left">
                          <h4 className="font-extrabold text-slate-900 text-sm">{targetPlayer?.name || "Jugador"}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Añadir al campo ({tactic})</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 font-semibold">
                        Selecciona en qué posición del campo quieres colocar a este jugador:
                      </p>

                      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto p-1">
                        {currentFormSlots.map((slot) => {
                          const occupiedByPlayerId = Object.keys(pitchPlayers).find(pId => {
                            const pCoords = pitchPlayers[pId];
                            return pCoords.slotId === slot.id || (Math.abs(pCoords.x - slot.x) < 5 && Math.abs(pCoords.y - slot.y) < 5);
                          });
                          const occupiedPlayer = occupiedByPlayerId ? initialPlayersList.find(p => p.id === occupiedByPlayerId) : null;

                          return (
                            <button
                              key={slot.id}
                              onClick={() => {
                                // Si estaba ocupada por otro, quitamos a ese otro del campo o intercambiamos
                                setPitchPlayers(prev => {
                                  const next = { ...prev };
                                  if (occupiedByPlayerId) {
                                    delete next[occupiedByPlayerId];
                                  }
                                  next[benchPlayerModalId] = { 
                                    x: slot.x, 
                                    y: slot.y,
                                    slotId: slot.id,
                                    slotLabel: slot.label
                                  };
                                  return next;
                                });
                                setBenchPlayerModalId(null);
                              }}
                              className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center transition-all ${
                                occupiedPlayer 
                                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <span className="text-xs font-black">{slot.label}</span>
                              <span className="text-[9px] font-bold truncate max-w-full">
                                {occupiedPlayer ? `Sustituye a ${occupiedPlayer.name.split(" ")[0]}` : 'Libre'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setBenchPlayerModalId(null)}
                        className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                      >
                        Cancelar
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
