"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Zap, ShieldAlert, HeartPulse, UserX, Clock, MessageSquare } from "lucide-react";

export interface CoordinatorBannerAlert {
  id: string;
  type: "sancion" | "apercibido" | "lesion" | "falta_asistencia" | "cambio_horario" | "mensaje_interno" | "horario_solapado" | "sin_entrenador";
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  teamId?: string;
  playerId?: string;
  actionType?: "cartelera" | "chat" | "link";
  actionText?: string;
  actionUrl?: string;
}

interface CriticalAlertsBannerProps {
  alerts: CoordinatorBannerAlert[];
  onOpenCartelera?: () => void;
}

export function CriticalAlertsBanner({ alerts, onOpenCartelera }: CriticalAlertsBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            REQUIERE ATENCIÓN ({alerts.length})
          </h2>
        </div>
        <span className="text-[10px] font-extrabold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
          Acción requerida
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {alerts.slice(0, 6).map((alert) => {
          const isError = alert.severity === "error";
          const isWarning = alert.severity === "warning";

          let bgClass = "bg-blue-50/90 border-blue-200 text-blue-900";
          let IconComponent = Info;

          if (alert.type === "sancion") {
            bgClass = "bg-red-50/90 border-red-200 text-red-900";
            IconComponent = ShieldAlert;
          } else if (alert.type === "apercibido") {
            bgClass = "bg-amber-50/90 border-amber-200 text-amber-900";
            IconComponent = AlertTriangle;
          } else if (alert.type === "lesion") {
            bgClass = "bg-rose-50/90 border-rose-200 text-rose-900";
            IconComponent = HeartPulse;
          } else if (alert.type === "falta_asistencia") {
            bgClass = "bg-orange-50/90 border-orange-200 text-orange-900";
            IconComponent = UserX;
          } else if (alert.type === "cambio_horario") {
            bgClass = "bg-indigo-50/90 border-indigo-200 text-indigo-900";
            IconComponent = Clock;
          } else if (alert.type === "mensaje_interno") {
            bgClass = "bg-sky-50/90 border-sky-200 text-sky-900";
            IconComponent = MessageSquare;
          } else if (isError) {
            bgClass = "bg-red-50/90 border-red-200 text-red-900";
            IconComponent = ShieldAlert;
          } else if (isWarning) {
            bgClass = "bg-amber-50/90 border-amber-200 text-amber-900";
            IconComponent = AlertTriangle;
          }

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-start gap-2.5 shadow-xs transition-all ${bgClass}`}
            >
              <IconComponent className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 break-words">
                <p className="text-xs font-bold leading-tight">{alert.title}</p>
                <p className="text-[11px] leading-snug mt-0.5 opacity-90 whitespace-pre-line">{alert.message}</p>
              </div>
              {alert.type === "cambio_horario" ? (
                <button
                  type="button"
                  onClick={() => onOpenCartelera?.()}
                  className="shrink-0 text-[10px] font-black underline ml-1 self-center hover:opacity-100 cursor-pointer text-indigo-700 bg-white/70 hover:bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 shadow-2xs transition-all active:scale-95"
                  title="Abrir Cartelera de la Jornada"
                >
                  {alert.actionText || "Cartelera Jornada"}
                </button>
              ) : alert.type === "mensaje_interno" ? (
                <Link
                  href={alert.actionUrl || "/dashboard/mensajes"}
                  className="shrink-0 text-[10px] font-black underline ml-1 self-center hover:opacity-100 text-sky-700 bg-white/70 hover:bg-white px-2.5 py-1.5 rounded-lg border border-sky-200 shadow-2xs transition-all active:scale-95"
                  title="Abrir Mensajería"
                >
                  {alert.actionText || "Ver Chat"}
                </Link>
              ) : alert.teamId ? (
                <Link
                  href={`/dashboard/equipos/${alert.teamId}/plantilla`}
                  className="shrink-0 text-[10px] font-bold underline ml-1 self-center hover:opacity-100"
                >
                  Ver
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
