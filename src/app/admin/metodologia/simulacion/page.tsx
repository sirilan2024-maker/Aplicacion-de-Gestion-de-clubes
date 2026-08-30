"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function SimulacionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/metodologia/simulador");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 animate-pulse">
        <Sparkles className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Redirigiendo al Simulador Metodológico...</h2>
        <p className="text-xs text-slate-500 mt-1">
          La herramienta de simulación y sandbox está disponible en el simulador canónico.
        </p>
      </div>
      <Link
        href="/admin/metodologia/simulador"
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs mt-2"
      >
        <span>Ir a Simulador</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
