"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Zap, ShieldAlert } from "lucide-react";

export interface CoordinatorBannerAlert {
  id: string;
  type: "sancion" | "apercibido" | "sin_entrenador" | "lesion" | "horario_solapado";
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  teamId?: string;
  playerId?: string;
}

interface CriticalAlertsBannerProps {
  alerts: CoordinatorBannerAlert[];
}

export function CriticalAlertsBanner({ alerts }: CriticalAlertsBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const errorAlerts = alerts.filter((a) => a.severity === "error");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          Alertas Críticas y Operativas ({alerts.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {alerts.slice(0, 6).map((alert) => {
          const isError = alert.severity === "error";
          const isWarning = alert.severity === "warning";

          const bgClass = isError
            ? "bg-red-50/90 border-red-200 text-red-800"
            : isWarning
            ? "bg-amber-50/90 border-amber-200 text-amber-800"
            : "bg-blue-50/90 border-blue-200 text-blue-800";

          const IconComponent = isError ? ShieldAlert : isWarning ? AlertTriangle : Info;

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-start gap-2.5 shadow-xs transition-all ${bgClass}`}
            >
              <IconComponent className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight truncate">{alert.title}</p>
                <p className="text-[11px] leading-snug mt-0.5 opacity-90">{alert.message}</p>
              </div>
              {alert.teamId && (
                <Link
                  href={`/dashboard/equipos/${alert.teamId}/plantilla`}
                  className="shrink-0 text-[10px] font-bold underline ml-1 self-center hover:opacity-100"
                >
                  Ver
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
