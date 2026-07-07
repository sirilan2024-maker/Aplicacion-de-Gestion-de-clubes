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
  Database,
  User,
  Swords,
  Brain,
  Globe,
  Timer,
  Menu,
  X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

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
  const [equipos, setEquipos] = useState<any[]>([])
  const [globalNavItems, setGlobalNavItems] = useState<NavItem[]>([])
  const supabase = createClient()

  // Detect active team context
  const match = pathname.match(/^\/dashboard\/(?:e|equipos)\/([a-zA-Z0-9-]+)/)
  const activeTeamId = match ? match[1] : null

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
  } else {
    // Todos los de la DB que NO estén ya en el bottom bar
    const bottomHrefs = bottomLinks.map(b => b.href);
    secondaryLinks = globalNavItems.filter(item => !bottomHrefs.includes(item.href));
    
    // Si no hay de BD, unos por defecto
    if (secondaryLinks.length === 0) {
       secondaryLinks = [
         { name: "Ajustes", href: "/dashboard/mi-perfil", icon: Settings }
       ]
    }
  }

  return (
    <div className="md:hidden">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 fixed top-0 w-full z-40 shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <span>ClubManager</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/mi-perfil" className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
            U
          </Link>
        </div>
      </header>

      <div className="h-14" />

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
    </div>
  )
}
