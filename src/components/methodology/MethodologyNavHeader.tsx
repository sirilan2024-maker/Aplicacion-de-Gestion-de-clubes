"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  BookOpen,
  Users,
  Building2,
  ChevronDown,
  Brain,
  Award,
  Layers,
  Sparkles,
  Plus,
  ArrowRight,
  Target
} from "lucide-react";

interface MethodologyNavHeaderProps {
  currentRole?: string;
}

export function MethodologyNavHeader({ currentRole }: MethodologyNavHeaderProps) {
  const pathname = usePathname();

  // Estados para dropdowns
  const [openMenu, setOpenMenu] = useState<"planificacion" | "curriculo" | "jugadores" | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  // Chequeo de rutas activas para cada pilar
  const isOperativaActive = pathname === "/admin/metodologia/operativa";
  
  const isPlanificacionActive = 
    pathname.startsWith("/admin/metodologia/planificacion") ||
    pathname.startsWith("/admin/metodologia/sesiones");

  const isCurriculoActive = 
    pathname.startsWith("/admin/metodologia/curriculo") ||
    pathname.startsWith("/admin/metodologia/biblioteca") ||
    pathname.startsWith("/admin/metodologia/principios");

  const isJugadoresActive = 
    pathname.startsWith("/admin/metodologia/jugadores") ||
    pathname.startsWith("/admin/metodologia/evaluacion");

  const isDireccionActive = 
    pathname === "/admin/metodologia/direccion" ||
    [
      "/admin/metodologia/ejecutiva",
      "/admin/metodologia/centro-control",
      "/admin/metodologia/evolucion",
      "/admin/metodologia/gobierno",
      "/admin/metodologia/gobernanza",
      "/admin/metodologia/decision",
      "/admin/metodologia/calidad",
      "/admin/metodologia/auditoria",
      "/admin/metodologia/optimizacion",
    ].some(r => pathname.startsWith(r));

  return (
    <nav ref={navRef} className="relative flex flex-wrap items-center gap-1.5 print:hidden z-30" aria-label="Navegación Metodológica">
      
      {/* PILAR 1: CENTRO OPERATIVO */}
      <Link
        href="/admin/metodologia/operativa"
        className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-2xs ${
          isOperativaActive
            ? "bg-purple-600 text-white shadow-xs"
            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        <Activity className={`w-3.5 h-3.5 shrink-0 ${isOperativaActive ? "text-white" : "text-purple-600"}`} />
        <span>Operativa</span>
      </Link>

      {/* PILAR 2: PLANIFICACIÓN */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "planificacion" ? null : "planificacion")}
          className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-2xs ${
            isPlanificacionActive
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
          aria-expanded={openMenu === "planificacion"}
        >
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${isPlanificacionActive ? "text-white" : "text-blue-600"}`} />
          <span>Planificación</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${openMenu === "planificacion" ? "rotate-180" : ""}`} />
        </button>

        {openMenu === "planificacion" && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 z-50">
            <Link
              href="/admin/metodologia/planificacion"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/planificacion")
                  ? "bg-blue-50 text-blue-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Macrociclos & Microciclos</div>
                <div className="text-[10px] text-slate-400">Estructuración temporal por temporadas</div>
              </div>
            </Link>

            <Link
              href="/admin/metodologia/sesiones"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/sesiones") && !pathname.includes("/nueva")
                  ? "bg-blue-50 text-blue-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Target className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Sesiones de Entrenamiento</div>
                <div className="text-[10px] text-slate-400">Listado, ejecución y evaluación</div>
              </div>
            </Link>

            <Link
              href="/admin/metodologia/sesiones/nueva"
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 border-t border-slate-100"
            >
              <Plus className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-indigo-600 leading-tight">+ Diseñar Nueva Sesión</div>
                <div className="text-[10px] text-slate-400">Constructor en 5 fases de sesión</div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* PILAR 3: CURRÍCULO & BIBLIOTECA */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "curriculo" ? null : "curriculo")}
          className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-2xs ${
            isCurriculoActive
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
          aria-expanded={openMenu === "curriculo"}
        >
          <Brain className={`w-3.5 h-3.5 shrink-0 ${isCurriculoActive ? "text-white" : "text-indigo-600"}`} />
          <span>Currículo & Biblioteca</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${openMenu === "curriculo" ? "rotate-180" : ""}`} />
        </button>

        {openMenu === "curriculo" && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 z-50">
            <Link
              href="/admin/metodologia/curriculo"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/curriculo") || pathname.startsWith("/admin/metodologia/principios")
                  ? "bg-indigo-50 text-indigo-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Brain className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Currículo & Modelo de Juego</div>
                <div className="text-[10px] text-slate-400">Etapas formativas (U6-Senior) y fases</div>
              </div>
            </Link>

            <Link
              href="/admin/metodologia/biblioteca"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/biblioteca")
                  ? "bg-indigo-50 text-indigo-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Biblioteca de Tareas</div>
                <div className="text-[10px] text-slate-400">199 ejercicios oficiales, PDF y QR</div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* PILAR 4: JUGADORES & EVALUACIÓN */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === "jugadores" ? null : "jugadores")}
          className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-2xs ${
            isJugadoresActive
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
          aria-expanded={openMenu === "jugadores"}
        >
          <Users className={`w-3.5 h-3.5 shrink-0 ${isJugadoresActive ? "text-white" : "text-emerald-600"}`} />
          <span>Jugadores & Evaluación</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${openMenu === "jugadores" ? "rotate-180" : ""}`} />
        </button>

        {openMenu === "jugadores" && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 z-50">
            <Link
              href="/admin/metodologia/evaluacion"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/evaluacion")
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Evaluación Formativa</div>
                <div className="text-[10px] text-slate-400">Rúbricas de 5 niveles y deltas M3</div>
              </div>
            </Link>

            <Link
              href="/admin/metodologia/jugadores"
              className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                pathname.startsWith("/admin/metodologia/jugadores")
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold leading-tight">Directorio de Plantilla</div>
                <div className="text-[10px] text-slate-400">Censo, asistencia y objetivos de jugador</div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* PILAR 5: DIRECCIÓN */}
      <Link
        href="/admin/metodologia/direccion"
        className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-2xs ${
          isDireccionActive
            ? "bg-slate-900 text-white shadow-xs"
            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDireccionActive ? "text-white" : "text-slate-700"}`} />
        <span>Dirección</span>
      </Link>

    </nav>
  );
}
