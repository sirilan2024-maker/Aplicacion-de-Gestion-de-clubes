"use client"

import React, { useState, useEffect } from "react"
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
  Shirt,
  Database,
  User,
  Swords,
  Brain,
  Globe,
  Timer,
  Menu,
  X,
  FolderOpen
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/features/notifications/NotificationBell"
import { switchActiveRoleAction } from "@/app/actions/club-actions"
import { EditClubModal } from "@/components/features/admin/EditClubModal"

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

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
};

export function MobileNavigation({ signOutAction }: { signOutAction?: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [equipos, setEquipos] = useState<any[]>([])
  const [clubInfo, setClubInfo] = useState<{id: string, name: string, logo_url: string | null} | null>(null)
  const [globalNavItems, setGlobalNavItems] = useState<NavItem[]>([])
  const [showEditClub, setShowEditClub] = useState(false)
  const supabase = createClient()

  // Detect active team context
  const match = pathname.match(/^\/dashboard\/(?:e|equipos)\/([a-zA-Z0-9-]+)/)
  const activeTeamId = match ? match[1] : null

  // Detect active family player context
  const familyMatch = pathname.match(/^\/dashboard\/family\/e\/([a-zA-Z0-9-]+)/)
  const activeFamilyPlayerId = familyMatch ? familyMatch[1] : null

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
            const { data: club } = await supabase.from('clubs').select('id, name, logo_url').eq('id', profile.club_id).single()
            if (club) setClubInfo({ id: club.id, name: club.name, logo_url: club.logo_url })

            let query = supabase.from('teams').select("id, name").eq("club_id", profile.club_id).order("name")
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
          }
        }
      }
    }
    fetchData()
  }, [supabase])

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  // Función auxiliar para buscar enlaces de la DB
  const getHref = (searchName: string, defaultHref: string) => {
    const item = globalNavItems.find(n => n.name.toLowerCase() === searchName.toLowerCase());
    return item ? item.href : defaultHref;
  };

  // 1. DYNAMIC BOTTOM BAR (Máximo 4 iconos principales)
  let bottomLinks: NavItem[] = []
  if (activeTeamId) {
    bottomLinks = [
      { name: "Plantilla", href: `/dashboard/equipos/${activeTeamId}/plantilla`, icon: Users },
      { name: "Partidos", href: `/dashboard/equipos/${activeTeamId}/partidos`, icon: Trophy },
      { name: "Asistencia", href: `/dashboard/equipos/${activeTeamId}/asistencia`, icon: ClipboardCheck },
      { name: "Rend.", href: `/dashboard/equipos/${activeTeamId}/rendimiento`, icon: Activity },
    ]
  } else if (activeFamilyPlayerId) {
    bottomLinks = [
      { name: "Plantilla", href: `/dashboard/family/e/${activeFamilyPlayerId}/plantilla`, icon: Users },
      { name: "Partidos", href: `/dashboard/family/e/${activeFamilyPlayerId}/partidos`, icon: Trophy },
      { name: "Asistencia", href: `/dashboard/family/e/${activeFamilyPlayerId}/asistencia`, icon: ClipboardCheck },
      { name: "Mi Perfil", href: `/dashboard/family/e/${activeFamilyPlayerId}/perfil`, icon: User },
    ]
  } else {
    // Si no estamos en equipo, usamos las rutas generales
    if (userRole === 'admin') {
      bottomLinks = [
        { name: "Equipos", href: getHref("Equipos", "/admin/equipos"), icon: Shield },
        { name: "Miembros", href: getHref("Directorio", "/dashboard/club/miembros"), icon: Users },
        { name: "Partidos", href: getHref("Partidos", "/admin/partidos"), icon: Trophy },
        { name: "Eventos", href: getHref("Eventos", "/dashboard/events"), icon: CalendarDays },
      ]
    } else if (userRole === 'tutor' || userRole === 'family') {
      bottomLinks = [
        { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
        { name: "Pagos", href: "/dashboard/treasury", icon: Wallet },
        { name: "Perfil", href: "/dashboard/mi-perfil", icon: User },
      ]
    } else {
      // Coach / Entrenador
      bottomLinks = [
        { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
        { name: "Mis Equipos", href: "/dashboard/equipos", icon: Shield },
        { name: "Partidos", href: "/dashboard/matches", icon: Trophy },
        { name: "Perfil", href: "/dashboard/mi-perfil", icon: User },
      ]
    }
  }

  // 2. DYNAMIC HAMBURGER MENU (Secundarios)
  let secondaryLinks: NavItem[] = []
  if (activeTeamId) {
    secondaryLinks = [
      { name: "Volver a Inicio", href: "/dashboard", icon: LayoutDashboard },
      { name: "Entrenamientos", href: `/dashboard/equipos/${activeTeamId}/entrenamientos`, icon: Target },
      { name: "Banco de Tareas", href: `/dashboard/equipos/${activeTeamId}/banco-tareas`, icon: Target },
      { name: "Disciplina", href: `/dashboard/equipos/${activeTeamId}/partidos?view=disciplina`, icon: AlertTriangle },
      { name: "Estadísticas", href: `/dashboard/equipos/${activeTeamId}/estadisticas`, icon: BarChart3 },
      { name: "Mensajes", href: `/dashboard/equipos/${activeTeamId}/mensajes`, icon: MessageSquare },
    ]
  } else if (activeFamilyPlayerId) {
    secondaryLinks = [
      { name: "Volver a Inicio", href: "/dashboard", icon: LayoutDashboard },
      { name: "Eventos", href: `/dashboard/family/e/${activeFamilyPlayerId}/eventos`, icon: CalendarDays },
      { name: "Entrenamientos", href: `/dashboard/family/e/${activeFamilyPlayerId}/entrenamientos`, icon: Target },
      { name: "Equipación/Ropa", href: `/dashboard/family/e/${activeFamilyPlayerId}/ropa`, icon: Shirt },
      { name: "Ficha Técnica", href: `/dashboard/family/e/${activeFamilyPlayerId}/ficha`, icon: User },
      { name: "Mensajes", href: `/dashboard/family/e/${activeFamilyPlayerId}/mensajes`, icon: MessageSquare },
    ]
  } else {
    // Todos los de la DB que NO estén ya en el bottom bar
    const bottomHrefs = bottomLinks.map(b => b.href);
    
    if (userRole === 'admin') {
      // Hardcode admin secondary links since they are not in DB usually
      secondaryLinks = [
        { name: "Inicio", href: getHref("Inicio", "/dashboard"), icon: LayoutDashboard },
        { name: "Miembros", href: getHref("Directorio", "/dashboard/club/miembros"), icon: Users },
        { name: "Mis Equipos", href: "/dashboard/equipos", icon: Shield },
        { name: "Eventos", href: getHref("Eventos", "/dashboard/events"), icon: CalendarDays },
        { name: "Mensajes", href: "/dashboard/mensajes", icon: MessageSquare },
        { name: "Estadísticas", href: getHref("Estadísticas", "/admin/estadisticas"), icon: BarChart3 },
        { name: "Disciplina", href: getHref("Disciplina", "/dashboard/matches?view=disciplina"), icon: AlertTriangle },
        { name: "Banco de Tareas", href: getHref("Banco de Tareas", "/dashboard/exercises"), icon: Target },
        { name: "Tesorería", href: "/dashboard/treasury", icon: Wallet },
        { name: "Secretaria", href: "/dashboard/inscripciones", icon: Settings },
        { name: "Expedientes", href: "/admin/secretaria", icon: FolderOpen },
        { name: "Metodologia", href: "/admin/metodologia", icon: Brain },
        { name: "Roles", href: "/admin/configuracion/roles", icon: Shield },
        { name: "Temporadas", href: "/admin/temporadas", icon: Timer },
        { name: "Calendario FFCV", href: "/admin/calendario-ffcv", icon: Database },
        { name: "Informes IA", href: "/admin/informes-ia", icon: Brain },
        { name: "FFCV/NOVANET", href: "/admin/ffcv-api", icon: Globe },
      ].filter(item => !bottomHrefs.includes(item.href));
    } else {
      const bottomNames = bottomLinks.map(b => b.name.toLowerCase());
      secondaryLinks = globalNavItems.filter(item => 
        !bottomHrefs.includes(item.href) && 
        !bottomNames.includes(item.name.toLowerCase())
      );
    }
    
    // Asegurar que Ajustes siempre esté disponible si no está en el bottom bar
    if (!bottomHrefs.includes("/dashboard/mi-perfil") && !secondaryLinks.some(s => s.href === "/dashboard/mi-perfil")) {
       secondaryLinks.push({ name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings });
    }

    const isStaff = userRole === 'admin' || userRole === 'coordinador' || userRole === 'utillero';
    if (isStaff && !secondaryLinks.some(s => s.href === "/dashboard/utilleria")) {
      secondaryLinks.push({ name: "Utillería", href: "/dashboard/utilleria", icon: Shirt });
    }
    }
    
  return (
    <div className="md:hidden">
      {/* Top Header */}
      <header className="h-22 min-h-[88px] py-2 bg-slate-900 text-white flex items-center justify-between px-4 fixed top-0 w-full z-40 shadow-md">
        <div 
          className="flex items-center gap-3 font-bold min-w-0 cursor-pointer flex-1 mr-2"
          onClick={() => {
            if (clubInfo) setShowEditClub(true);
          }}
        >
          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm border border-slate-200">
            {clubInfo?.logo_url ? (
              <img src={clubInfo.logo_url} alt="Escudo" className="w-full h-full object-contain p-0" />
            ) : (
              <Trophy className="w-8 h-8 text-emerald-600 shrink-0" />
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            {clubInfo ? (
              <>
                <div className="text-[11px] font-extrabold leading-tight uppercase tracking-tight flex flex-col text-slate-100">
                  {clubInfo.name.split(' ').map((word, i) => (
                    <span key={i} className="block leading-none py-[1px]">{word}</span>
                  ))}
                </div>
                <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-400 mt-1">
                  Temp. 2024/25
                </p>
              </>
            ) : (
              <span className="text-xs text-gray-400">Cargando...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell />
          <Link href="/dashboard/mi-perfil" className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
            U
          </Link>
        </div>
      </header>

      <div className="h-22 min-h-[88px]" />

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center h-16 pb-safe z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
        {bottomLinks.map((link) => {
          const active = isActive(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                active ? "text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "fill-emerald-900" : ""}`} />
              <span className="text-[10px] font-semibold">{link.name}</span>
            </Link>
          )
        })}
        {/* Menu Toggle Button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Menú</span>
        </button>
      </nav>

      {/* Fullscreen Overlay Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 animate-in fade-in duration-200 flex flex-col">
          <div className="flex justify-end p-4">
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 pb-24">
            {availableRoles.length > 1 && (
              <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-slate-700/50">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Rol Activo
                </label>
                <select 
                  value={userRole || ''}
                  onChange={async (e) => {
                    const newRole = e.target.value;
                    if (newRole && newRole !== userRole) {
                      setMenuOpen(false);
                      setUserRole(newRole); // Update state immediately to prevent hook mismatch
                      const res = await switchActiveRoleAction(newRole);
                      if (res.success) {
                        let targetUrl = '/dashboard';
                        if (newRole === 'admin' || newRole === 'coordinador') {
                          targetUrl = '/dashboard/equipos';
                        } else if (newRole === 'coach' || newRole === 'entrenador' || newRole === 'delegado') {
                          targetUrl = '/dashboard/mis-equipos';
                        } else if (newRole === 'tutor' || newRole === 'family' || newRole === 'familia') {
                          targetUrl = '/dashboard/family';
                        } else {
                          targetUrl = '/dashboard/mi-perfil';
                        }
                        window.location.href = targetUrl;
                      } else {
                        alert('Error al cambiar de rol: ' + res.error);
                      }
                    }
                  }}
                  className="w-full text-sm font-bold bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer capitalize"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role} className="bg-slate-900 text-slate-200">
                      {role === 'admin' ? 'Admin' : role === 'coach' || role === 'entrenador' ? 'Entrenador' : role === 'coordinador' ? 'Coordinador' : role === 'jugador' ? 'Jugador' : role === 'tutor' ? 'Padre/Madre/Tutor' : role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <h2 className="text-emerald-400 font-bold uppercase tracking-wider text-sm mb-6">
              Más Opciones
            </h2>
            <div className="flex flex-col gap-2">
              {secondaryLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 bg-slate-800/50 rounded-xl text-white hover:bg-slate-800 active:scale-95 transition-all"
                  >
                    <Icon className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium text-lg">{link.name}</span>
                  </Link>
                )
              })}
              
              {/* Logout Option */}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  if(signOutAction) signOutAction()
                }}
                className="flex items-center gap-4 px-4 py-3 mt-4 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 active:scale-95 transition-all w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-lg">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {clubInfo && (
        <EditClubModal 
          open={showEditClub} 
          onClose={() => setShowEditClub(false)} 
          clubId={clubInfo.id}
          currentName={clubInfo.name}
          currentLogoUrl={clubInfo.logo_url}
          onSuccess={() => {
            supabase.from('clubs').select('id, name, logo_url').eq('id', clubInfo.id).single().then(({data}) => {
              if (data) setClubInfo({ id: data.id, name: data.name, logo_url: data.logo_url });
            });
          }}
        />
      )}
    </div>
  )
}
