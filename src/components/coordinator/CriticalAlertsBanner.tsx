"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, Zap, ShieldAlert, HeartPulse, UserX, Clock, MessageSquare, ClipboardCheck, Bell, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { notifyCoachPendingAttendanceAction } from "@/app/actions/coordinator-actions";

export interface CoordinatorBannerAlert {
  id: string;
  type: "sancion" | "apercibido" | "lesion" | "falta_asistencia" | "cambio_horario" | "mensaje_interno" | "horario_solapado" | "sin_entrenador" | "sin_pasar_lista";
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  teamId?: string;
  playerId?: string;
  eventId?: string;
  date?: string;
  startTime?: string;
  eventTitle?: string;
  coachName?: string | null;
  actionType?: "cartelera" | "chat" | "link";
  actionText?: string;
  actionUrl?: string;
}

interface CriticalAlertsBannerProps {
  alerts: CoordinatorBannerAlert[];
  onOpenCartelera?: () => void;
}

export function CriticalAlertsBanner({ alerts, onOpenCartelera }: CriticalAlertsBannerProps) {
  const [notifyingAlertId, setNotifyingAlertId] = useState<string | null>(null);
  const [notifiedAlerts, setNotifiedAlerts] = useState<Record<string, boolean>>({});

  if (!alerts || alerts.length === 0) return null;

  const handleNotifyCoach = async (alert: CoordinatorBannerAlert) => {
    if (!alert.teamId || notifyingAlertId) return;
    setNotifyingAlertId(alert.id);
    try {
      const res = await notifyCoachPendingAttendanceAction({
        teamId: alert.teamId,
        eventId: alert.eventId,
        date: alert.date || new Date().toISOString().split("T")[0],
        startTime: alert.startTime,
        title: alert.eventTitle,
      });

      if (res.success) {
        setNotifiedAlerts((prev) => ({ ...prev, [alert.id]: true }));
        toast.success(res.message || "Aviso enviado al entrenador correctamente");
      } else {
        toast.error(res.error || "No se pudo avisar al entrenador");
      }
    } catch (err: any) {
      toast.error("Error al avisar: " + err.message);
    } finally {
      setNotifyingAlertId(null);
    }
  };

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
          } else if (alert.type === "sin_pasar_lista") {
            bgClass = "bg-amber-50/90 border-amber-300 text-amber-950";
            IconComponent = ClipboardCheck;
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
              ) : alert.type === "sin_pasar_lista" ? (
                <div className="flex items-center gap-1.5 self-center shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => handleNotifyCoach(alert)}
                    disabled={notifyingAlertId === alert.id || notifiedAlerts[alert.id]}
                    className={`shrink-0 flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg border shadow-2xs transition-all active:scale-95 cursor-pointer ${
                      notifiedAlerts[alert.id]
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default"
                        : "bg-white hover:bg-amber-100 text-amber-950 border-amber-300"
                    }`}
                    title="Avisar al entrenador por campanita, correo y notificación móvil"
                  >
                    {notifyingAlertId === alert.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
                    ) : notifiedAlerts[alert.id] ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{notifiedAlerts[alert.id] ? "Avisado" : "Avisar Entrenador"}</span>
                  </button>
                  {alert.actionUrl && (
                    <Link
                      href={alert.actionUrl}
                      className="shrink-0 text-[10px] font-black underline bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-950 shadow-2xs transition-all active:scale-95"
                      title={alert.actionText || "Pasar Lista"}
                    >
                      {alert.actionText || "Pasar Lista"}
                    </Link>
                  )}
                </div>
              ) : alert.actionUrl ? (
                <Link
                  href={alert.actionUrl}
                  className="shrink-0 text-[10px] font-black underline ml-1 self-center hover:opacity-100 bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-lg border border-current/20 shadow-2xs transition-all active:scale-95"
                  title={alert.actionText || "Ver"}
                >
                  {alert.actionText || "Ver"}
                </Link>
              ) : alert.type === "mensaje_interno" ? (
                <Link
                  href="/dashboard/mensajes"
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
