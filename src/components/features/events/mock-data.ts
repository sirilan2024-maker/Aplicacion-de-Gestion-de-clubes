// ─── Mock Data: Eventos & Calendario ───────────────────────────────────────

export type EventType = "Entrenamiento" | "Partido" | "Reunión" | "Otro"

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  type: EventType
  teamId: string
  teamName: string
  teamColor: string // tailwind bg class
  teamHex: string  // hex for inline styles
  location?: string
}

export const MOCK_TEAMS = [
  { id: "t1", name: "Benjamín A",    color: "bg-yellow-400",  hex: "#facc15" },
  { id: "t2", name: "Alevín B",      color: "bg-blue-500",    hex: "#3b82f6" },
  { id: "t3", name: "Infantil A",    color: "bg-emerald-500", hex: "#10b981" },
  { id: "t4", name: "Cadete A",      color: "bg-purple-500",  hex: "#a855f7" },
  { id: "t5", name: "Juvenil A",     color: "bg-rose-500",    hex: "#f43f5e" },
]

export const MOCK_EVENTS: CalendarEvent[] = [
  // Mayo 2026 - semana 1
  { id: "e1",  title: "Entrenamiento Benjamín A",  date: "2026-05-04", time: "17:30", type: "Entrenamiento", teamId: "t1", teamName: "Benjamín A",  teamColor: "bg-yellow-400",  teamHex: "#facc15", location: "Campo Municipal Norte" },
  { id: "e2",  title: "Partido vs Atlético Junior", date: "2026-05-05", time: "11:00", type: "Partido",       teamId: "t2", teamName: "Alevín B",      teamColor: "bg-blue-500",    teamHex: "#3b82f6", location: "Campo Municipal Norte" },
  { id: "e3",  title: "Entrenamiento Infantil A",  date: "2026-05-06", time: "19:00", type: "Entrenamiento", teamId: "t3", teamName: "Infantil A",    teamColor: "bg-emerald-500", teamHex: "#10b981", location: "Pabellón Sur" },
  { id: "e4",  title: "Partido vs Real Betis EB",  date: "2026-05-07", time: "18:00", type: "Partido",       teamId: "t3", teamName: "Infantil A",    teamColor: "bg-emerald-500", teamHex: "#10b981", location: "Campo Rival" },
  // semana 2
  { id: "e5",  title: "Entrenamiento Cadete A",    date: "2026-05-11", time: "18:00", type: "Entrenamiento", teamId: "t4", teamName: "Cadete A",      teamColor: "bg-purple-500",  teamHex: "#a855f7", location: "Campo Municipal Norte" },
  { id: "e6",  title: "Entrenamiento Benjamín A",  date: "2026-05-12", time: "17:30", type: "Entrenamiento", teamId: "t1", teamName: "Benjamín A",  teamColor: "bg-yellow-400",  teamHex: "#facc15", location: "Campo Municipal Norte" },
  { id: "e7",  title: "Partido vs Sevilla CF EB",  date: "2026-05-13", time: "10:30", type: "Partido",       teamId: "t1", teamName: "Benjamín A",  teamColor: "bg-yellow-400",  teamHex: "#facc15", location: "Campo Municipal Norte" },
  { id: "e8",  title: "Entrenamiento Juvenil A",   date: "2026-05-14", time: "19:30", type: "Entrenamiento", teamId: "t5", teamName: "Juvenil A",     teamColor: "bg-rose-500",    teamHex: "#f43f5e", location: "Campo Sur" },
  { id: "e9",  title: "Partido vs Bétis Balón",    date: "2026-05-14", time: "17:00", type: "Partido",       teamId: "t5", teamName: "Juvenil A",     teamColor: "bg-rose-500",    teamHex: "#f43f5e", location: "Campo Rival" },
  // semana 3 (actual)
  { id: "e10", title: "Entrenamiento Alevín B",    date: "2026-05-18", time: "18:00", type: "Entrenamiento", teamId: "t2", teamName: "Alevín B",      teamColor: "bg-blue-500",    teamHex: "#3b82f6", location: "Pabellón Sur" },
  { id: "e11", title: "Entrenamiento Infantil A",  date: "2026-05-19", time: "19:00", type: "Entrenamiento", teamId: "t3", teamName: "Infantil A",    teamColor: "bg-emerald-500", teamHex: "#10b981", location: "Campo Municipal Norte" },
  { id: "e12", title: "Partido vs Utrera CF",      date: "2026-05-20", time: "11:00", type: "Partido",       teamId: "t4", teamName: "Cadete A",      teamColor: "bg-purple-500",  teamHex: "#a855f7", location: "Estadio Utrera" },
  { id: "e13", title: "Entrenamiento Cadete A",    date: "2026-05-21", time: "18:00", type: "Entrenamiento", teamId: "t4", teamName: "Cadete A",      teamColor: "bg-purple-500",  teamHex: "#a855f7", location: "Campo Municipal Norte" },
  { id: "e14", title: "Partido vs Écija Balompié", date: "2026-05-23", time: "17:00", type: "Partido",       teamId: "t2", teamName: "Alevín B",      teamColor: "bg-blue-500",    teamHex: "#3b82f6", location: "Campo Municipal Norte" },
  // semana 4
  { id: "e15", title: "Entrenamiento Benjamín A",  date: "2026-05-25", time: "17:30", type: "Entrenamiento", teamId: "t1", teamName: "Benjamín A",  teamColor: "bg-yellow-400",  teamHex: "#facc15", location: "Campo Municipal Norte" },
  { id: "e16", title: "Entrenamiento Juvenil A",   date: "2026-05-26", time: "19:30", type: "Entrenamiento", teamId: "t5", teamName: "Juvenil A",     teamColor: "bg-rose-500",    teamHex: "#f43f5e", location: "Campo Sur" },
  { id: "e17", title: "Partido Final Liga",        date: "2026-05-27", time: "12:00", type: "Partido",       teamId: "t5", teamName: "Juvenil A",     teamColor: "bg-rose-500",    teamHex: "#f43f5e", location: "Campo Municipal Norte" },
  { id: "e18", title: "Entrenamiento Infantil A",  date: "2026-05-28", time: "19:00", type: "Entrenamiento", teamId: "t3", teamName: "Infantil A",    teamColor: "bg-emerald-500", teamHex: "#10b981", location: "Pabellón Sur" },
]

