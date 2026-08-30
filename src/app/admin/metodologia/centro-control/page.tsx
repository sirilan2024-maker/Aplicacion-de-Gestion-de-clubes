"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default function CentroControlRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/metodologia/direccion");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 animate-pulse">
        <Building2 className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Redirigiendo a Dirección Deportiva...</h2>
        <p className="text-xs text-slate-500 mt-1">
          La visión integral 360º del club y los indicadores de calidad están unificados en Dirección.
        </p>
      </div>
      <Link
        href="/admin/metodologia/direccion"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs mt-2"
      >
        <span>Ir a Dirección Deportiva</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
