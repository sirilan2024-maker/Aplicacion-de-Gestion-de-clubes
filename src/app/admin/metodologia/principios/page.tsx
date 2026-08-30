"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";

export default function PrincipiosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/metodologia/curriculo?tab=fases");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 animate-pulse">
        <Brain className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Redirigiendo a Currículo & Modelo de Juego...</h2>
        <p className="text-xs text-slate-500 mt-1">
          La gestión de principios y fases de juego ahora está unificada en la pantalla canónica de Currículo.
        </p>
      </div>
      <Link
        href="/admin/metodologia/curriculo?tab=fases"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs mt-2"
      >
        <span>Ir a Currículo & Modelo de Juego</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
