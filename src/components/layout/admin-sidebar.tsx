"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Users,
  ClipboardCheck,
  BarChart3,
  Wallet,
  Settings,
  Brain,
  Timer,
  Globe,
  Target,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTeamName, setActiveTeamName] = useState("Equipo")

  const isActive = (href: string) => pathname.startsWith(href)

  const match = pathname.match(/\/admin\/e\/([^\/]+)/)
  const activeTeamId = match ? match[1] : null

  React.useEffect(() => {
    if (activeTeamId) {
      const supabase = createClient();
      supabase.from("equipos").select("name").eq("id", activeTeamId).single().then(({data}) => {
        if (data) setActiveTeamName(data.name);
      });
    }
  }, [activeTeamId]);

  let navGroups = [
    {
      label: "PRINCIPAL",
      items: [
        { name: "Inicio", href: "/admin/inicio", icon: LayoutDashboard },
        { name: "Calendario FFCV", href: "/admin/calendario-ffcv", icon: Database },
        { name: "Partidos", href: "/admin/partidos", icon: Trophy },
        { name: "Eventos", href: "/admin/eventos", icon: Target },
        { name: "Eventos", href: "/admin/calendario", icon: CalendarDays },
      ],
    },
    {
      label: "CLUB",
      items: [
        { name: "Jugadores", href: "/admin/jugadores", icon: Users },
        { name: "Equipos", href: "/admin/equipos", icon: Shield },
        { name: "Asistencia", href: "/admin/asistencia", icon: ClipboardCheck },
        { name: "Estadísticas", href: "/admin/estadisticas", icon: BarChart3 },
      ],
    },
    {
      label: "GESTIÓN",
      items: [
        { name: "Tesorería", href: "/admin/tesoreria", icon: Wallet },
        { name: "Secretaría", href: "/admin/secretaria", icon: Settings },
        { name: "Metodología", href: "/admin/metodologia", icon: Brain },
        { name: "Temporadas", href: "/admin/temporadas", icon: Timer },
      ],
    },
    {
      label: "INTELIGENCIA ARTIFICIAL & API",
      items: [
        { name: "Informes IA", href: "/admin/informes-ia", icon: Brain },
        { name: "FFCV / Novanet", href: "/admin/ffcv-api", icon: Globe },
      ],
    }
  ]

  if (activeTeamId) {
    navGroups.unshift({
      label: `GESTIÓN: ${activeTeamName.toUpperCase()}`,
      items: [
        { name: "Plantilla",    href: `/admin/e/${activeTeamId}/jugadores`, icon: Users },
        { name: "Partidos",     href: `/admin/e/${activeTeamId}/partidos`, icon: Trophy },
        { name: "Eventos",   href: `/admin/e/${activeTeamId}/calendario`, icon: CalendarDays },
        { name: "Asistencia",   href: `/admin/e/${activeTeamId}/asistencia`, icon: ClipboardCheck },
        { name: "Mensajes",     href: `/admin/e/${activeTeamId}/mensajes`, icon: MessageSquare },
      ]
    });
  }

  // Fix Missing Shield icon in import by importing it
  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-950 text-slate-300 border-r border-slate-800 transition-all duration-300 relative",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 shrink-0 items-center px-4 border-b border-slate-800 bg-slate-900/50">
        <div className={cn("flex items-center gap-3 overflow-hidden", collapsed ? "justify-center w-full" : "")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight truncate">Sporting Saladar</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Super Admin ERP</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 shadow-sm hover:text-white"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <nav className="space-y-6 px-3">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {!collapsed && (
                <div className="mb-2 px-3 text-xs font-black tracking-widest text-slate-500">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      "group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isActive(item.href)
                        ? "bg-blue-600/10 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors duration-200",
                        isActive(item.href) ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300",
                        collapsed ? "mx-auto" : "mr-3"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4 bg-slate-900/50">
        <Link href={activeTeamId ? "/admin/equipos" : "/dashboard"} className={cn(
          "flex items-center text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>{activeTeamId ? "Volver a Superadmin" : "Salir a Dashboard"}</span>}
        </Link>
      </div>
    </aside>
  )
}

function Shield(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
}
