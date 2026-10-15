"use client";

import { useState } from "react";
import { DailyWellnessForm, PlayerOption } from "@/components/features/performance/DailyWellnessForm";
import { Sparkles, ShieldCheck, Info } from "lucide-react";

const MOCK_EVENT = {
  id: "demo-event-wellness",
  title: "Sesión de Entrenamiento Táctico y Físico (Demostración)",
  date: new Date().toISOString().split("T")[0],
  event_type: "Entrenamiento",
  start_time: "18:30:00",
  end_time: "20:00:00",
  location: "Campo Municipal El Saladar",
};

const MOCK_PLAYERS: PlayerOption[] = [
  { id: "demo-p1", first_name: "Hugo", last_name: "Navarro" },
  { id: "demo-p2", first_name: "Marc", last_name: "García" },
  { id: "demo-p3", first_name: "Álvaro", last_name: "Martínez" },
  { id: "demo-p4", first_name: "Mateo", last_name: "Sánchez" },
  { id: "demo-p5", first_name: "Lucas", last_name: "Fernández" },
  { id: "demo-p6", first_name: "David", last_name: "López" },
];

export default function WellnessDemoPage() {
  const [isLockedPlayer, setIsLockedPlayer] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const handleToggleMode = (locked: boolean) => {
    setIsLockedPlayer(locked);
    setSelectedPlayerId(locked ? "demo-p1" : "");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8">
      {/* Banner de Entorno de Demostración Aislado */}
      <div className="w-full max-w-lg mb-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-amber-900 shadow-sm animate-in fade-in duration-300">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-800">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Modo Demostración Aislado</span>
          </div>
          <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-800" /> Sin Conexión Externa
          </span>
        </div>

        <p className="text-xs text-amber-800/90 leading-relaxed">
          Previsualización interactiva del <strong>Cuestionario Hooper</strong> (5 dimensiones de bienestar y detección de molestias). Esta ruta opera exclusivamente en memoria: no consulta <code>team_events</code>, no realiza peticiones de red y tiene el guardado en base de datos desactivado.
        </p>

        {/* Selector de Simulación de Flujo */}
        <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-amber-900">Simulación de citación:</span>
          <div className="inline-flex rounded-xl bg-amber-200/60 p-0.5">
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                !isLockedPlayer
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              Plantilla Abierta
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                isLockedPlayer
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              Enlace Personal (Hugo Navarro)
            </button>
          </div>
        </div>
      </div>

      {/* Componente del Cuestionario Hooper */}
      <DailyWellnessForm
        key={isLockedPlayer ? "locked" : "unlocked"}
        eventId={MOCK_EVENT.id}
        eventDetails={MOCK_EVENT}
        players={MOCK_PLAYERS}
        initialPlayerId={selectedPlayerId}
        isLockedPlayer={isLockedPlayer}
        teamName="Cadete A — Sporting Saladar (Demostración)"
        isDemo={true}
      />
    </div>
  );
}
