"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shield, Loader2, Save } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { updateRoleNavigationAction } from "@/app/actions/roles-actions"

interface NavItem {
  id: string
  label: string
  path: string
  icon_name: string
  sort_order: number
}

const ROLES = ['admin', 'coordinador', 'entrenador', 'jugador', 'tutor']

export default function ConfigRolesPage() {
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // 1. Fetch all possible nav items
        const { data: navData } = await supabase
          .from("app_navigation")
          .select("*")
          .order("sort_order")
        
        if (navData) setNavItems(navData)

        // 2. Fetch all current role_navigation
        const { data: roleNavData } = await supabase
          .from("role_navigation")
          .select("role, nav_id")

        if (roleNavData) {
          const perms: Record<string, string[]> = {}
          ROLES.forEach(r => perms[r] = [])
          
          roleNavData.forEach(item => {
            if (!perms[item.role]) perms[item.role] = []
            perms[item.role].push(item.nav_id)
          })
          setRolePermissions(perms)
        }
      } catch (e) {
        console.error("Error loading navigation data", e)
        toast.error("Error al cargar la configuración")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleToggle = (role: string, navId: string) => {
    setRolePermissions(prev => {
      const current = prev[role] || []
      const newPerms = current.includes(navId)
        ? current.filter(id => id !== navId)
        : [...current, navId]
      return { ...prev, [role]: newPerms }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    let allSuccess = true
    try {
      for (const role of ROLES) {
        const res = await updateRoleNavigationAction(role, rolePermissions[role] || [])
        if (!res.success) {
          toast.error(`Error guardando rol ${role}: ${res.error}`)
          allSuccess = false
        }
      }
      if (allSuccess) {
        toast.success("Permisos guardados correctamente")
      }
    } catch (e) {
      toast.error("Ocurrió un error inesperado al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="text-blue-600" size={32} />
            Permisos de Navegación Dinámica
          </h1>
          <p className="text-gray-500 mt-1">Configura qué elementos del menú lateral puede ver cada rol.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 border-r border-gray-200 w-1/4">Elemento del Menú</th>
                {ROLES.map(role => (
                  <th key={role} className="px-4 py-4 text-center capitalize">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={ROLES.length + 1} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Cargando permisos...</p>
                  </td>
                </tr>
              ) : (
                navItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{item.label}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{item.path}</span>
                      </div>
                    </td>
                    {ROLES.map(role => (
                      <td key={`${item.id}-${role}`} className="px-4 py-4 text-center">
                        <label className="flex items-center justify-center cursor-pointer p-2">
                          <input
                            type="checkbox"
                            checked={rolePermissions[role]?.includes(item.id) || false}
                            onChange={() => handleToggle(role, item.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
