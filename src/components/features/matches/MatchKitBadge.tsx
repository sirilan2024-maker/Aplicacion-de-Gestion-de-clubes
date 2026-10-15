"use client";

import React from "react";
import { Shirt, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export interface MatchKitBadgeProps {
  equipacionAsignada?: string | null; // 'primera' | 'segunda' | '1ª Equipación (Azul)' | '2ª Equipación (Roja)'
  equipacionPreparada?: boolean | null;
  conflictoEquipacion?: boolean | null;
  rivalCamisetaColor?: string | null;
  esLocal?: boolean;
  size?: "xs" | "sm" | "md";
  showPreparedStatus?: boolean;
  showConflictDetails?: boolean;
  className?: string;
}

export function MatchKitBadge({
  equipacionAsignada,
  equipacionPreparada,
  conflictoEquipacion,
  rivalCamisetaColor,
  esLocal,
  size = "sm",
  showPreparedStatus = false,
  showConflictDetails = true,
  className = "",
}: MatchKitBadgeProps) {
  // Determinar equipación efectiva
  const rawKit = (equipacionAsignada || "").toLowerCase();
  const isSegunda =
    rawKit.includes("segunda") ||
    rawKit.includes("roja") ||
    rawKit === "2" ||
    (!esLocal && Boolean(conflictoEquipacion));

  const hasConflict = Boolean(conflictoEquipacion);

  // Paleta de colores
  // 1ª Equipación Sporting Saladar: Azul (#2563EB)
  // 2ª Equipación Sporting Saladar: Roja (#DC2626)
  const kitLabel = isSegunda ? "2ª Roja" : "1ª Azul";
  const kitFullName = isSegunda ? "2ª Equipación (Roja)" : "1ª Equipación (Azul)";

  if (size === "xs") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
          isSegunda
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
        } ${className}`}
        title={`${kitFullName}${hasConflict ? " - Rival viste de azul" : ""}`}
      >
        <Shirt className={`w-3 h-3 ${isSegunda ? "text-rose-600 fill-rose-500/20" : "text-blue-600 fill-blue-500/20"}`} />
        <span>{kitLabel}</span>
        {hasConflict && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
      </span>
    );
  }

  if (size === "sm") {
    return (
      <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${
            isSegunda
              ? "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70"
              : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/70"
          }`}
          title={kitFullName}
        >
          <Shirt
            className={`w-3.5 h-3.5 shrink-0 ${
              isSegunda ? "text-rose-600 fill-rose-500/30" : "text-blue-600 fill-blue-500/30"
            }`}
          />
          <span>{kitFullName}</span>
        </span>

        {hasConflict && showConflictDetails && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse"
            title={`Aviso Utillero: El rival viste de azul (${rivalCamisetaColor || "coincidencia de color"}). Se debe vestir la 2ª equipación.`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>⚠️ Rival azul: Llevar 2ª Roja</span>
          </span>
        )}

        {showPreparedStatus && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
              equipacionPreparada
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {equipacionPreparada ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Ropa lista</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Pendiente preparar</span>
              </>
            )}
          </span>
        )}
      </div>
    );
  }

  // Size "md" (Detailed card block)
  return (
    <div
      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        isSegunda
          ? "bg-rose-50/70 border-rose-200 text-rose-950"
          : "bg-blue-50/70 border-blue-200 text-blue-950"
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
            isSegunda
              ? "bg-white border-rose-300 text-rose-600 shadow-2xs"
              : "bg-white border-blue-300 text-blue-600 shadow-2xs"
          }`}
        >
          <Shirt className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black tracking-tight">{kitFullName}</span>
            {hasConflict && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                Coincidencia Color
              </span>
            )}
          </div>
          <p className="text-[11px] opacity-80 mt-0.5">
            {isSegunda
              ? `Obligatorio 2ª roja: el rival viste de azul (${rivalCamisetaColor || "color registrado en FFCV"}).`
              : "1ª equipación azul oficial del Sporting Saladar."}
          </p>
        </div>
      </div>

      {showPreparedStatus && (
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-black border flex items-center gap-1.5 ${
              equipacionPreparada
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {equipacionPreparada ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Ropa en bolsa / Lista
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Pendiente de preparar
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
