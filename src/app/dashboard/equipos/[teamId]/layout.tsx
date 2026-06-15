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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none justify-center items-center flex gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
              <Download size={18} />
              Exportar
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-6 flex gap-6 overflow-x-auto">
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
      </div>

      {/* PAGE CONTENT */}
      <div>
        {children}
      </div>
    </div>
  );
}
