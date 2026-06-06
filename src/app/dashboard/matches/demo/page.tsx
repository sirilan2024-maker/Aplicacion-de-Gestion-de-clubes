"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { MatchManager } from "@/components/features/matches/match-manager"

const MOCK_PLAYERS = [
  { id: "p1", first_name: "David", last_name: "García", dorsal: 1 },
  { id: "p2", first_name: "Jorge", last_name: "Ruiz", dorsal: 2 },
  { id: "p3", first_name: "Miguel", last_name: "Sanz", dorsal: 5 },
  { id: "p4", first_name: "Pablo", last_name: "Torres", dorsal: 6 },
  { id: "p5", first_name: "Luis", last_name: "Moreno", dorsal: 3 },
  { id: "p6", first_name: "Rubén", last_name: "Díaz", dorsal: 8 },
  { id: "p7", first_name: "Andrés", last_name: "Gil", dorsal: 4 },
  { id: "p8", first_name: "Sergio", last_name: "López", dorsal: 7 },
  { id: "p9", first_name: "Carlos", last_name: "Pérez", dorsal: 10 },
  { id: "p10", first_name: "Álvaro", last_name: "Núñez", dorsal: 9 },
  { id: "p11", first_name: "Iván", last_name: "Castro", dorsal: 11 },
  { id: "p12", first_name: "Mateo", last_name: "Ramos", dorsal: 13 },
  { id: "p13", first_name: "Lucas", last_name: "Mendoza", dorsal: 14 },
  { id: "p14", first_name: "Daniel", last_name: "Alonso", dorsal: 15 },
  { id: "p15", first_name: "Diego", last_name: "Vázquez", dorsal: 16 }
]

const MOCK_CONVOCATORIAS = [
  { player_id: "p1", partido_id: "demo-partido", titular: true, posicion_tactica: "POR", slot_index: 0, estado_asistencia: "Confirmado" },
  { player_id: "p2", partido_id: "demo-partido", titular: true, posicion_tactica: "LD", slot_index: 1, estado_asistencia: "Confirmado" },
  { player_id: "p3", partido_id: "demo-partido", titular: true, posicion_tactica: "DFC", slot_index: 2, estado_asistencia: "Confirmado" },
  { player_id: "p4", partido_id: "demo-partido", titular: true, posicion_tactica: "DFC", slot_index: 3, estado_asistencia: "Confirmado" },
  { player_id: "p5", partido_id: "demo-partido", titular: true, posicion_tactica: "LI", slot_index: 4, estado_asistencia: "Confirmado" },
  { player_id: "p6", partido_id: "demo-partido", titular: true, posicion_tactica: "MC", slot_index: 5, estado_asistencia: "Confirmado" },
  { player_id: "p7", partido_id: "demo-partido", titular: true, posicion_tactica: "MC", slot_index: 6, estado_asistencia: "Confirmado" },
  { player_id: "p8", partido_id: "demo-partido", titular: true, posicion_tactica: "MC", slot_index: 7, estado_asistencia: "Confirmado" },
  { player_id: "p9", partido_id: "demo-partido", titular: true, posicion_tactica: "MP", slot_index: 8, estado_asistencia: "Confirmado" },
  { player_id: "p10", partido_id: "demo-partido", titular: true, posicion_tactica: "DC", slot_index: 9, estado_asistencia: "Confirmado" },
  { player_id: "p11", partido_id: "demo-partido", titular: true, posicion_tactica: "DC", slot_index: 10, estado_asistencia: "Confirmado" },
  { player_id: "p12", partido_id: "demo-partido", titular: false, posicion_tactica: null, slot_index: null, estado_asistencia: "Pendiente" },
  { player_id: "p13", partido_id: "demo-partido", titular: false, posicion_tactica: null, slot_index: null, estado_asistencia: "Pendiente" },
  { player_id: "p14", partido_id: "demo-partido", titular: false, posicion_tactica: null, slot_index: null, estado_asistencia: "Ausente" },
  { player_id: "p15", partido_id: "demo-partido", titular: false, posicion_tactica: null, slot_index: null, estado_asistencia: "Confirmado" }
]

const MOCK_EVENTS = [
  {
    id: "demo-event-1",
    partido_id: "demo-partido",
    player_id: "p9",
    tipo_evento: "Gol",
    minuto: 18,
    notas: "Excelente remate raso tras pase cruzado",
    created_at: new Date().toISOString(),
    player: { id: "p9", first_name: "Carlos", last_name: "Pérez", dorsal: 10 }
  },
  {
    id: "demo-event-2",
    partido_id: "demo-partido",
    player_id: "p10",
    tipo_evento: "Asistencia",
    minuto: 18,
    notas: "Pase al hueco preciso",
    created_at: new Date().toISOString(),
    player: { id: "p10", first_name: "Álvaro", last_name: "Núñez", dorsal: 9 }
  }
]

const MOCK_PARTIDO = {
  id: "demo-partido",
  estado: "Programado" as const,
  equipo_id: "t1",
  equipo: { id: "t1", name: "Juvenil A", color: "#10b981" },
  rival_nombre: "Atlético Écija",
  lugar: "Campo Municipal Saladar",
  fecha_hora: "2026-05-25T18:00:00Z",
  resultado_propio: null,
  resultado_rival: null
}

export default function DemoMatchPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/matches"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a Partidos
        </Link>
        
        <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
          ⚡ Vista Demo Interactiva (Sin base de datos)
        </div>
      </div>

      <MatchManager
        match={MOCK_PARTIDO as any}
        players={MOCK_PLAYERS}
        convocatorias={MOCK_CONVOCATORIAS as any}
        matchEvents={MOCK_EVENTS as any}
      />
    </div>
  )
}
