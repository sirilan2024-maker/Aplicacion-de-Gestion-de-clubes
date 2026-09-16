"use client";

import React, { useEffect, useState } from "react";
import { getImpersonationStatusAction, stopImpersonationAction } from "@/app/actions/impersonation-actions";
import { ShieldAlert, LogOut, Eye, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function ImpersonationBanner() {
  const [status, setStatus] = useState<{
    isImpersonating: boolean;
    impersonatedName?: string;
    impersonatedRole?: string;
  }>({ isImpersonating: false });
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await getImpersonationStatusAction();
        if (res.isImpersonating) {
          setStatus({
            isImpersonating: true,
            impersonatedName: res.impersonatedName,
            impersonatedRole: res.impersonatedRole,
          });
        } else {
          setStatus({ isImpersonating: false });
        }
      } catch (e) {
        // ignore
      }
    }
    checkStatus();
  }, []);

  if (!status.isImpersonating) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await stopImpersonationAction();
      if (res.success && res.redirectUrl) {
        toast.success("Has salido del modo suplantación");
        window.location.href = res.redirectUrl;
      }
    } catch (e) {
      toast.error("Error al salir de la suplantación");
    } finally {
      setStopping(false);
    }
  };

  const roleDisplayNames: Record<string, string> = {
    admin: 'Administrador',
    superadmin: 'Superadministrador',
    coordinador: 'Coordinador',
    coach: 'Entrenador',
    entrenador: 'Entrenador',
    delegado: 'Delegado',
    utillero: 'Utillero',
    secretario: 'Secretario',
    tesorero: 'Tesorero',
    directivo: 'Directivo',
    familia: 'Familia / Tutor',
    family: 'Familia / Tutor',
    tutor: 'Familia / Tutor',
    jugador: 'Jugador',
  };

  const roleText = roleDisplayNames[status.impersonatedRole || ''] || status.impersonatedRole || 'Usuario';

  return (
    <div className="bg-amber-500 text-slate-950 font-medium px-4 py-2 text-xs md:text-sm flex flex-wrap items-center justify-between gap-2 shadow-lg sticky top-0 z-[9999] border-b border-amber-600 animate-in slide-in-from-top">
      <div className="flex items-center gap-2 font-bold">
        <ShieldAlert className="w-5 h-5 shrink-0 text-slate-900 animate-pulse" />
        <span>
          MODO SUPLANTACIÓN ACTIVO: Estás viendo la app como{' '}
          <span className="underline decoration-2 font-extrabold">{status.impersonatedName}</span>{' '}
          ({roleText})
        </span>
      </div>
      <button
        onClick={handleStop}
        disabled={stopping}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50"
      >
        {stopping ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span>Salir y Volver a Admin</span>
      </button>
    </div>
  );
}
