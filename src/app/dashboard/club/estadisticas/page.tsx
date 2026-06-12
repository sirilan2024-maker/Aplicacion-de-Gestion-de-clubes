"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { BarChart3, Users, Activity, TrendingUp } from "lucide-react"

export default function EstadisticasClubPage() {
  const [stats, setStats] = useState({
    totalJugadores: 0,
    totalStaff: 0,
    asistenciaMedia: 0,
    equiposActivos: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch total players
      const { count: countJugadores } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Activo', 'Lesionado', 'Sancionado']) // Exclude removed or inactive if exist

      // Fetch total staff
      const { count: countStaff } = await supabase
        .from('team_coaches')
        .select('*', { count: 'exact', head: true })

      // Fetch total teams
      const { count: countEquipos } = await supabase
        .from('equipos')
        .select('*', { count: 'exact', head: true })

      // Fetch attendance percentage
      const { data: convocatorias } = await supabase
        .from('convocatorias')
        .select('estado_asistencia')
      
      let asisMedia = 0
      if (convocatorias && convocatorias.length > 0) {
        const confirmados = convocatorias.filter(c => c.estado_asistencia === 'Confirmado').length
        asisMedia = Math.round((confirmados / convocatorias.length) * 100)
      }

      setStats({
        totalJugadores: countJugadores || 0,
        totalStaff: countStaff || 0,
        asistenciaMedia: asisMedia,
        equiposActivos: countEquipos || 0
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2 h-64">
      <Activity className="animate-spin text-blue-500" size={32} />
      Cargando estadísticas del club...
    </div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <BarChart3 className="text-indigo-600" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Estadísticas del Club</h1>
          <p className="text-slate-500">Panel global de dirección deportiva.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta 1 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Censo Jugadores</p>
            <p className="text-3xl font-black text-slate-900">{stats.totalJugadores}</p>
          </div>
        </div>

        {/* Tarjeta 2 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Staff Técnico</p>
            <p className="text-3xl font-black text-slate-900">{stats.totalStaff}</p>
          </div>
        </div>

        {/* Tarjeta 3 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Asistencia Media</p>
            <p className="text-3xl font-black text-slate-900">{stats.asistenciaMedia}%</p>
          </div>
        </div>

        {/* Tarjeta 4 */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <BarChart3 size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Equipos Activos</p>
            <p className="text-3xl font-black text-slate-900">{stats.equiposActivos}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-8 rounded-xl border border-gray-200 text-center text-slate-500 mt-8">
        Módulo de Analítica Avanzada en desarrollo. Pronto podrás exportar informes técnicos y balances de asistencia por equipo.
      </div>
    </div>
  )
}