// ─── Mock Data: Vista de Partido ─────────────────────────────────────────────

export interface MockPlayer {
  id: string
  name: string
  number: number
  position: string
  posX: number  // % from left
  posY: number  // % from top
  goals?: number
  assists?: number
  yellowCards?: number
  redCards?: number
  rating?: number
}

export const MOCK_MATCH = {
  id: "m1",
  date: "miércoles, 19 de mayo de 2026",
  time: "18:00",
  competition: "Liga Provincial Infantil - Jornada 22",
  homeTeam: {
    name: "Sporting Saladar Infantil A",
    shortName: "Sporting Saladar",
    badge: "⚽", // emoji placeholder
    color: "#10b981",
  },
  awayTeam: {
    name: "Atlético Écija Juvenil",
    shortName: "Atl. Écija",
    badge: "🏆",
    color: "#ef4444",
  },
  scoreHome: 3,
  scoreAway: 1,
  location: "Campo Municipal Norte, Saladar",
  status: "Finalizado" as const,
  halfTimeHome: 1,
  halfTimeAway: 0,
  yellowCardsHome: 2,
  yellowCardsAway: 3,
  redCardsHome: 0,
  redCardsAway: 1,
  mvp: {
    name: "Carlos Pérez",
    number: 10,
    position: "Mediapunta",
    goals: 2,
    assists: 1,
  },
  matchRating: 4,
  matchNote: "Gran partido del equipo. Presión alta efectiva durante los primeros 30 minutos. Hay que mejorar la salida desde atrás.",
  formation: "4-3-3",
  players: [
    // GK
    { id: "p1",  name: "David García",   number: 1,  position: "Portero",       posX: 50, posY: 88, goals: 0, assists: 0, rating: 7 },
    // DEF
    { id: "p2",  name: "Jorge Ruiz",     number: 2,  position: "Lateral Dcho.", posX: 80, posY: 68, goals: 0, assists: 1, rating: 7 },
    { id: "p3",  name: "Miguel Sanz",    number: 5,  position: "Central",       posX: 62, posY: 72, goals: 0, assists: 0, rating: 8 },
    { id: "p4",  name: "Pablo Torres",   number: 6,  position: "Central",       posX: 38, posY: 72, goals: 0, assists: 0, rating: 7 },
    { id: "p5",  name: "Luis Moreno",    number: 3,  position: "Lateral Izq.",  posX: 20, posY: 68, goals: 0, assists: 0, rating: 6 },
    // MID
    { id: "p6",  name: "Rubén Díaz",     number: 8,  position: "M. Defensivo",  posX: 50, posY: 52, goals: 0, assists: 0, rating: 7 },
    { id: "p7",  name: "Andrés Gil",     number: 4,  position: "M. Derecho",    posX: 72, posY: 45, goals: 1, assists: 0, rating: 8 },
    { id: "p8",  name: "Sergio López",   number: 7,  position: "M. Izquierdo",  posX: 28, posY: 45, goals: 0, assists: 1, rating: 7 },
    // FWD
    { id: "p9",  name: "Carlos Pérez",   number: 10, position: "Mediapunta",    posX: 50, posY: 30, goals: 2, assists: 1, rating: 9 },
    { id: "p10", name: "Álvaro Núñez",   number: 9,  position: "Delantero Dcho", posX: 75, posY: 18, goals: 0, assists: 1, rating: 7 },
    { id: "p11", name: "Iván Castro",    number: 11, position: "Delantero Izq.", posX: 25, posY: 18, goals: 0, assists: 0, rating: 6 },
  ] as MockPlayer[],
}
