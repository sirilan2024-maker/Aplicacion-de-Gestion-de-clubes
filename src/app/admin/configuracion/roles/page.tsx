"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Shield, 
  Loader2, 
  Save, 
  Landmark, 
  Bell, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  UserCheck, 
  Grid, 
  SlidersHorizontal,
  X,
  Search,
  Sparkles,
  Info
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { 
  updateRoleNavigationAction, 
  syncAppNavigationAction, 
  createCustomRoleAction, 
  deleteCustomRoleAction,
  getRolesConfigDataAction
} from "@/app/actions/roles-actions"
import { 
  BASE_SYSTEM_ROLES,
  SYSTEM_MODULES,
  AppNavModule
} from "@/lib/roles-config"


interface RoleItem {
  key: string
  label: string
  category: string
  isCustom?: boolean
}

export default function ConfigRolesPage() {
  const [navItems, setNavItems] = useState<AppNavModule[]>([])
  const [rolesList, setRolesList] = useState<RoleItem[]>([])
  const [selectedRole, setSelectedRole] = useState<string>("entrenador")
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [viewMode, setViewMode] = useState<"role" | "matrix">("role")
  const [searchFilter, setSearchFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Modal para crear nuevo rol
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleCategory, setNewRoleCategory] = useState("Cuerpo Técnico")
  const [newRoleNavs, setNewRoleNavs] = useState<string[]>([])
  const [creatingRole, setCreatingRole] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getRolesConfigDataAction()
      if (res && res.modules && res.roles && res.perms) {
        setNavItems(res.modules)
        setRolesList(res.roles)
        setRolePermissions(res.perms)
      } else {
        setNavItems(SYSTEM_MODULES)
        setRolesList(BASE_SYSTEM_ROLES)
      }
    } catch (e) {
      console.error("Error loading navigation data", e)
      // Fallback seguro sin bloquear la interfaz
      setNavItems(SYSTEM_MODULES)
      setRolesList(BASE_SYSTEM_ROLES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSyncModules = async () => {
    setSyncing(true)
    try {
      const res = await syncAppNavigationAction()
      if (res.success) {
        toast.success("Módulos sincronizados correctamente con la base de datos")
        await loadData()
      } else {
        toast.error("Error al sincronizar: " + res.error)
      }
    } catch (e) {
      toast.error("Error inesperado al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  const handleToggle = (role: string, navId: string) => {
    setRolePermissions(prev => {
      const current = prev[role] || []
      const newPerms = current.includes(navId)
        ? current.filter(id => id !== navId)
        : [...current, navId]
      return { ...prev, [role]: newPerms }
    })
  }

  const handleToggleAllForRole = (role: string, enableAll: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: enableAll ? navItems.map(n => n.id) : []
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    let allSuccess = true
    try {
      for (const roleItem of rolesList) {
        const res = await updateRoleNavigationAction(roleItem.key, rolePermissions[roleItem.key] || [])
        if (!res.success) {
          toast.error(`Error guardando rol ${roleItem.label}: ${res.error}`)
          allSuccess = false
        }
      }
      if (allSuccess) {
        toast.success("Permisos de todos los roles guardados con éxito")
      }
    } catch (e) {
      toast.error("Ocurrió un error inesperado al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return

    setCreatingRole(true)
    try {
      const res = await createCustomRoleAction(newRoleName, newRoleNavs)
      if (res.success) {
        toast.success(`Rol "${newRoleName}" creado correctamente`)
        setShowNewRoleModal(false)
        setNewRoleName("")
        setNewRoleNavs([])
        await loadData()
      } else {
        toast.error(res.error || "Error al crear el rol")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear el rol")
    } finally {
      setCreatingRole(false)
    }
  }

  const handleDeleteCustomRole = async (roleKey: string, roleLabel: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el rol personalizado "${roleLabel}"?`)) return

    try {
      const res = await deleteCustomRoleAction(roleKey)
      if (res.success) {
        toast.success(`Rol "${roleLabel}" eliminado correctamente`)
        if (selectedRole === roleKey) {
          setSelectedRole("entrenador")
        }
        await loadData()
      } else {
        toast.error(res.error || "Error al eliminar el rol")
      }
    } catch (err: any) {
      toast.error(err.message || "Error inesperado")
    }
  }

  // Agrupar módulos por categoría
  const categories = Array.from(new Set(navItems.map(n => n.category)))
  const filteredNavItems = navItems.filter(item => 
    item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.category.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const activeRoleObj = rolesList.find(r => r.key === selectedRole) || rolesList[0]

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Shield size={28} />
            </div>
            <span>Roles y Permisos de Navegación</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configura qué módulos y pantallas puede ver y gestionar cada rol en el menú lateral.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            onClick={handleSyncModules}
            disabled={syncing || loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Sincroniza todos los módulos nuevos de la plataforma"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin text-blue-600" : "text-slate-400"} />
            <span>Sincronizar Módulos</span>
          </button>

          <button
            onClick={() => setShowNewRoleModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Crear Nuevo Rol</span>
          </button>

          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto no-scrollbar max-w-full">
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/configuracion"
            className="px-4 py-2.5 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Landmark className="w-4 h-4" />
            <span>Métricas y SEPA</span>
          </Link>
          <Link
            href="/admin/configuracion/roles"
            className="px-4 py-2.5 text-xs md:text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Shield className="w-4 h-4" />
            <span>Roles y Permisos</span>
          </Link>
          <Link
            href="/admin/configuracion/notificaciones"
            className="px-4 py-2.5 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Bell className="w-4 h-4" />
            <span>Notificaciones</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: View Mode + Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Toggle Vista */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode("role")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === "role"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Vista por Rol Individual</span>
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === "matrix"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid size={15} />
            <span>Matriz Global de Todos</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Buscar módulo o ruta..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-sm">Cargando roles y permisos del club...</p>
        </div>
      ) : viewMode === "role" ? (
        /* ══════════════════════════════════════════════════════════════════════════ */
        /* VISTA 1: POR ROL INDIVIDUAL (RECOMENDADA)                                  */
        /* ══════════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Selector Lateral de Roles */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-2">
              Roles Disponibles ({rolesList.length})
            </h3>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {rolesList.map(r => {
                const isSelected = selectedRole === r.key
                const count = rolePermissions[r.key]?.length || 0

                return (
                  <div
                    key={r.key}
                    onClick={() => setSelectedRole(r.key)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate">{r.label}</span>
                        {r.isCustom && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Clave: {r.key}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        count > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
                      }`}>
                        {count} módulo{count !== 1 ? 's' : ''}
                      </span>

                      {r.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomRole(r.key, r.label)
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar rol personalizado"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel Central de Permisos del Rol Seleccionado */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">
                    Permisos para: <span className="text-blue-600">{activeRoleObj?.label}</span>
                  </h2>
                  {activeRoleObj?.isCustom && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Rol Personalizado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Identificador del sistema: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{activeRoleObj?.key}</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllForRole(activeRoleObj.key, true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllForRole(activeRoleObj.key, false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* Módulos agrupados por Categoría */}
            <div className="space-y-6">
              {categories.map(cat => {
                const catModules = filteredNavItems.filter(m => m.category === cat)
                if (catModules.length === 0) return null

                return (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>{cat}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {catModules.map(item => {
                        const isChecked = rolePermissions[activeRoleObj.key]?.includes(item.id) || false

                        return (
                          <label
                            key={item.id}
                            onClick={() => handleToggle(activeRoleObj.key, item.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? "bg-blue-50/70 border-blue-200 text-blue-950 shadow-xs"
                                : "bg-slate-50/50 border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex flex-col pr-3 min-w-0">
                              <span className="font-bold text-xs truncate">{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono truncate">{item.path}</span>
                            </div>

                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════ */
        /* VISTA 2: MATRIZ GLOBAL COMPLETA                                            */
        /* ══════════════════════════════════════════════════════════════════════════ */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-5 py-4 border-r border-slate-200 w-64 bg-slate-50 sticky left-0 z-10">
                    Módulo / Pantalla
                  </th>
                  {rolesList.map(roleItem => (
                    <th key={roleItem.key} className="px-3 py-4 text-center whitespace-nowrap min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-slate-800">{roleItem.label}</span>
                        <span className="text-[9px] text-slate-400 font-mono normal-case">{roleItem.key}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNavItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 border-r border-slate-200 bg-white sticky left-0 z-10">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">{item.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.path}</span>
                        </div>
                      </div>
                    </td>
                    {rolesList.map(roleItem => {
                      const isChecked = rolePermissions[roleItem.key]?.includes(item.id) || false
                      return (
                        <td key={`${item.id}-${roleItem.key}`} className="px-3 py-3 text-center">
                          <label className="flex items-center justify-center cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggle(roleItem.key, item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR NUEVO ROL PERSONALIZADO ── */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Crear Nuevo Rol Personalizado</h3>
                  <p className="text-xs text-slate-500">Define un rol a medida para tu club</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Nutricionista, Scouting, Prensa, Psicólogo..."
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se generará una clave interna limpia automáticamente para la base de datos.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Permisos de inicio ({newRoleNavs.length} seleccionados)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRoleNavs(navItems.map(n => n.id))}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoleNavs([])}
                      className="text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-1.5 bg-slate-50/50">
                  {navItems.map(item => {
                    const isChecked = newRoleNavs.includes(item.id)
                    return (
                      <label
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <span className="font-semibold text-slate-800">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setNewRoleNavs(prev =>
                              isChecked ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            )
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="pt-3 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewRoleModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingRole || !newRoleName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creatingRole ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>Crear y Activar Rol</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
