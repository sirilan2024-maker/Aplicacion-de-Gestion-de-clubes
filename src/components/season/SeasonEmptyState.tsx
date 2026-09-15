"use client";

import React from "react";
import { useSeason } from "@/components/providers/SeasonProvider";
import { Calendar, Lock, Sparkles, FolderOpen, AlertCircle, Plus } from "lucide-react";

export type EmptyStateModule =
  | "partidos"
  | "equipos"
  | "entrenamientos"
  | "clasificacion"
  | "estadisticas"
  | "convocatorias"
  | "miembros"
  | "general";

interface SeasonEmptyStateProps {
  module: EmptyStateModule;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SeasonEmptyState({
  module,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: SeasonEmptyStateProps) {
  const { selectedSeason, selectedSeasonId, isViewingHistorical, isReadOnly } = useSeason();

  // ESTADO D: Sin selección de temporada
  if (!selectedSeasonId || !selectedSeason) {
    return (
      <div className={`bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center ${className}`}>
        <Calendar className="mx-auto h-10 w-10 text-blue-400 mb-3" />
        <h3 className="text-base font-bold text-slate-100">📅 SELECCIONA UNA TEMPORADA</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Selecciona una temporada en el menú lateral para consultar la información y sus registros.
        </p>
      </div>
    );
  }

  // ESTADO B / C: Temporada Histórica Archivada (Solo Lectura)
  if (isViewingHistorical || isReadOnly) {
    const defaultTitle = title || `Sin ${module} registrados en esta temporada`;
    const defaultDesc =
      description ||
      `La temporada "${selectedSeason.name}" está archivada en la Caja Fuerte Histórica y no contiene registros de ${module}.`;

    return (
      <div className={`bg-slate-900/80 border border-blue-900/40 rounded-xl p-8 text-center shadow-sm ${className}`}>
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 mb-3">
          <Lock size={22} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 text-[11px] font-mono font-semibold border border-blue-800 mb-2">
          <span>🔒 CAJA FUERTE HISTÓRICA</span>
          <span>·</span>
          <span>{selectedSeason.name}</span>
        </div>
        <h3 className="text-base font-bold text-slate-100 uppercase tracking-tight mt-1">{defaultTitle}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">{defaultDesc}</p>
      </div>
    );
  }

  // ESTADO A / E: Temporada Nueva Activa
  const moduleMessages: Record<EmptyStateModule, { title: string; desc: string }> = {
    partidos: {
      title: "PARTIDOS · TEMPORADA NUEVA",
      desc: "Todavía no hay partidos registrados para esta temporada activa. Puedes programar el primer partido del calendario.",
    },
    equipos: {
      title: "EQUIPOS · TEMPORADA NUEVA",
      desc: "Todavía no se han creado equipos para esta temporada. Puedes añadir equipos o clonar los de la temporada anterior.",
    },
    entrenamientos: {
      title: "ENTRENAMIENTOS · TEMPORADA NUEVA",
      desc: "Todavía no se han planificado sesiones de entrenamiento para esta temporada activa.",
    },
    clasificacion: {
      title: "CLASIFICACIÓN · TEMPORADA NUEVA",
      desc: "Todavía no hay competición ni partidos finalizados registrados para calcular la clasificación en esta temporada.",
    },
    estadisticas: {
      title: "ESTADÍSTICAS · TEMPORADA NUEVA",
      desc: "Todavía no existen datos suficientes de partidos o entrenamientos para mostrar métricas en esta temporada.",
    },
    convocatorias: {
      title: "CONVOCATORIAS · TEMPORADA NUEVA",
      desc: "Sin convocatorias registradas todavía en esta temporada activa.",
    },
    miembros: {
      title: "PLANTILLA · TEMPORADA NUEVA",
      desc: "Todavía no se han matriculado jugadores en los equipos de esta temporada. Usa el Asistente de Matriculación para asignar la plantilla.",
    },
    general: {
      title: `🟢 TEMPORADA NUEVA · ${selectedSeason.name}`,
      desc: "Esta temporada está activa y limpia. Puedes comenzar introduciendo datos y planificando el ejercicio deportivo.",
    },
  };

  const moduleInfo = moduleMessages[module] || moduleMessages.general;
  const finalTitle = title || moduleInfo.title;
  const finalDesc = description || moduleInfo.desc;

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center ${className}`}>
      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mb-3">
        <Sparkles size={22} />
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[11px] font-mono font-semibold border border-emerald-800 mb-2">
        <span>🟢 TEMPORADA NUEVA</span>
        <span>·</span>
        <span>{selectedSeason.name}</span>
      </div>
      <h3 className="text-base font-bold text-slate-100 tracking-tight mt-1">{finalTitle}</h3>
      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">{finalDesc}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Error de Carga",
  description = "No se pudieron obtener los datos. Por favor, comprueba tu conexión o reintenta en unos instantes.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center text-red-400 mb-3">
        <AlertCircle size={22} />
      </div>
      <h3 className="text-base font-bold text-red-200 uppercase tracking-tight">{title}</h3>
      <p className="text-xs text-red-300/80 max-w-md mx-auto mt-1.5 leading-relaxed">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          Reintentar Carga
        </button>
      )}
    </div>
  );
}
