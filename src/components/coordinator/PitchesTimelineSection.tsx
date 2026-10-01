"use client";

import React, { useState, useMemo } from "react";
import { Calendar, Clock, MapPin, User, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { PitchTimelineSlot } from "@/types/coordinator";

interface PitchesTimelineSectionProps {
  slots: PitchTimelineSlot[];
  availablePitches: string[];
  selectedDate: string;
  onDateChange?: (date: string) => void;
}

const TIME_BLOCKS = [
  "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

export function PitchesTimelineSection({
  slots,
  availablePitches,
  selectedDate,
  onDateChange,
}: PitchesTimelineSectionProps) {
  // Asegurar que haya al menos los campos estándar si no hay aún eventos en ese día
  const pitches = useMemo(() => {
    if (availablePitches.length > 0) return availablePitches;
    return ["Campo Principal (F11)", "Campo Anexo (F8 A)", "Campo Anexo (F8 B)"];
  }, [availablePitches]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      {/* Cabecera y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Agenda de Entrenamientos y Ocupación de Campos
            </h2>
            <p className="text-xs text-slate-500">
              Distribución horaria por instalaciones deportivas y entrenadores asignados
            </p>
          </div>
        </div>

        {/* Controles de Navegación de Fecha */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Hoy
          </button>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 capitalize">
              {formatDateDisplay(selectedDate)}
            </span>
            <button
              onClick={handleNextDay}
              className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline / Matriz de Campos */}
      {slots.length === 0 ? (
        <div className="py-10 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-600">No hay sesiones de entrenamiento programadas para este día.</p>
          <p className="mt-0.5">Usa los controles superiores para revisar otro día de la semana.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tarjetas de Campos con sus bloques asignados */}
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
                      <span>{pitch}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {pitchSlots.length} sesión{pitchSlots.length !== 1 ? "es" : ""}
                    </span>
                  </div>

                  {pitchSlots.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-4 text-center">
                      Campo libre en este día
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
                              {slot.startTime} – {slot.endTime}
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
                            <div className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              <span>Sin entrenador</span>
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
