"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { NotificationBell } from "@/components/features/notifications/NotificationBell"
import { switchActiveRoleAction } from "@/app/actions/club-actions"
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
  Shirt,
  Database,
  User,
  Swords,
  Brain,
  Globe,
  Timer,
  FolderOpen
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
  Timer: Timer,
  FolderOpen: FolderOpen
}
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditClubModal } from "@/components/features/admin/EditClubModal"

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
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [clubInfo, setClubInfo] = useState<{id: string, name: string, logo_url: string | null} | null>(null)
  const [equipos, setEquipos] = useState<any[]>([])
  const [linkedPlayers, setLinkedPlayers] = useState<any[]>([])
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [showEditClub, setShowEditClub] = useState(false)
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
          .select("role, roles, club_id")
          .eq("id", user.id)
          .single()
          
        if (profile) {
          setUserRole(profile.role)
          setAvailableRoles(profile.roles || [])
          
          if (profile.club_id) {
            const { data: club } = await supabase
              .from("clubs")
              .select("id, name, logo_url")
              .eq("id", profile.club_id)
              .single()
              
            if (club) setClubInfo({ id: club.id, name: club.name, logo_url: club.logo_url })

            // Fetch equipos
            if (profile.role === 'admin' || profile.role === 'coordinador' || profile.role === 'coach' || profile.role === 'entrenador' || profile.role === 'delegado') {
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
            } else {
              setEquipos([])
            }

            if (profile.role === 'jugador') {
              const { data: playerRec } = await supabase
                .from('players')
                .select('id, first_name, last_name, status, teams(id, name)')
                .eq('user_auth_id', user.id)
                .neq('status', 'inactive')
                .maybeSingle()

              if (playerRec) {
                setLinkedPlayers([{
                  player_id: playerRec.id,
                  players: {
                    first_name: playerRec.first_name,
                    last_name: playerRec.last_name,
                    status: playerRec.status,
                    teams: playerRec.teams
                  }
                }])
              } else {
                // Fallback: If no player record matches the user_auth_id (e.g. testing with tutor account),
                // fetch linked players as a tutor so they can see the Cadet view.
                const { data: tutors } = await supabase
                  .from('player_tutors')
                  .select('player_id, players(first_name, last_name, status, teams(id, name))')
                  .eq('tutor_id', user.id)
                
                if (tutors) {
                  const activeTutors = tutors.filter((t: any) => t.players?.status !== 'inactive')
                  setLinkedPlayers(activeTutors)
                }
              }
            } else {
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
            setClubInfo({ id: "", name: "Sin Club", logo_url: null })
          }
        }
      }
    }
    fetchData()
  }, [supabase])

  // Effect to handle Admin impersonation of Family View
  // If the URL has a player ID that isn't in linkedPlayers, fetch it directly
  useEffect(() => {
    if (activeFamilyPlayerId && !linkedPlayers.find(lp => lp.player_id === activeFamilyPlayerId)) {
      const fetchSpecificPlayer = async () => {
        const { data: specificPlayer } = await supabase
          .from('players')
          .select('id, first_name, last_name, status, teams(id, name)')
          .eq('id', activeFamilyPlayerId)
          .single();
          
        if (specificPlayer && specificPlayer.status !== 'inactive') {
          setLinkedPlayers(prev => {
            if (prev.some(p => p.player_id === specificPlayer.id)) return prev;
            return [...prev, { player_id: specificPlayer.id, players: specificPlayer }];
          });
        }
      };
      fetchSpecificPlayer();
    }
  }, [activeFamilyPlayerId, linkedPlayers, supabase]);

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
          { name: "Disciplina", href: getHref("Disciplina", "/dashboard/matches?view=disciplina"), icon: AlertTriangle },
          { name: "Banco de Tareas", href: getHref("Banco de Tareas", "/dashboard/exercises"), icon: Target },
          { name: "Utillería", href: "/dashboard/utilleria", icon: Shirt },
          { name: "Publicidad Directo", href: "/dashboard/club/publicidad", icon: Globe },
        ]
      },

      {
        label: "GESTION",
        items: [
          { name: "Tesorería", href: "/dashboard/treasury", icon: Wallet },
          { name: "Secretaria", href: "/dashboard/inscripciones", icon: Settings },
          { name: "Expedientes (Doc)", href: "/admin/secretaria", icon: FolderOpen },
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
    const hasTeam = !!activeFamilyPlayer.players?.teams?.name;
    const teamItems = hasTeam ? [
      { name: "Plantilla",    href: `/dashboard/family/e/${activeFamilyPlayerId}/plantilla`, icon: Users },
      { name: "Partidos",     href: `/dashboard/family/e/${activeFamilyPlayerId}/partidos`, icon: Trophy },
      { name: "Eventos",      href: `/dashboard/family/e/${activeFamilyPlayerId}/eventos`, icon: CalendarDays },
      { name: "Entrenamientos", href: `/dashboard/family/e/${activeFamilyPlayerId}/entrenamientos`, icon: Target },
      { name: "Asistencia",   href: `/dashboard/family/e/${activeFamilyPlayerId}/asistencia`, icon: ClipboardCheck },
    ] : [];

    navGroups = [
      {
        label: hasTeam ? `Mi Equipo: ${activeFamilyPlayer.players.teams.name}` : 'Sin equipo',
        items: [
          ...teamItems,
          { name: "Mensajes",     href: `/dashboard/family/e/${activeFamilyPlayerId}/mensajes`, icon: MessageSquare },
          { name: "Equipación/Ropa", href: `/dashboard/family/e/${activeFamilyPlayerId}/ropa`, icon: Shirt },
          { name: "Ficha Técnica",href: `/dashboard/family/e/${activeFamilyPlayerId}/ficha`, icon: User },
          { name: "Mi Perfil",    href: `/dashboard/family/e/${activeFamilyPlayerId}/perfil`, icon: User },
        ],
      },
      {
        label: "TEAMS CLUB",
        items: [
          { name: "En directo", href: "/dashboard/global-club", icon: Trophy },
          { name: "Ajustes", href: `/dashboard/family/e/${activeFamilyPlayerId}/ajustes`, icon: Settings },
          { name: "Cerrar sesión", href: "#", icon: LogOut, action: 'logout' }
        ]
      }
    ]
  } else {
    // GLOBAL CONTEXT
    
    // Add "Mis Equipos" for coaches if not present
    const isCoach = userRole === 'coach' || userRole === 'entrenador' || userRole === 'delegado';
    const hasMisEquipos = globalNavItems.some(n => 
      n.name.toLowerCase() === "mis equipos" || 
      n.href === "/dashboard/equipos" || 
      n.href === "/dashboard/mis-equipos"
    );
    
    const isStaff = userRole === 'admin' || userRole === 'coordinador';
    const isPlayerOrFamily = userRole === 'jugador' || userRole === 'tutor' || userRole === 'familiar' || userRole === 'family' || userRole === 'familia';

    const filteredNavItems = globalNavItems.filter(n => {
      if (isPlayerOrFamily && (n.name.toLowerCase() === "directorio" || n.href.includes("/club/miembros"))) {
        return false;
      }
      return true;
    });
    
    navGroups = [
      {
        label: "General / Club",
        items: [
          ...filteredNavItems,
          ...(isCoach && !hasMisEquipos ? [{ name: "Mis Equipos", href: "/dashboard/equipos", icon: Shield }] : []),
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
    <>
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
          "min-h-[84px] py-2 flex items-center justify-between overflow-hidden shrink-0",
          isAdmin ? "border-b border-slate-800 cursor-pointer hover:bg-slate-800/10 transition-colors" : "border-b border-gray-100",
          collapsed ? "justify-center" : "px-3"
        )}
        onClick={() => {
          if (isAdmin && clubInfo) setShowEditClub(true);
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm border border-slate-200">
            {clubInfo?.logo_url ? (
              <img src={clubInfo.logo_url} alt="Escudo" className="w-full h-full object-contain p-0" />
            ) : (
              <Shield size={36} className="text-slate-400" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              {clubInfo ? (
                <>
                  <div className={cn("text-[12px] font-extrabold leading-tight uppercase tracking-tight flex flex-col", isAdmin ? "text-slate-100" : "text-slate-900")}>
                    {clubInfo.name.split(' ').map((word, i) => (
                      <span key={i} className="block leading-none py-[1px]">{word}</span>
                    ))}
                  </div>
                  <p className={cn("text-[10px] font-semibold tracking-wide uppercase mt-1", isAdmin ? "text-slate-400" : "text-gray-400")}>
                    Temp. 2024/25
                  </p>
                </>
              ) : (
                <span className="text-[12px] text-gray-400">Cargando...</span>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <NotificationBell />
        )}
      </div>

      {/* ── Role Switcher ──────────────────────────────── */}
      {!collapsed && availableRoles.length > 1 && (
        <div className={cn("px-4 py-3", isAdmin ? "border-b border-slate-800" : "border-b border-gray-100")}>
          <div className="flex flex-col items-start min-w-0">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider block mb-1", isAdmin ? "text-slate-400" : "text-gray-500")}>Rol Activo</span>
            <select 
              value={userRole || ''}
              onChange={async (e) => {
                const newRole = e.target.value;
                if (newRole && newRole !== userRole) {
                  setUserRole(newRole); // Update state immediately to prevent hook mismatch
                  const res = await switchActiveRoleAction(newRole);
                  if (res.success) {
                    let targetUrl = '/dashboard';
                    if (newRole === 'admin' || newRole === 'coordinador') {
                      targetUrl = '/dashboard/equipos';
                    } else if (newRole === 'coach' || newRole === 'entrenador' || newRole === 'delegado') {
                      targetUrl = '/dashboard/mis-equipos';
                    } else if (newRole === 'tutor' || newRole === 'family' || newRole === 'familia') {
                      if (linkedPlayers && linkedPlayers.length > 0) {
                        const pid = linkedPlayers[0].player_id || linkedPlayers[0].id;
                        targetUrl = `/dashboard/family/e/${pid}/perfil`;
                      } else {
                        targetUrl = '/dashboard/family';
                      }
                    } else if (newRole === 'jugador') {
                      targetUrl = '/dashboard';
                    } else {
                      targetUrl = '/dashboard/mi-perfil';
                    }
                    window.location.href = targetUrl;
                  } else {
                    alert('Error al cambiar de rol: ' + res.error);
                  }
                }
              }}
              className={cn(
                "w-full text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none border cursor-pointer capitalize transition-all",
                isAdmin 
                  ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-slate-500" 
                  : "bg-gray-50 border-gray-200 text-slate-800 focus:border-blue-500 focus:bg-white"
              )}
            >
              {availableRoles.map(role => (
                <option key={role} value={role} className={isAdmin ? "bg-slate-800 text-slate-200" : "bg-white text-slate-800"}>
                  {role === 'admin' ? 'Admin' : role === 'coach' || role === 'entrenador' ? 'Entrenador' : role === 'coordinador' ? 'Coordinador' : role === 'jugador' ? 'Jugador' : role === 'tutor' ? 'Padre/Madre/Tutor' : role}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Context Selector ──────────────────────────────── */}
      {!collapsed && !isAdmin && (equipos.length > 0 || linkedPlayers.length > 0) && (
        <div className={cn("relative px-4 py-3", isAdmin ? "border-b border-slate-800" : "border-b border-gray-100")}>
          <button 
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className={cn("w-full flex items-center justify-between rounded-md px-3 py-2 transition-colors", isAdmin ? "bg-slate-800 hover:bg-slate-700 border border-slate-700" : "bg-gray-50 hover:bg-gray-100 border border-gray-200")}
          >
            <div className="flex flex-col items-start min-w-0">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isAdmin ? "text-slate-400" : "text-gray-500")}>Contexto Actual</span>
              <span className={cn("text-sm font-bold truncate", isAdmin ? "text-slate-100" : "text-slate-900")}>
                {activeFamilyPlayerId && activeFamilyPlayer ? 
                  `${activeFamilyPlayer.players?.teams?.name || 'Equipo'} (${activeFamilyPlayer.players?.first_name})`
                  : (userRole === 'familia' || userRole === 'jugador' || userRole === 'tutor' || userRole === 'family' ? 
                      (activeFamilyPlayer ? `${activeFamilyPlayer.players?.teams?.name || 'Equipo'} (${activeFamilyPlayer.players?.first_name})` : "Área Personal") 
                      : (activeTeam ? activeTeam.name : "Global Club")
                    )
                }
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
                      onClick={() => { 
                        setShowTeamDropdown(false); 
                        const isPlayerRoute = pathname.match(/^\/dashboard\/family\/e\/[^\/]+\/(.+)$/);
                        const subroute = isPlayerRoute ? isPlayerRoute[1] : 'perfil';
                        router.push(`/dashboard/family/e/${lp.player_id}/${subroute}`); 
                      }}
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
                  {linkedPlayers.length > 0 && (
                    <>
                      <div className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-t mt-1", isAdmin ? "text-slate-500 border-slate-700" : "text-gray-400 border-gray-100")}>
                        👪 Área Familiar
                      </div>
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
                  )}
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

    {clubInfo && isAdmin && (
      <EditClubModal 
        open={showEditClub} 
        onClose={() => setShowEditClub(false)} 
        clubId={clubInfo.id}
        currentName={clubInfo.name}
        currentLogoUrl={clubInfo.logo_url}
        onSuccess={() => {
          // Refetch simple club info
          supabase.from('clubs').select('id, name, logo_url').eq('id', clubInfo.id).single().then(({data}) => {
            if (data) setClubInfo({ id: data.id, name: data.name, logo_url: data.logo_url });
          });
        }}
      />
    )}
    </>
  )
}
