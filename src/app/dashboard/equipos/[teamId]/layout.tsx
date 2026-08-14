"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Users, CalendarIcon, LayoutList, Download, Activity, Trophy, Plus, BarChart3 } from "lucide-react";
import Link from "next/link";
import { ExportProvider } from "@/components/providers/ExportContext";
import { ExportButton } from "@/components/ui/ExportButton";

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
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    async function fetchTeamAndRole() {
      const supabase = createClient();
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
        const role = (profile?.role || '').toLowerCase().trim();
        const readOnlyRoles = ['socio', 'utillero', 'directivo', 'secretario', 'tesorero', 'jugador', 'tutor', 'familia', 'family', 'delegado'];
        if (readOnlyRoles.includes(role)) {
          setIsReadOnly(true);
        }
      }

      if (!teamId) return;
      const { data, error } = await supabase
        .from('teams')
        .select("name")
        .eq("id", teamId)
        .single();

      if (!error && data) {
        setTeamName(data.name);
      } else {
        setTeamName("Equipo Desconocido");
      }
    }
    fetchTeamAndRole();
  }, [teamId]);

  const tabs = [
    { name: "Plantilla", href: `/dashboard/equipos/${teamId}/plantilla`, icon: Users },
    { name: "Partidos", href: `/dashboard/equipos/${teamId}/partidos`, icon: Trophy },
    { name: "Entrenamientos", href: `/dashboard/equipos/${teamId}/entrenamientos`, icon: CalendarIcon },
    { name: "Rendimiento", href: `/dashboard/equipos/${teamId}/rendimiento`, icon: Activity },
    { name: "Asistencia", href: `/dashboard/equipos/${teamId}/asistencia`, icon: LayoutList },
    { name: "Eventos", href: `/dashboard/equipos/${teamId}/calendario`, icon: CalendarIcon },
    { name: "Estadísticas", href: `/dashboard/equipos/${teamId}/estadisticas`, icon: BarChart3 },
  ];

  return (
    <ExportProvider>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50/30 min-h-screen">
      
      {/* GLOBAL HEADER */}
      {!isReadOnly && (
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
              {pathname.includes('partidos') && (
                <button 
                  onClick={() => router.push(`/dashboard/equipos/${teamId}/partidos?newMatch=true`)}
                  className="w-full sm:w-auto justify-center items-center flex gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
                >
                  <Plus size={18} />
                  Nuevo Partido
                </button>
              )}
              <ExportButton />
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

          {/* TABS NAVIGATION (Mobile Dropdown Destacado) */}
          <div className="sm:hidden px-4 pb-4 pt-2">
            <div className="relative">
              <select 
                value={tabs.find(tab => pathname.includes(tab.href))?.href || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    router.push(e.target.value);
                  }
                }}
                className="w-full bg-white border-2 border-blue-600 text-slate-800 font-extrabold text-xs rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer pr-10"
              >
                <option value="" disabled className="bg-white text-slate-400">Seleccionar vista del equipo...</option>
                {tabs.map(tab => (
                  <option key={tab.name} value={tab.href} className="bg-white text-slate-800 font-bold py-1">
                    {tab.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-blue-600 font-bold">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <div>
        {children}
      </div>
    </div>
    </ExportProvider>
  );
}
