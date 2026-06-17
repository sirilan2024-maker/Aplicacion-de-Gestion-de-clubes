"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Trophy,
  Users,
  Activity,
  Menu,
  X,
  Target,
  CalendarDays,
  LogOut,
  Settings,
  Wallet,
  MessageSquare,
  Shield
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function MobileNavigation({ signOutAction }: { signOutAction?: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [equipos, setEquipos] = useState<any[]>([])
  const supabase = createClient()

  // Detect active team context
  const match = pathname.match(/\/dashboard\/(?:e|equipos)\/([a-zA-Z0-9-]+)/)
  const activeTeamId = match ? match[1] : null

  useEffect(() => {
    const fetchEquipos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, club_id")
          .eq("id", user.id)
          .single()
          
        if (profile?.club_id) {
          let query = supabase.from("equipos").select("id, name").eq("club_id", profile.club_id).order("name")
          if (profile.role === 'coach' || profile.role === 'entrenador' || profile.role === 'delegado') {
            query = query.eq('coach_id', user.id)
          }
          const { data: eqData } = await query
          if (eqData) setEquipos(eqData)
        }
      }
    }
    fetchEquipos()
  }, [supabase])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  // Determine Bottom Bar links based on context
  const bottomLinks = activeTeamId ? [
    { name: "Plantilla", href: `/dashboard/equipos/${activeTeamId}/plantilla`, icon: Users },
    { name: "Partidos", href: `/dashboard/equipos/${activeTeamId}/partidos`, icon: Trophy },
    { name: "Rend.", href: `/dashboard/equipos/${activeTeamId}/rendimiento`, icon: Activity },
  ] : [
    { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { name: "Equipos", href: "/dashboard/equipos", icon: Target },
    { name: "Global", href: "/dashboard/matches", icon: Trophy },
  ]

  // Secondary links for Hamburger menu
  const secondaryLinks = activeTeamId ? [
    { name: "Volver al Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Eventos", href: `/dashboard/equipos/${activeTeamId}/calendario`, icon: CalendarDays },
    { name: "Asistencia", href: `/dashboard/equipos/${activeTeamId}/asistencia`, icon: Users },
    { name: "Entrenamientos", href: `/dashboard/equipos/${activeTeamId}/entrenamientos`, icon: Target },
    { name: "Banco de Tareas", href: `/dashboard/equipos/${activeTeamId}/banco-tareas`, icon: Target },
    { name: "Mensajes", href: `/dashboard/equipos/${activeTeamId}/mensajes`, icon: MessageSquare },
  ] : [
    { name: "Eventos", href: "/dashboard/events", icon: CalendarDays },
    { name: "Super Admin ERP", href: "/admin", icon: Shield },
    { name: "Directorio", href: "/dashboard/club/miembros", icon: Users },
    { name: "Estadísticas", href: "/dashboard/club/estadisticas", icon: Activity },
    { name: "Banco de Tareas", href: "/dashboard/entrenamientos", icon: Target },
    { name: "Tesorería", href: "/dashboard/treasury", icon: Wallet },
    { name: "Secretaría", href: "/dashboard/secretaria", icon: Settings },
    { name: "Configuración", href: "/admin/configuracion", icon: Settings },
  ]

  return (
    <div className="md:hidden">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 fixed top-0 w-full z-40 shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <span>Sporting</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
            U
          </div>
        </div>
      </header>

      {/* Spacer for Top Header */}
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
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="flex justify-end p-4">
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="px-6 flex flex-col gap-4 mt-8">
            <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">
              {activeTeamId ? "Opciones del Equipo" : "Menú Global"}
            </h2>
            {secondaryLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 text-white text-lg py-3 border-b border-slate-800"
                >
                  <Icon className="w-6 h-6 text-emerald-400" />
                  <span className="font-medium">{link.name}</span>
                </Link>
              )
            })}
            
            {/* Mis Equipos Section */}
            {equipos.length > 0 && (
              <div className="mt-6">
                <h2 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">
                  Mis Equipos
                </h2>
                <div className="space-y-1 bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
                  {equipos.map(eq => (
                    <button
                      key={eq.id}
                      onClick={() => { setMenuOpen(false); router.push(`/dashboard/equipos/${eq.id}/plantilla`); }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeTeamId === eq.id ? "bg-emerald-900/40 text-emerald-400 font-bold border-l-2 border-emerald-400" : "text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <Shield className={`w-5 h-5 ${activeTeamId === eq.id ? "text-emerald-400" : "text-slate-400"}`} />
                      <span className="truncate">{eq.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-8">
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  if(signOutAction) signOutAction();
                }}
                className="flex items-center gap-4 text-red-400 text-lg py-3"
              >
                <LogOut className="w-6 h-6" />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
