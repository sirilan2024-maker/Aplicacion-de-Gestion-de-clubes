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
  Activity,
  AlertTriangle,
  Database,
  User,
  Swords,
  Brain,
  Globe,
  Timer
} from "lucide-react"

const IconMap: Record<string, React.ComponentType<any>> = {
  Home: LayoutDashboard,
  Users: Users,
  Shield: Shield,
  Swords: Swords,
  Calendar: CalendarDays,
  BarChart3: BarChart3,
  AlertTriangle: AlertTriangle,
  Database: Database,
  User: User,
  Target: Target,
  Settings: Settings,
  Wallet: Wallet,
  Brain: Brain,
  Globe: Globe,
  Timer: Timer
}
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  children?: NavItem[];
  action?: 'logout';
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
  const [linkedPlayers, setLinkedPlayers] = useState<any[]>([])
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [globalNavItems, setGlobalNavItems] = useState<NavItem[]>([])
  const supabase = createClient()

  // SÓLO los administradores ven el fondo oscuro y el menú especial
  const isAdmin = userRole === "admin";

  // Detect active team context from URL (/dashboard/e/[teamId] or /dashboard/equipos/[teamId])
  const match = pathname.match(/^\/dashboard\/(?:e|equipos)\/([a-zA-Z0-9-]+)/)
  const potentialTeamId = match ? match[1] : null
  const activeTeam = equipos.find(e => e.id === potentialTeamId)
  const activeTeamId = activeTeam ? activeTeam.id : null

  // Detect active family player context
  const familyMatch = pathname.match(/^\/dashboard\/family\/e\/([a-zA-Z0-9-]+)/)
  const activeFamilyPlayerId = familyMatch ? familyMatch[1] : null
  
  // Si no hay jugador activo en la URL, mostrar el primero por defecto en el panel superior en lugar de "Mi Panel Familiar"
  const activeFamilyPlayer = linkedPlayers.find(lp => lp.player_id === activeFamilyPlayerId) || (linkedPlayers.length > 0 ? linkedPlayers[0] : null)

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
            let query = supabase.from('teams').select("id, name, category").eq("club_id", profile.club_id).order("name")
            if (profile.role === 'coach' || profile.role === 'entrenador' || profile.role === 'delegado') {
              const { data: coachTeams } = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
              const teamIds = coachTeams?.map(ct => ct.team_id) || [];
              if (teamIds.length > 0) {
                query = query.or(`coach_id.eq.${user.id},id.in.(${teamIds.join(',')})`);
              } else {
                query = query.eq('coach_id', user.id);
              }
            }
            const { data: eqData } = await query
            if (eqData) setEquipos(eqData)

            // Fetch family players for all users so any role can view their child's family dashboard
            const { data: tutors } = await supabase
              .from('player_tutors')
              .select('player_id, players(first_name, last_name, status, teams(id, name))')
              .eq('tutor_id', user.id)
            
            if (tutors) {
              // Filter out inactive players in JS just to be absolutely safe
              const activeTutors = tutors.filter((t: any) => t.players?.status !== 'inactive')
              setLinkedPlayers(activeTutors)
            }

            // Fetch dynamic navigation
            const { data: navData } = await supabase
              .from('role_navigation')
              .select(`nav_id, app_navigation(label, path, icon_name, sort_order)`)
              .eq('role', profile.role)
            
            if (navData) {
               const parsedNavs = navData
                 .filter((n: any) => n.app_navigation)
                 .map((n: any) => ({
                   name: n.app_navigation.label,
                   href: n.app_navigation.path,
                   icon: IconMap[n.app_navigation.icon_name] || LayoutDashboard,
                   sortOrder: n.app_navigation.sort_order
                 }))
                 .sort((a, b) => a.sortOrder - b.sortOrder)
               
               setGlobalNavItems(parsedNavs)
            }
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

  let navGroups: NavGroup[] = []

  // Utility to find the correct href from the database (so we don't break existing working links)
  const getHref = (searchName: string, defaultHref: string) => {
    const item = globalNavItems.find(n => n.name.toLowerCase() === searchName.toLowerCase());
    return item ? item.href : defaultHref;
  };

  if (isAdmin) {
    navGroups = [
      {
        label: "GENERAL/CLUB",
        items: [
          { name: "Inicio", href: getHref("Inicio", "/dashboard"), icon: LayoutDashboard },
          { name: "Miembros", href: getHref("Directorio", "/dashboard/club/miembros"), icon: Users },
          { name: "Equipos", href: getHref("Equipos", "/admin/equipos"), icon: Shield },
          { name: "Partidos", href: getHref("Partidos", "/admin/partidos"), icon: Trophy },
          { name: "Eventos", href: getHref("Eventos", "/dashboard/events"), icon: CalendarDays },
          { name: "Mensajes", href: "/dashboard/mensajes", icon: MessageSquare },
          { name: "Estadísticas", href: getHref("Estadísticas", "/admin/estadisticas"), icon: BarChart3 },
          { name: "Disciplina", href: getHref("Disciplina", "/admin/partidos?view=disciplina"), icon: AlertTriangle },
          { name: "Banco de Tareas", href: getHref("Banco de Tareas", "/dashboard/exercises"), icon: Target },
        ]
      },
      {
        label: "ENTRENADORES",
        items: [
          { name: "Mis Equipos", href: "/dashboard/equipos", icon: Shield },
          { name: "Mi Perfil", href: "/dashboard/settings", icon: User },
        ]
      },
      {
        label: "GESTION",
        items: [
          { name: "Tesoreria", href: "/admin/tesoreria", icon: Wallet },
          { name: "Secretaria", href: "/admin/secretaria", icon: Settings },
          { name: "Metodologia", href: "/admin/metodologia", icon: Brain },
          { name: "Configuracion de roles", href: "/admin/configuracion/roles", icon: Shield },
          { name: "Temporadas", href: "/admin/temporadas", icon: Timer },
          { name: "Calendario FFCV", href: "/admin/calendario-ffcv", icon: Database },
        ]
      },
      {
        label: "INTELIGENIA ARTIFICIAL & API",
        items: [
          { name: "Informes IA", href: "/admin/informes-ia", icon: Brain },
          { name: "FFCV/NOVANET", href: "/admin/ffcv-api", icon: Globe },
        ]
      },
      {
        label: "SISTEMA",
        items: [
          { name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings },
          { name: "Cerrar sesión", href: "#", icon: LogOut, action: 'logout' }
        ]
      }
    ];
  } else if (activeTeamId) {
    // TEAM CONTEXT
    navGroups = [
      {
        label: `Gestión: ${activeTeam?.name || 'Equipo'}`,
        items: [
          { name: "Plantilla",    href: `/dashboard/equipos/${activeTeamId}/plantilla`, icon: Users },
          { name: "Partidos",     href: `/dashboard/equipos/${activeTeamId}/partidos`, icon: Trophy },
          { name: "Disciplina",   href: `/dashboard/equipos/${activeTeamId}/partidos?view=disciplina`, icon: Shield },
          { name: "Eventos",   href: `/dashboard/equipos/${activeTeamId}/calendario`, icon: CalendarDays },
          { name: "Asistencia",   href: `/dashboard/equipos/${activeTeamId}/asistencia`, icon: ClipboardCheck },
          { name: "Rendimiento",  href: `/dashboard/equipos/${activeTeamId}/rendimiento`, icon: Activity },
          { name: "Estadísticas", href: `/dashboard/equipos/${activeTeamId}/estadisticas`, icon: BarChart3 },
          { name: "Entrenamientos", href: `/dashboard/equipos/${activeTeamId}/entrenamientos`, icon: Target },
          { name: "Banco de Tareas", href: `/dashboard/equipos/${activeTeamId}/banco-tareas`, icon: Target },
          { name: "Mensajes",     href: `/dashboard/equipos/${activeTeamId}/mensajes`, icon: MessageSquare },
        ],
      },
      {
        label: "Volver",
        items: [
          { 
            name: (userRole === 'coach' || userRole === 'entrenador' || userRole === 'delegado') ? "Mis Equipos" : "Global Club",  
            href: (userRole === 'coach' || userRole === 'entrenador' || userRole === 'delegado') ? `/dashboard/mis-equipos` : `/dashboard`, 
            icon: LayoutDashboard 
          },
          { name: "En directo", href: "/dashboard/global-club", icon: Trophy },
          { name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings },
          { name: "Cerrar sesión", href: "#", icon: LogOut, action: 'logout' }
        ]
      }
    ]
  } else if (activeFamilyPlayerId && activeFamilyPlayer) {
    // FAMILY PLAYER CONTEXT
    navGroups = [
      {
        label: `Mi Equipo: ${activeFamilyPlayer.players?.teams?.name || 'Sin equipo'}`,
        items: [
          { name: "Plantilla",    href: `/dashboard/family/e/${activeFamilyPlayerId}/plantilla`, icon: Users },
          { name: "Partidos",     href: `/dashboard/family/e/${activeFamilyPlayerId}/partidos`, icon: Trophy },
          { name: "Eventos",      href: `/dashboard/family/e/${activeFamilyPlayerId}/eventos`, icon: CalendarDays },
          { name: "Entrenamientos", href: `/dashboard/family/e/${activeFamilyPlayerId}/entrenamientos`, icon: Target },
          { name: "Mensajes",     href: `/dashboard/family/e/${activeFamilyPlayerId}/mensajes`, icon: MessageSquare },
          { name: "Ficha Técnica",href: `/dashboard/family/e/${activeFamilyPlayerId}/ficha`, icon: User },
          { name: "Mi Perfil",    href: `/dashboard/family/e/${activeFamilyPlayerId}/perfil`, icon: User },
        ],
      },
      {
        label: "TEAMS CLUB",
        items: [
          { name: "En directo", href: "/dashboard/global-club", icon: Trophy },
          { name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings },
          { name: "Cerrar sesión", href: "#", icon: LogOut, action: 'logout' }
        ]
      }
    ]
  } else {
    // GLOBAL CONTEXT
    
    // Add "Mis Equipos" for coaches if not present
    const isCoach = userRole === 'coach' || userRole === 'entrenador' || userRole === 'delegado';
    
    navGroups = [
      {
        label: "General / Club",
        items: [
          ...(globalNavItems.length > 0 ? globalNavItems : [
            { name: "Inicio",       href: "/dashboard",            icon: LayoutDashboard },
            { name: "Directorio",   href: "/dashboard/club/miembros", icon: Users },
          ]),
          ...(isCoach ? [{ name: "Mis Equipos", href: "/dashboard/equipos", icon: Shield }] : []),
          { name: "Mensajes", href: "/dashboard/mensajes", icon: MessageSquare },
          { name: "En directo", href: "/dashboard/global-club", icon: Trophy },
          { name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings },
          { name: "Cerrar sesión", href: "#", icon: LogOut, action: 'logout' }
        ],
      }
    ]

    // Provide the link for metodologo to access the ERP
    if (userRole === 'metodologo') {
      navGroups.push({
        label: "Administración",
        items: [
          { name: "Super Admin ERP", href: "/admin", icon: Settings },
        ]
      })
    }
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex flex-col transition-all duration-300 ease-in-out shrink-0 h-screen",
        isAdmin ? "bg-slate-900 border-r border-slate-800 text-slate-300" : "bg-white border-r border-gray-100 text-slate-700",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* ── Brand ──────────────────────────────── */}
      <div
        className={cn(
          "h-14 flex items-center overflow-hidden shrink-0",
          isAdmin ? "border-b border-slate-800" : "border-b border-gray-100",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className={cn("text-[14px] font-bold truncate leading-tight", isAdmin ? "text-slate-100" : "text-slate-900")}>
              {clubName}
            </p>
            <p className={cn("text-[11px] truncate", isAdmin ? "text-slate-400" : "text-gray-400")}>Temp. 2024/25</p>
          </div>
        )}
      </div>

      {/* ── Context Selector ──────────────────────────────── */}
      {!collapsed && !isAdmin && (
        <div className={cn("relative px-4 py-3", isAdmin ? "border-b border-slate-800" : "border-b border-gray-100")}>
          <button 
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className={cn("w-full flex items-center justify-between rounded-md px-3 py-2 transition-colors", isAdmin ? "bg-slate-800 hover:bg-slate-700 border border-slate-700" : "bg-gray-50 hover:bg-gray-100 border border-gray-200")}
          >
            <div className="flex flex-col items-start min-w-0">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isAdmin ? "text-slate-400" : "text-gray-500")}>Contexto Actual</span>
              <span className={cn("text-sm font-bold truncate", isAdmin ? "text-slate-100" : "text-slate-900")}>
                {userRole === 'familia' || userRole === 'jugador' || userRole === 'tutor' || userRole === 'family' ? 
                  (activeFamilyPlayer ? `${activeFamilyPlayer.players?.teams?.name || 'Equipo'} (${activeFamilyPlayer.players?.first_name})` : "Área Personal") 
                  : (activeTeam ? activeTeam.name : "Global Club")}
              </span>
            </div>
            <ChevronDown size={14} className={cn("transition-transform", isAdmin ? "text-slate-400" : "text-gray-500", showTeamDropdown && "rotate-180")} />
          </button>
          
          {showTeamDropdown && (
            <div className={cn("absolute top-[100%] left-4 right-4 mt-1 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto", isAdmin ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200")}>
              {userRole === 'familia' || userRole === 'jugador' || userRole === 'tutor' || userRole === 'family' ? (
                <>
                  {linkedPlayers.map(lp => (
                    <button
                      key={lp.player_id}
                      onClick={() => { setShowTeamDropdown(false); router.push(`/dashboard/family/e/${lp.player_id}/plantilla`); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2",
                        activeFamilyPlayerId === lp.player_id ? "text-blue-700 font-bold bg-blue-50/50" : "text-gray-700 font-medium hover:bg-blue-50"
                      )}
                    >
                      <User size={14} className={activeFamilyPlayerId === lp.player_id ? "text-blue-600" : "text-gray-400"} />
                      <span>{lp.players?.first_name} <span className="text-xs text-gray-500">({lp.players?.teams?.name || 'Sin equipo'})</span></span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setShowTeamDropdown(false); router.push("/dashboard"); }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                      isAdmin 
                        ? (!activeTeamId ? "text-blue-400 bg-slate-700/50" : "text-slate-300 hover:bg-slate-700")
                        : (!activeTeamId ? "text-blue-700 bg-blue-50/50" : "text-gray-700 hover:bg-blue-50")
                    )}
                  >
                    🌍 Global Club
                  </button>
                  {equipos.map(eq => (
                    <button
                      key={eq.id}
                      onClick={() => { setShowTeamDropdown(false); router.push(`/dashboard/equipos/${eq.id}/plantilla`); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm transition-colors",
                        isAdmin
                          ? (activeTeamId === eq.id ? "text-blue-400 font-bold bg-slate-700/50" : "text-slate-300 font-medium hover:bg-slate-700")
                          : (activeTeamId === eq.id ? "text-blue-700 font-bold bg-blue-50/50" : "text-gray-700 font-medium hover:bg-blue-50")
                      )}
                    >
                      🛡️ {eq.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Nav ────────────────────────────────── */}
      <nav className="flex-1 overflow-hidden hover:overflow-y-auto py-2 px-2 space-y-3 scrollbar-hide">
        {navGroups.map((group) => {
          if (group.items.length === 0) return null
          
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className={cn("text-[10px] font-bold uppercase tracking-widest px-2 mb-1", isAdmin ? "text-slate-500" : "text-slate-400")}>
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className={cn("my-1 mx-auto w-4 border-t", isAdmin ? "border-slate-700" : "border-gray-200")} />
              )}
              <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    
                    if (item.action === 'logout') {
                      return (
                        <form key={item.name} action={signOutAction}>
                          <button
                            type="submit"
                            title={collapsed ? item.name : undefined}
                            className={cn(
                              "w-full relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 group",
                              collapsed && "justify-center",
                              isAdmin ? "text-slate-400 hover:text-red-400 hover:bg-slate-800/50" : "text-slate-500 hover:text-red-600 hover:bg-red-50"
                            )}
                          >
                            <item.icon size={16} className="shrink-0 transition-colors" />
                            {!collapsed && item.name}
                          </button>
                        </form>
                      )
                    }

                    return (
                      <div key={item.name}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.name : undefined}
                          className={cn(
                            "relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 group",
                            collapsed && "justify-center",
                            active
                              ? (isAdmin ? "bg-slate-800 text-blue-400 shadow-sm" : "bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/50")
                              : (isAdmin ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:text-slate-900 hover:bg-gray-100")
                          )}
                        >
                          {/* active indicator bar */}
                          {active && !collapsed && (
                            <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600" />
                          )}
                          <item.icon
                            size={16}
                            className={cn(
                              "shrink-0 transition-colors",
                              active
                                ? (isAdmin ? "text-blue-400" : "text-blue-600")
                                : (isAdmin ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-600")
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


      {/* ── Collapse Toggle ─────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn("absolute -right-3.5 top-[56px] z-20 hidden md:flex w-7 h-7 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-105", isAdmin ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600" : "bg-white border-gray-200 text-gray-400 hover:text-slate-900 hover:border-gray-300")}
      >
        {collapsed
          ? <ChevronRight size={14} />
          : <ChevronLeft  size={14} />
        }
      </button>
    </aside>
  )
}
