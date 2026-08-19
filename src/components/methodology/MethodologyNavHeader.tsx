"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Building2, 
  Sliders, 
  ChevronDown, 
  Brain, 
  LayoutDashboard, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle, 
  History, 
  LineChart
} from "lucide-react";

interface MethodologyNavHeaderProps {
  currentRole?: string;
}

export function MethodologyNavHeader({ currentRole }: MethodologyNavHeaderProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [pathname]);

  const isOperativaActive = pathname === "/admin/metodologia/operativa";
  const isSimulacionActive = pathname === "/admin/metodologia/simulador" || pathname === "/admin/metodologia/simulacion";
  
  const isDireccionActive = [
    "/admin/metodologia/direccion",
    "/admin/metodologia/ejecutiva",
    "/admin/metodologia/centro-control",
    "/admin/metodologia/evolucion",
    "/admin/metodologia/gobierno",
    "/admin/metodologia/gobernanza",
    "/admin/metodologia/decision",
    "/admin/metodologia/calidad",
    "/admin/metodologia/auditoria",
    "/admin/metodologia/optimizacion",
  ].some(route => pathname.startsWith(route));

  return (
    <div className="relative flex flex-wrap items-center gap-2 print:hidden z-30">
      {/* 1. CENTRO OPERATIVO */}
      <Link
        href="/admin/metodologia/operativa"
        className={`flex items-center gap-2 py-2 px-3.5 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs ${
          isOperativaActive
            ? "bg-purple-700 text-white ring-2 ring-purple-400/50"
            : "bg-purple-600 hover:bg-purple-500 text-white"
        }`}
      >
        <Activity className="w-4 h-4 shrink-0" />
        <span>Centro Operativo</span>
      </Link>

      {/* 2. DIRECCIÓN DEPORTIVA (DROPDOWN ESTRATÉGICO) */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 py-2 px-3.5 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs ${
            isDireccionActive
              ? "bg-indigo-700 text-white ring-2 ring-indigo-400/50"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
          aria-expanded={isDropdownOpen}
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Dirección Deportiva</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 grid gap-3 animate-in fade-in zoom-in-95 duration-150 z-50">
            
            {/* Header del Menú Desplegable */}
            <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Dirección Deportiva & Gobierno
              </span>
              <Link 
                href="/admin/metodologia/direccion" 
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                onClick={() => setIsDropdownOpen(false)}
              >
                Panel General →
              </Link>
            </div>

            {/* SECCIÓN 1: INTELIGENCIA */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Inteligencia
              </div>
              <Link
                href="/admin/metodologia/ejecutiva"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/ejecutiva")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <Brain className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Inteligencia Ejecutiva</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Visión institucional y KPIs estratégicos</div>
                </div>
              </Link>
              <Link
                href="/admin/metodologia/centro-control"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/centro-control")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Centro de Control 360º</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Visión transversal de estado, calidad y ciclo</div>
                </div>
              </Link>
            </div>

            {/* SECCIÓN 2: EVOLUCIÓN Y GOBIERNO */}
            <div className="space-y-1 border-t border-slate-100 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Evolución y Gobierno
              </div>
              <Link
                href="/admin/metodologia/evolucion"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/evolucion")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Evolución Metodológica</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Diagnóstico adaptativo y tendencias de ciclo</div>
                </div>
              </Link>
              <Link
                href="/admin/metodologia/gobierno"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/gobierno")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Gobierno Metodológico</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Validación humana y registro de decisiones</div>
                </div>
              </Link>
            </div>

            {/* SECCIÓN 3: CALIDAD Y AUDITORÍA */}
            <div className="space-y-1 border-t border-slate-100 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Calidad y Auditoría
              </div>
              <Link
                href="/admin/metodologia/calidad"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/calidad")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Calidad y Garantía</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Validación de rigor y completitud de datos</div>
                </div>
              </Link>
              <Link
                href="/admin/metodologia/auditoria"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/auditoria")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <History className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Auditoría Histórica</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Eventos inmutables y reconstrucción temporal</div>
                </div>
              </Link>
            </div>

            {/* SECCIÓN 4: OPTIMIZACIÓN */}
            <div className="space-y-1 border-t border-slate-100 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Optimización
              </div>
              <Link
                href="/admin/metodologia/optimizacion"
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                  pathname.startsWith("/admin/metodologia/optimizacion")
                    ? "bg-indigo-50 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
                onClick={() => setIsDropdownOpen(false)}
              >
                <LineChart className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold leading-tight">Optimización y Benchmarking</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Comparativa comparable y detección de buenas prácticas</div>
                </div>
              </Link>
            </div>

          </div>
        )}
      </div>

      {/* 3. SIMULADOR */}
      <Link
        href="/admin/metodologia/simulador"
        className={`flex items-center gap-2 py-2 px-3.5 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs ${
          isSimulacionActive
            ? "bg-slate-950 text-white ring-2 ring-slate-400/50"
            : "bg-slate-900 hover:bg-slate-800 text-white"
        }`}
      >
        <Sliders className="w-4 h-4 shrink-0" />
        <span>Simulación</span>
      </Link>
    </div>
  );
}
