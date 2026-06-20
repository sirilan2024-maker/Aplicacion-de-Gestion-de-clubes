"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Users, CalendarIcon, LayoutList, Download, Activity, Trophy } from "lucide-react";
import Link from "next/link";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const teamId = typeof params.teamId === "string" ? params.teamId : "";

  const [teamName, setTeamName] = useState("Cargando...");

  useEffect(() => {
    async function fetchTeam() {
      if (!teamId) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("equipos")
        .select("name")
        .eq("id", teamId)
        .single();

      if (!error && data) {
        setTeamName(data.name);
      } else {
        setTeamName("Equipo Desconocido");
      }
    }
    fetchTeam();
  }, [teamId]);

  const tabs = [
    { name: "Plantilla", href: `/dashboard/equipos/${teamId}/plantilla`, icon: Users },
    { name: "Partidos", href: `/dashboard/equipos/${teamId}/partidos`, icon: Trophy },
    { name: "Entrenamientos", href: `/dashboard/equipos/${teamId}/entrenamientos`, icon: CalendarIcon },
    { name: "Rendimiento", href: `/dashboard/equipos/${teamId}/rendimiento`, icon: Activity },
    { name: "Asistencia", href: `/dashboard/equipos/${teamId}/asistencia`, icon: LayoutList },
    { name: "Eventos", href: `/dashboard/equipos/${teamId}/calendario`, icon: CalendarIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50/30 min-h-screen">
      
      {/* GLOBAL HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100">
          <div>
            <button 
              onClick={() => router.push('/dashboard/equipos')}
              className="flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-3 text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-1.5" />
              Volver a Equipos
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{teamName}</h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {pathname.includes('plantilla') && (
              <button 
                onClick={() => router.push(`/dashboard/equipos/${teamId}/anadir-miembros`)}
                className="w-full sm:w-auto justify-center items-center flex gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
              >
                <Users size={18} />
                Añadir miembros
              </button>
            )}
            <button className="w-full sm:w-auto justify-center items-center flex gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
              <Download size={18} />
              Exportar
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION (Desktop) */}
        <div className="hidden sm:flex px-6 gap-6">
          {tabs.map((tab) => {
            const isActive = pathname.includes(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* TABS NAVIGATION (Mobile Dropdown) */}
        <div className="sm:hidden px-4 pb-4 pt-2">
          <select 
            value={tabs.find(tab => pathname.includes(tab.href))?.href || ''}
            onChange={(e) => {
              if (e.target.value) {
                router.push(e.target.value);
              }
            }}
            className="w-full bg-slate-50 border border-gray-200 text-gray-700 font-bold text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236B7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
          >
            <option value="" disabled>Seleccionar vista...</option>
            {tabs.map(tab => (
              <option key={tab.name} value={tab.href}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div>
        {children}
      </div>
    </div>
  );
}
