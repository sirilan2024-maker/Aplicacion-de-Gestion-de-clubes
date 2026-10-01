"use client";

import React, { useState, useMemo } from "react";
import { Calendar, Clock, MapPin, User, AlertCircle, ChevronLeft, ChevronRight, ClipboardCheck, LayoutGrid, List } from "lucide-react";
import { PitchTimelineSlot, UpcomingTrainingItem } from "@/types/coordinator";

interface PitchesTimelineSectionProps {
  slots: PitchTimelineSlot[];
  upcomingTrainings?: UpcomingTrainingItem[];
  availablePitches: string[];
  selectedDate: string;
  onDateChange?: (date: string) => void;
}

export function PitchesTimelineSection({
  slots,
  upcomingTrainings = [],
  availablePitches,
  selectedDate,
  onDateChange,
}: PitchesTimelineSectionProps) {
  const [viewTab, setViewTab] = useState<"upcoming" | "timeline">("upcoming");

  // Campos disponibles
  const pitches = useMemo(() => {
    if (availablePitches.length > 0) return availablePitches;
    return ["Polideportivo Municipal del Saladar", "Estadio Pepe Díaz, El Saladar", "Campo Principal"];
  }, [availablePitches]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrevDay = () => {
    if (!onDateChange) return;
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    if (!onDateChange) return;
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    if (!onDateChange) return;
    onDateChange(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Cabecera y Selector de Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Agenda de Entrenamientos e Instalaciones
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sesiones programadas, campos asignados y entrenadores en tiempo real
            </p>
          </div>
        </div>

        {/* Pestañas de Vista: Próximos Entrenamientos / Ocupación Diaria */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewTab("upcoming")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === "upcoming"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Próximas Sesiones ({upcomingTrainings.length})</span>
          </button>
          <button
            onClick={() => setViewTab("timeline")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewTab === "timeline"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Campos por Día</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: PRÓXIMAS SESIONES DE ENTRENAMIENTO (Listado táctil sin scroll) ── */}
      {viewTab === "upcoming" && (
        <div className="space-y-3">
          {upcomingTrainings.length === 0 ? (
            <div className="py-10 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs space-y-2">
              <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">No hay sesiones de entrenamiento inmediatas programadas.</p>
              <p className="text-[11px] text-slate-400">Puedes consultar la ocupación de campos por día o planificar en el calendario.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingTrainings.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-200 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        {formatDateDisplay(t.date)} · {t.startTime}
                      </span>
                      {t.teamCategory && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {t.teamCategory}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.teamColor || "#6366f1" }}
                      />
                      <p className="text-xs font-black text-slate-900 truncate">
                        {t.teamName}
                      </p>
                    </div>

                    <p className="text-[11px] font-bold text-slate-700 truncate">
                      {t.title}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{t.location}</span>
                    </span>
                    {t.coachName ? (
                      <span className="flex items-center gap-1 text-slate-600 font-semibold truncate shrink-0">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{t.coachName}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium text-[10px]">
                        Entrenador asignado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DISTRIBUCIÓN DE CAMPOS / TIMELINE POR DÍA ── */}
      {viewTab === "timeline" && (
        <div className="space-y-4">
          {/* Navegador de Fecha */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">
              Ocupación del día:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={handlePrevDay}
                  className="p-1 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs font-black text-slate-900 px-2 capitalize">
                  {formatDateDisplay(selectedDate)}
                </span>
                <button
                  onClick={handleNextDay}
                  className="p-1 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Cuadrícula de Campos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pitches.map((pitch) => {
              const pitchSlots = slots
                .filter((s) => s.pitchName.toLowerCase().trim() === pitch.toLowerCase().trim())
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={pitch}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="truncate">{pitch}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {pitchSlots.length} sesión{pitchSlots.length !== 1 ? "es" : ""}
                    </span>
                  </div>

                  {pitchSlots.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-4 text-center">
                      Instalación disponible
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pitchSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-2.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {slot.startTime} {slot.endTime ? `– ${slot.endTime}` : ""}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {slot.teamCategory}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: slot.teamColor || "#6366f1" }}
                            />
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {slot.teamName}
                            </p>
                          </div>

                          {slot.coachName ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{slot.coachName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <span>Entrenamiento oficial</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
