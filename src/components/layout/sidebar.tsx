"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Users,
  ClipboardCheck,
  BarChart3,
  Wallet,
  Target,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  ChevronDown,
  MessageSquare,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  children?: NavItem[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function Sidebar({ signOutAction }: { signOutAction: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clubName, setClubName] = useState<string>("Cargando...")
  const [equipos, setEquipos] = useState<any[]>([])
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const supabase = createClient()

  // Detect active team context from URL (/dashboard/e/[teamId] or /dashboard/equipos/[teamId])
  const match = pathname.match(/\/dashboard\/(?:e|equipos)\/([a-zA-Z0-9-]+)/)
  const potentialTeamId = match ? match[1] : null
  const activeTeam = equipos.find(e => e.id === potentialTeamId)
  const activeTeamId = activeTeam ? activeTeam.id : null

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, club_id")
          .eq("id", user.id)
          .single()
          
        if (profile) {
          setUserRole(profile.role)
          
          if (profile.club_id) {
            const { data: club } = await supabase
              .from("clubs")
              .select("name")
              .eq("id", profile.club_id)
              .single()
              
            if (club) setClubName(club.name)

            // Fetch equipos
            let query = supabase.from("equipos").select("id, name, category").eq("club_id", profile.club_id).order("name")
            if (profile.role === 'coach' || profile.role === 'entrenador' || profile.role === 'delegado') {
              query = query.eq('coach_id', user.id)
            }
            const { data: eqData } = await query
            if (eqData) setEquipos(eqData)
          } else {
            setClubName("Sin Club")
          }
        }
      }
    }
    fetchData()
  }, [supabase])

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  const isVisible = (item: any) => {
    const isAdmin = userRole === "admin" || userRole === "metodologo";
    const isRestrictedClubItem = ["Directorio", "Tesorería", "Secretaría", "Entrenamientos"].includes(item.name);
    if (isRestrictedClubItem) return isAdmin;
    return true;
  }

  // --- Dynamic Navigation ---
  let navGroups: NavGroup[] = []

  if (activeTeamId) {
    // TEAM CONTEXT
    navGroups = [
      {
        label: `Gestión: ${activeTeam?.name || 'Equipo'}`,
        items: [
          { name: "Plantilla",    href: `/dashboard/equipos/${activeTeamId}/plantilla`, icon: Users },
          { name: "Partidos",     href: `/dashboard/equipos/${activeTeamId}/partidos`, icon: Trophy },
          { name: "Calendario",   href: `/dashboard/equipos/${activeTeamId}/calendario`, icon: CalendarDays },
          { name: "Asistencia",   href: `/dashboard/equipos/${activeTeamId}/asistencia`, icon: ClipboardCheck },
          { name: "Rendimiento",  href: `/dashboard/equipos/${activeTeamId}/rendimiento`, icon: Activity },
          { name: "Entrenamientos", href: `/dashboard/equipos/${activeTeamId}/entrenamientos`, icon: Target },
          { name: "Mensajes",     href: `/dashboard/equipos/${activeTeamId}/mensajes`, icon: MessageSquare },
        ],
      },
      {
        label: "Volver",
        items: [
          { name: "Global Club",  href: `/dashboard`, icon: LayoutDashboard },
        ]
      }
    ]
  } else {
    // GLOBAL CONTEXT
    navGroups = [
      {
        label: "General",
        items: [
          { name: "Inicio",       href: "/dashboard",            icon: LayoutDashboard },
          { name: "Partidos",     href: "/dashboard/matches",    icon: Trophy },
          { name: "Eventos",      href: "/dashboard/events",     icon: CalendarDays    },
        ],
      },
      {
        label: "Club",
        items: [
          { name: "Super Admin ERP", href: "/admin", icon: Shield },
          { name: "Directorio", href: "/dashboard/club/miembros", icon: Users },
          { name: "Estadísticas", href: "/dashboard/club/estadisticas", icon: BarChart3 },
          { name: "Equipos", href: "/dashboard/equipos", icon: Target },
          { name: "Entrenamientos", href: "/dashboard/entrenamientos", icon: Target },
          { name: "Tesorería", href: "/dashboard/treasury", icon: Wallet },
          { name: "Secretaría", href: "/dashboard/secretaria", icon: Settings },
          { name: "Configuración", href: "/admin/configuracion", icon: Settings },
        ],
      },
    ]
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* ── Brand ──────────────────────────────── */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-gray-100 overflow-hidden shrink-0",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-900 truncate leading-tight">
              {clubName}
            </p>
            <p className="text-[11px] text-gray-400 truncate">Temp. 2024/25</p>
          </div>
        )}
      </div>

      {/* ── Context Selector ──────────────────────────────── */}
      {!collapsed && (
        <div className="relative px-4 py-3 border-b border-gray-100">
          <button 
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-2 transition-colors"
          >
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Contexto Actual</span>
              <span className="text-sm font-bold text-slate-900 truncate">
                {activeTeam ? activeTeam.name : "Global Club"}
              </span>
            </div>
            <ChevronDown size={14} className={cn("text-gray-500 transition-transform", showTeamDropdown && "rotate-180")} />
          </button>
          
          {showTeamDropdown && (
            <div className="absolute top-[100%] left-4 right-4 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setShowTeamDropdown(false); router.push("/dashboard"); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors",
                  !activeTeamId ? "text-blue-700 bg-blue-50/50" : "text-gray-700"
                )}
              >
                🌍 Global Club
              </button>
              {equipos.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => { setShowTeamDropdown(false); router.push(`/dashboard/equipos/${eq.id}/plantilla`); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors",
                    activeTeamId === eq.id ? "text-blue-700 font-bold bg-blue-50/50" : "text-gray-700 font-medium"
                  )}
                >
                  🛡️ {eq.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(isVisible) as NavItem[]
          if (visibleItems.length === 0) return null
          
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-2">
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className="my-2 mx-auto w-5 border-t border-gray-200" />
              )}
              <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href)
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0
                    return (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.name : undefined}
                          className={cn(
                            "relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 group",
                            collapsed && "justify-center",
                            active
                              ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/50"
                              : "text-slate-700 hover:text-slate-900 hover:bg-gray-100"
                          )}
                        >
                          {/* active indicator bar */}
                          {active && !collapsed && (
                            <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-blue-600" />
                          )}
                          <item.icon
                            size={18}
                            className={cn(
                              "shrink-0 transition-colors",
                              active
                                ? "text-blue-600"
                                : "text-slate-400 group-hover:text-slate-600"
                            )}
                          />
                          {!collapsed && item.name}
                        </Link>
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Footer ─────────────────────────────── */}
      <div
        className={cn(
          "border-t border-gray-100 p-3 space-y-1",
          collapsed && "flex flex-col items-center"
        )}
      >
        <Link
          href="/dashboard/settings"
          title={collapsed ? "Ajustes" : undefined}
          className={cn(
            "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-gray-100 transition-all",
            collapsed && "justify-center w-full"
          )}
        >
          <Settings size={18} className="shrink-0 text-slate-400" />
          {!collapsed && "Ajustes"}
        </Link>

        <form action={signOutAction} className={collapsed ? "w-full" : ""}>
          <button
            type="submit"
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </form>
      </div>

      {/* ── Collapse Toggle ─────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-[56px] z-20 hidden md:flex w-7 h-7 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-slate-900 hover:border-gray-300 transition-all hover:scale-105"
      >
        {collapsed
          ? <ChevronRight size={14} />
          : <ChevronLeft  size={14} />
        }
      </button>
    </aside>
  )
}
