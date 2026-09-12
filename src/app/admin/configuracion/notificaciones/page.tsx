"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Bell,
  Mail,
  Smartphone,
  AppWindow,
  Save,
  RotateCcw,
  Shield,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Sliders,
  Check,
  X,
  Users,
  UserCheck,
  Search,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import {
  getClubNotificationPoliciesAction,
  saveAllClubNotificationPoliciesAction,
  getClubUsersForNotificationControlAction,
  getAdminUserPreferencesAction,
  adminSaveUserPreferencesAction,
  adminResetUserPreferencesAction,
} from "@/app/actions/notification-policy-actions"
import { NOTIFICATION_TYPE_REGISTRY } from "@/lib/notifications/registry"
import type { NotificationPolicyMetadata } from "@/lib/notifications/registry"
import { ClubNotificationPolicy, UserNotificationPreference } from "@/lib/notifications/types"

interface ClubUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl?: string | null
}

export default function ConfigNotificacionesPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'club_policies' | 'user_control'>('club_policies')

  // --- TAB 1: POLÍTICAS DEL CLUB ---
  const [policies, setPolicies] = useState<Record<string, ClubNotificationPolicy>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS")
  const [searchQuery, setSearchQuery] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  // --- TAB 2: CONTROL POR USUARIO ---
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<ClubUser | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userSaving, setUserSaving] = useState(false)
  const [userPrefs, setUserPrefs] = useState<Record<string, any>>({})
  const [userClubPolicies, setUserClubPolicies] = useState<Record<string, ClubNotificationPolicy>>({})
  const [userHasUnsavedChanges, setUserHasUnsavedChanges] = useState(false)
  const [userCategory, setUserCategory] = useState<string>("TODAS")

  const loadClubPolicies = async () => {
    setLoading(true)
    setAuthError(null)
    try {
      const res = await getClubNotificationPoliciesAction()
      if (res.success && res.data) {
        setPolicies(res.data)
        setHasUnsavedChanges(false)
      } else {
        setAuthError(res.error || "Acceso denegado")
        toast.error(res.error || "Error al cargar las políticas de notificación")
      }
    } catch (e: any) {
      setAuthError("Error de conexión al cargar la configuración")
      toast.error("Error de conexión al cargar la configuración")
    } finally {
      setLoading(false)
    }
  }

  const loadClubUsers = async (query = "") => {
    try {
      const res = await getClubUsersForNotificationControlAction(query)
      if (res.success && res.users) {
        setClubUsers(res.users)
        if (!selectedUser && res.users.length > 0) {
          handleSelectUser(res.users[0])
        }
      }
    } catch (e: any) {
      toast.error("Error al cargar la lista de usuarios")
    }
  }

  useEffect(() => {
    loadClubPolicies()
    loadClubUsers()
  }, [])

  const handleSelectUser = async (user: ClubUser) => {
    setSelectedUser(user)
    setUserLoading(true)
    setUserHasUnsavedChanges(false)
    try {
      const res = await getAdminUserPreferencesAction(user.id)
      if (res.success && res.data) {
        setUserPrefs(res.data.userPreferences)
        setUserClubPolicies(res.data.clubPolicies)
      } else {
        toast.error(res.error || "Error al cargar preferencias del usuario")
      }
    } catch (e: any) {
      toast.error("Error de conexión al cargar usuario")
    } finally {
      setUserLoading(false)
    }
  }

  // Toggle para políticas del club
  const handleToggleClubPolicy = (type: string, channel: 'in_app' | 'email' | 'push') => {
    const current = policies[type] || {
      clubId: "",
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
    }

    const updated: ClubNotificationPolicy = {
      ...current,
      inAppEnabled: channel === 'in_app' ? !current.inAppEnabled : current.inAppEnabled,
      emailEnabled: channel === 'email' ? !current.emailEnabled : current.emailEnabled,
      pushEnabled: channel === 'push' ? !current.pushEnabled : current.pushEnabled,
    }

    setPolicies(prev => ({
      ...prev,
      [type]: updated,
    }))
    setHasUnsavedChanges(true)
  }

  const handleSaveAllClubPolicies = async () => {
    setSaving(true)
    try {
      const payload = Object.values(policies).map(p => ({
        notificationType: p.notificationType,
        inAppEnabled: p.inAppEnabled,
        emailEnabled: p.emailEnabled,
        pushEnabled: p.pushEnabled,
      }))

      const res = await saveAllClubNotificationPoliciesAction(payload)
      if (res.success) {
        toast.success("Políticas de notificación guardadas con éxito", { id: "save-policies-toast" })
        setHasUnsavedChanges(false)
      } else {
        toast.error(res.error || "Error al guardar las políticas")
      }
    } catch (e: any) {
      toast.error("Ocurrió un fallo al comunicarse con el servidor")
    } finally {
      setSaving(false)
    }
  }

  const handleResetClubDefaults = () => {
    const defaultsMap: Record<string, ClubNotificationPolicy> = {}
    NOTIFICATION_TYPE_REGISTRY.forEach(item => {
      defaultsMap[item.type] = {
        clubId: policies[item.type]?.clubId || "",
        notificationType: item.type,
        inAppEnabled: item.defaultInApp,
        emailEnabled: item.defaultEmail,
        pushEnabled: item.defaultPush,
      }
    })
    setPolicies(defaultsMap)
    setHasUnsavedChanges(true)
    toast.success("Valores restaurados por defecto (recuerda pulsar Guardar)")
  }

  // Handlers para control de usuario
  const handleUserPrefChannelToggle = (type: string, channel: 'in_app' | 'email' | 'push') => {
    const current = userPrefs[type]
    if (!current) return

    const clubPolicy = userClubPolicies[type]
    const clubChannelEnabled = channel === 'in_app' ? (clubPolicy?.inAppEnabled ?? true)
      : channel === 'email' ? (clubPolicy?.emailEnabled ?? true)
      : (clubPolicy?.pushEnabled ?? true)

    if (!clubChannelEnabled) {
      toast.error("Este canal está desactivado por la política global del club y no puede activarse", { id: "club-off-warn" })
      return
    }

    const nextInApp = channel === 'in_app' ? !current.inAppEnabled : current.inAppEnabled
    const nextEmail = channel === 'email' ? !current.emailEnabled : current.emailEnabled
    const nextPush = channel === 'push' ? !current.pushEnabled : current.pushEnabled

    const reg = NOTIFICATION_TYPE_REGISTRY.find(r => r.type === type)
    const isCritical = Boolean(reg?.isCritical)

    setUserPrefs(prev => ({
      ...prev,
      [type]: {
        ...current,
        inAppEnabled: nextInApp,
        emailEnabled: nextEmail,
        pushEnabled: nextPush,
        isCustomOverride: true,
        effectiveInApp: isCritical ? true : ((clubPolicy?.inAppEnabled ?? true) && nextInApp),
        effectiveEmail: isCritical ? true : ((clubPolicy?.emailEnabled ?? true) && nextEmail),
        effectivePush: (clubPolicy?.pushEnabled ?? true) && nextPush,
      },
    }))
    setUserHasUnsavedChanges(true)
  }

  const handleUserPermissionToggle = (type: string, perm: 'can_view' | 'can_modify') => {
    const current = userPrefs[type]
    if (!current) return

    let nextCanView = current.canView
    let nextCanModify = current.canModify

    if (perm === 'can_view') {
      nextCanView = !current.canView
      // Si se oculta, no puede quedar en can_modify = true
      if (!nextCanView) {
        nextCanModify = false
      }
    } else {
      nextCanModify = !current.canModify
      // Si se permite editar, forzosamente debe ser visible
      if (nextCanModify) {
        nextCanView = true
      }
    }

    setUserPrefs(prev => ({
      ...prev,
      [type]: {
        ...current,
        canView: nextCanView,
        canModify: nextCanModify,
        isCustomOverride: true,
      },
    }))
    setUserHasUnsavedChanges(true)
  }

  const handleSaveUserPreferences = async () => {
    if (!selectedUser) return
    setUserSaving(true)
    try {
      const payload = Object.values(userPrefs).map((p: any) => ({
        notificationType: p.notificationType,
        inAppEnabled: p.inAppEnabled,
        emailEnabled: p.emailEnabled,
        pushEnabled: p.pushEnabled,
        canView: p.canView,
        canModify: p.canModify,
        isCustomOverride: p.isCustomOverride,
      }))

      const res = await adminSaveUserPreferencesAction({
        targetUserId: selectedUser.id,
        preferences: payload,
      })

      if (res.success) {
        toast.success("Preferencias y permisos del usuario guardados con éxito", { id: "user-save-toast" })
        setUserHasUnsavedChanges(false)
      } else {
        toast.error(res.error || "Error al guardar configuración del usuario")
      }
    } catch (e: any) {
      toast.error("Error al comunicarse con el servidor")
    } finally {
      setUserSaving(false)
    }
  }

  const handleResetUserToClubPolicies = async () => {
    if (!selectedUser) return
    if (!confirm(`¿Deseas restablecer todas las preferencias de ${selectedUser.firstName || selectedUser.email} para que herede las políticas del club?`)) {
      return
    }

    setUserSaving(true)
    try {
      const res = await adminResetUserPreferencesAction({
        targetUserId: selectedUser.id,
      })

      if (res.success) {
        toast.success("Usuario restablecido a políticas del club")
        handleSelectUser(selectedUser)
      } else {
        toast.error(res.error || "Error al restablecer usuario")
      }
    } catch (e: any) {
      toast.error("Error al restablecer usuario")
    } finally {
      setUserSaving(false)
    }
  }

  const categories = ["TODAS", "Competición", "Entrenamientos", "Eventos", "Comunicación", "Tesorería", "Secretaría", "Gestión"]

  const filteredRegistry = NOTIFICATION_TYPE_REGISTRY.filter(item => {
    const activeCat = activeTab === 'club_policies' ? selectedCategory : userCategory
    const activeSearch = activeTab === 'club_policies' ? searchQuery : searchQuery
    const matchesCategory = activeCat === "TODAS" || item.category === activeCat
    const matchesSearch = item.label.toLowerCase().includes(activeSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(activeSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Estadísticas
  const totalCount = NOTIFICATION_TYPE_REGISTRY.length
  const activeInAppCount = Object.values(policies).filter(p => p.inAppEnabled).length
  const activeEmailCount = Object.values(policies).filter(p => p.emailEnabled).length
  const activePushCount = Object.values(policies).filter(p => p.pushEnabled).length

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Cargando centro de notificaciones...</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl mx-auto flex items-center justify-center border border-red-100 shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Denegado</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {authError}. Esta sección está reservada exclusivamente para administradores generales del club.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/admin/inicio"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Volver al Panel Principal
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />

      {/* HEADER & TOP SETTINGS SUBNAVIGATION */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100">
              <Bell size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Políticas de Notificaciones y Gobernanza
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Control administrativo de políticas del club y configuración individualizada por usuario.
              </p>
            </div>
          </div>

          {/* Action buttons depending on active tab */}
          {activeTab === 'club_policies' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetClubDefaults}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                title="Restaurar valores predeterminados recomendados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                onClick={handleSaveAllClubPolicies}
                disabled={saving || !hasUnsavedChanges}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${
                  hasUnsavedChanges
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 scale-102 ring-2 ring-indigo-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Políticas</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetUserToClubPolicies}
                disabled={userSaving || !selectedUser}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                title="Eliminar overrides y heredar políticas del club"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Heredar Club</span>
              </button>

              <button
                onClick={handleSaveUserPreferences}
                disabled={userSaving || !selectedUser || !userHasUnsavedChanges}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${
                  userHasUnsavedChanges
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 scale-102 ring-2 ring-indigo-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                }`}
              >
                {userSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Usuario</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Subnavigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/configuracion"
              className="px-4 py-2.5 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors flex items-center gap-2"
            >
              <Landmark className="w-4 h-4" />
              <span>Métricas y SEPA</span>
            </Link>
            <Link
              href="/admin/configuracion/roles"
              className="px-4 py-2.5 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Roles y Permisos</span>
            </Link>
            <Link
              href="/admin/configuracion/notificaciones"
              className="px-4 py-2.5 text-xs md:text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>Notificaciones</span>
            </Link>
          </div>
        </div>
      </div>

      {/* TABS: POLÍTICAS GLOBALES VS CONTROL POR USUARIO */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-md">
        <button
          onClick={() => setActiveTab('club_policies')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'club_policies'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Políticas del Club</span>
        </button>

        <button
          onClick={() => setActiveTab('user_control')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'user_control'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Control por Usuario</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POLÍTICAS GLOBALES DEL CLUB */}
      {/* ========================================================================= */}
      {activeTab === 'club_policies' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 font-bold border border-slate-100">
                {totalCount}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipos de Aviso</p>
                <p className="text-sm font-black text-slate-900">Registrados</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <AppWindow className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Canal App</p>
                <p className="text-sm font-black text-slate-900">{activeInAppCount} Activos</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Canal Email</p>
                <p className="text-sm font-black text-slate-900">{activeEmailCount} Activos</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Canal Push</p>
                <p className="text-sm font-black text-slate-900">{activePushCount} Activos</p>
              </div>
            </div>
          </div>

          {/* UNSAVED CHANGES BANNER */}
          {hasUnsavedChanges && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold">
                  Tienes modificaciones pendientes de guardar en las políticas de notificación.
                </span>
              </div>
              <button
                onClick={handleSaveAllClubPolicies}
                disabled={saving}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
              >
                Guardar Ahora
              </button>
            </div>
          )}

          {/* FILTER & SEARCH */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Buscar aviso por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* POLICIES MATRIX */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredRegistry.map(item => {
                const pol = policies[item.type] || {
                  clubId: "",
                  notificationType: item.type,
                  inAppEnabled: item.defaultInApp,
                  emailEnabled: item.defaultEmail,
                  pushEnabled: item.defaultPush,
                }

                return (
                  <div key={item.type} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.category}
                        </span>
                        {item.isCritical && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            Crítico
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed pl-7">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pl-7 md:pl-0">
                      {/* IN_APP TOGGLE */}
                      <button
                        type="button"
                        onClick={() => handleToggleClubPolicy(item.type, 'in_app')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          pol.inAppEnabled
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>App</span>
                        {pol.inAppEnabled ? <Check className="w-3 h-3 text-indigo-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      </button>

                      {/* EMAIL TOGGLE */}
                      <button
                        type="button"
                        onClick={() => handleToggleClubPolicy(item.type, 'email')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          pol.emailEnabled
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                        {pol.emailEnabled ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      </button>

                      {/* PUSH TOGGLE */}
                      <button
                        type="button"
                        onClick={() => handleToggleClubPolicy(item.type, 'push')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          pol.pushEnabled
                            ? "bg-purple-50 border-purple-200 text-purple-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Push</span>
                        {pol.pushEnabled ? <Check className="w-3 h-3 text-purple-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONTROL POR USUARIO Y PERMISOS DE PREFERENCIAS */}
      {/* ========================================================================= */}
      {activeTab === 'user_control' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* USER SELECTOR STRIP */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>Seleccionar Usuario del Club</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Elige al miembro para ver su configuración, aplicar overrides y definir qué opciones puede ver o modificar en su perfil.
                </p>
              </div>

              {/* Dropdown Selector de Miembros */}
              <div className="w-full lg:w-96">
                <label htmlFor="member-dropdown-select" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Desplegable de Miembros ({clubUsers.length})
                </label>
                <div className="relative">
                  <select
                    id="member-dropdown-select"
                    value={selectedUser?.id || ""}
                    onChange={(e) => {
                      const user = clubUsers.find(u => u.id === e.target.value)
                      if (user) handleSelectUser(user)
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs md:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-xs appearance-none"
                  >
                    <option value="" disabled>
                      {userLoading ? "Cargando miembros..." : "-- Selecciona un usuario de la lista --"}
                    </option>
                    {clubUsers.map(u => {
                      const fullName = u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email
                      const roleBadge = u.role.toUpperCase()
                      return (
                        <option key={u.id} value={u.id}>
                          {fullName} [{roleBadge}] - {u.email}
                        </option>
                      )
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick access pills & filter */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Acceso Rápido:
                </span>
                {clubUsers.map(u => {
                  const isSelected = selectedUser?.id === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {(u.firstName || u.email || "U")[0].toUpperCase()}
                      </div>
                      <span>{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email}</span>
                      <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-mono ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {u.role}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* User search */}
              <div className="relative w-full sm:w-60 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar miembros..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value)
                    loadClubUsers(e.target.value)
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* USER CONFIGURATION MATRIX */}
          {selectedUser && (
            <div className="space-y-6">
              {/* USER INFO BANNER & REASONING CARD */}
              <div className="bg-gradient-to-r from-indigo-500/10 via-slate-50 to-emerald-500/10 p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm">
                    {(selectedUser.firstName || selectedUser.email || "U")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName || ''}`.trim() : selectedUser.email}
                      </h3>
                      <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                        {selectedUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Jerarquía activa:</strong> Si el club tiene un canal en <code>OFF</code>, prevalece siempre sobre la configuración del usuario.
                  </span>
                </div>
              </div>

              {/* UNSAVED CHANGES WARNING FOR USER */}
              {userHasUnsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="text-sm font-semibold">
                      Tienes cambios pendientes en los permisos de este usuario.
                    </span>
                  </div>
                  <button
                    onClick={handleSaveUserPreferences}
                    disabled={userSaving}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
                  >
                    Guardar Usuario
                  </button>
                </div>
              )}

              {userLoading ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-xs text-slate-500 font-medium">Cargando matriz del usuario...</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <span>Aviso / Categoría</span>
                    <div className="hidden lg:grid grid-cols-3 gap-8 text-center pr-4">
                      <span>1. Política Club</span>
                      <span>2. Config. Usuario</span>
                      <span>3. Permisos en Perfil</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredRegistry.map(item => {
                      const pref = userPrefs[item.type] || {
                        notificationType: item.type,
                        inAppEnabled: item.defaultInApp,
                        emailEnabled: item.defaultEmail,
                        pushEnabled: item.defaultPush,
                        canView: true,
                        canModify: false,
                        isCustomOverride: false,
                        effectiveInApp: true,
                        effectiveEmail: true,
                        effectivePush: true,
                      }

                      const clubPol = userClubPolicies[item.type] || {
                        inAppEnabled: item.defaultInApp,
                        emailEnabled: item.defaultEmail,
                        pushEnabled: item.defaultPush,
                      }

                      return (
                        <div key={item.type} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                          {/* NOTIFICATION INFO */}
                          <div className="space-y-1 max-w-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{item.icon}</span>
                              <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed pl-6">
                              {item.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 items-center pl-6 lg:pl-0">
                            {/* COL 1: POLÍTICA DEL CLUB (REFERENCIA) */}
                            <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                <Landmark className="w-3 h-3" />
                                <span>Club Global</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${clubPol.inAppEnabled ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-500 line-through"}`}>
                                  App: {clubPol.inAppEnabled ? "ON" : "OFF"}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${clubPol.emailEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-500 line-through"}`}>
                                  Email: {clubPol.emailEnabled ? "ON" : "OFF"}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${clubPol.pushEnabled ? "bg-purple-50 text-purple-700" : "bg-slate-200 text-slate-500 line-through"}`}>
                                  Push: {clubPol.pushEnabled ? "ON" : "OFF"}
                                </span>
                              </div>
                            </div>

                            {/* COL 2: CONFIGURACIÓN DEL USUARIO */}
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                <Sliders className="w-3 h-3" />
                                <span>Canales Usuario</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUserPrefChannelToggle(item.type, 'in_app')}
                                  disabled={!clubPol.inAppEnabled}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    !clubPol.inAppEnabled
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                                      : pref.inAppEnabled
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-slate-50 text-slate-400 border-slate-200"
                                  }`}
                                  title={!clubPol.inAppEnabled ? "Bloqueado por política del club" : "Activar/desactivar App"}
                                >
                                  App
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUserPrefChannelToggle(item.type, 'email')}
                                  disabled={!clubPol.emailEnabled}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    !clubPol.emailEnabled
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                                      : pref.emailEnabled
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-slate-50 text-slate-400 border-slate-200"
                                  }`}
                                  title={!clubPol.emailEnabled ? "Bloqueado por política del club" : "Activar/desactivar Email"}
                                >
                                  Email
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUserPrefChannelToggle(item.type, 'push')}
                                  disabled={!clubPol.pushEnabled}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    !clubPol.pushEnabled
                                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                                      : pref.pushEnabled
                                      ? "bg-purple-600 text-white border-purple-600"
                                      : "bg-slate-50 text-slate-400 border-slate-200"
                                  }`}
                                  title={!clubPol.pushEnabled ? "Bloqueado por política del club" : "Activar/desactivar Push"}
                                >
                                  Push
                                </button>
                              </div>
                            </div>

                            {/* COL 3: PERMISOS EN /dashboard/mi-perfil */}
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Permisos Usuario</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* CAN_VIEW SWITCH */}
                                <button
                                  type="button"
                                  onClick={() => handleUserPermissionToggle(item.type, 'can_view')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    pref.canView
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-400 border-slate-200"
                                  }`}
                                  title="Si está activo, el usuario verá esta notificación en su pantalla /dashboard/mi-perfil"
                                >
                                  {pref.canView ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                  <span>{pref.canView ? "Visible" : "Oculto"}</span>
                                </button>

                                {/* CAN_MODIFY SWITCH */}
                                <button
                                  type="button"
                                  onClick={() => handleUserPermissionToggle(item.type, 'can_modify')}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    pref.canModify
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-100 text-slate-400 border-slate-200"
                                  }`}
                                  title="Si está activo, el usuario podrá activar/desactivar canales dentro de los límites del club"
                                >
                                  {pref.canModify ? <Edit3 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                  <span>{pref.canModify ? "Editable" : "Bloqueado"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
