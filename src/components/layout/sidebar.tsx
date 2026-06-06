"use client"

import React from "react"
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
  Target,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const navGroups = [
  {
    label: "General",
    items: [
      { name: "Inicio",       href: "/dashboard",            icon: LayoutDashboard },
      { name: "Eventos",      href: "/dashboard/events",     icon: CalendarDays    },
    ],
  },
  {
    label: "Equipo",
    items: [
      { name: "Competición",  href: "/dashboard/matches",    icon: Trophy          },
      { name: "Plantilla",    href: "/dashboard/players",    icon: Users           },
      { name: "Asistencia",   href: "/dashboard/attendance", icon: ClipboardCheck  },
      { name: "Estadísticas", href: "/dashboard/teams",      icon: BarChart3       },
    ],
  },
  {
    label: "Club",
    items: [
      { name: "Directorio", href: "/dashboard/club/miembros", icon: Users },
      { name: "Equipos", href: "/dashboard/equipos", icon: Target },
      { name: "Entrenamientos", href: "/dashboard/entrenamientos", icon: Target },
      { name: "Tesorería", href: "/dashboard/treasury", icon: Wallet },
      { name: "Secretaría", href: "/dashboard/secretaria", icon: Settings },
    ],
  },
]

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  children?: NavItem[];
};

export function Sidebar({ signOutAction }: { signOutAction: any }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [clubName, setClubName] = useState<string>("Cargando...")
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
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
          } else {
            setClubName("Sin Club")
          }
        }
      }
    }
    fetchUserData()
  }, [supabase])

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  const isVisible = (item: any) => {
    const isAdmin = userRole === "admin";
    const isRestrictedClubItem = ["Directorio", "Tesorería", "Secretaría", "Entrenamientos"].includes(item.name);
    
    if (isRestrictedClubItem) {
      return isAdmin; // Solo el admin ve estas opciones de Club
    }
    
    return true;
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-56"
      )}
    >
      {/* ── Brand ──────────────────────────────── */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-gray-100 overflow-hidden shrink-0",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
          <Shield size={14} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
              {clubName}
            </p>
            <p className="text-[11px] text-gray-400 truncate">Temp. 2024/25</p>
          </div>
        )}
      </div>

      {/* ── Nav ────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(isVisible) as NavItem[]
          if (visibleItems.length === 0) return null
          
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className="my-1 mx-auto w-4 border-t border-gray-100" />
              )}
              <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href)
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0
                    return (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.name : undefined}
                          className={cn(
                            "relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                            collapsed && "justify-center",
                            active
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-900 hover:text-slate-900 hover:bg-gray-50"
                          )}
                        >
                          {/* active indicator bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-blue-600" />
                          )}
                          <item.icon
                            size={17}
                            className={cn(
                              "shrink-0 transition-colors",
                              active
                                ? "text-blue-600"
                                : "text-gray-400 group-hover:text-gray-600"
                            )}
                          />
                          {!collapsed && item.name}
                        </Link>
                        {/* Render children if present */}
                        {hasChildren && (
                          <div className={cn("ml-4", collapsed && "hidden")}>
                            {item.children?.map((sub: any) => {
                              const subActive = isActive(sub.href)
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  title={collapsed ? sub.name : undefined}
                                  className={cn(
                                    "relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                                    collapsed && "justify-center",
                                    subActive
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-slate-900 hover:text-slate-900 hover:bg-gray-50"
                                  )}
                                >
                                  {/* active indicator for subitem */}
                                  {subActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-blue-600" />
                                  )}
                                  <sub.icon
                                    size={15}
                                    className={cn(
                                      "shrink-0 transition-colors",
                                      subActive
                                        ? "text-blue-600"
                                        : "text-gray-400 group-hover:text-gray-600"
                                    )}
                                  />
                                  {!collapsed && sub.name}
                                </Link>
                              )
                            })}
                          </div>
                        )}
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
          "border-t border-gray-100 p-2 space-y-0.5",
          collapsed && "flex flex-col items-center"
        )}
      >
        <Link
          href="/dashboard/settings"
          title={collapsed ? "Ajustes" : undefined}
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all",
            collapsed && "justify-center w-full"
          )}
        >
          <Settings size={17} className="shrink-0 text-gray-400" />
          {!collapsed && "Ajustes"}
        </Link>

        <form action={signOutAction} className={collapsed ? "w-full" : ""}>
          <button
            type="submit"
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={17} className="shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </form>
      </div>

      {/* ── Collapse Toggle ─────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[56px] z-20 hidden md:flex w-6 h-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-slate-900 hover:border-gray-300 transition-all"
      >
        {collapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft  size={12} />
        }
      </button>
    </aside>
  )
}
