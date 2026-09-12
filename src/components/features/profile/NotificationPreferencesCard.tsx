"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, Smartphone, Loader2, CheckCircle2, Lock, ShieldAlert } from "lucide-react"
import { getUserPreferencesAction, updateUserPreferenceAction, UserPreferenceItem } from "@/app/actions/preference-actions"
import toast from "react-hot-toast"

interface PreferenceCategory {
  id: string
  label: string
  description: string
  icon: string
  types: string[]
}

const CATEGORIES: PreferenceCategory[] = [
  {
    id: "messages",
    label: "Mensajes y Avisos del Equipo",
    description: "Comunicados directos del entrenador y anuncios del club.",
    icon: "💬",
    types: ["TEAM_MESSAGE"],
  },
  {
    id: "convocations",
    label: "Convocatorias de Partidos",
    description: "Avisos oficiales cuando se convoca al jugador para un partido.",
    icon: "⚽",
    types: ["NEW_CONVOCATION"],
  },
  {
    id: "trainings",
    label: "Entrenamientos y Sesiones",
    description: "Publicación de nuevos entrenamientos y horarios de trabajo.",
    icon: "📋",
    types: ["NEW_TRAINING"],
  },
  {
    id: "events",
    label: "Eventos y Actividades del Club",
    description: "Torneos, reuniones, actos sociales y eventos institucionales.",
    icon: "🏆",
    types: ["NEW_EVENT"],
  },
  {
    id: "reminders",
    label: "Recordatorios y Avisos de Calendario",
    description: "Avisos programados por el entrenador y recordatorios 24h antes de cada partido o sesión.",
    icon: "⏰",
    types: ["EVENT_REMINDER", "TRAINING_REMINDER", "TRAINING_SCHEDULED_REMINDER", "MATCH_REMINDER"],
  },
]

export function NotificationPreferencesCard() {
  const [preferences, setPreferences] = useState<Record<string, UserPreferenceItem>>({})
  const [loading, setLoading] = useState(true)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    const res = await getUserPreferencesAction()
    if (res.success && res.data) {
      setPreferences(res.data)
    }
    setLoading(false)
  }

  const handleToggle = async (type: string, channel: 'in_app' | 'email') => {
    const current = preferences[type]
    if (!current) return

    if (!current.canModify) {
      toast.error("Esta preferencia está gestionada por el club y no puede modificarse", { id: "notif-locked" })
      return
    }

    if (channel === 'in_app' && !current.clubInApp) {
      toast.error("Este canal está desactivado globalmente por la política del club", { id: "club-off-inapp" })
      return
    }

    if (channel === 'email' && !current.clubEmail) {
      toast.error("Este canal está desactivado globalmente por la política del club", { id: "club-off-email" })
      return
    }

    const nextInApp = channel === 'in_app' ? !current.inAppEnabled : current.inAppEnabled
    const nextEmail = channel === 'email' ? !current.emailEnabled : current.emailEnabled

    // Update optimistic state
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...current,
        inAppEnabled: nextInApp,
        emailEnabled: nextEmail,
        effectiveInApp: current.clubInApp && nextInApp,
        effectiveEmail: current.clubEmail && nextEmail,
      },
    }))

    setUpdatingKey(`${type}-${channel}`)
    const res = await updateUserPreferenceAction({
      notificationType: type,
      inAppEnabled: nextInApp,
      emailEnabled: nextEmail,
    })
    setUpdatingKey(null)

    if (res.success) {
      toast.success("Preferencia guardada", { id: "notif-pref-toast" })
    } else {
      toast.error(res.error || "Error al guardar preferencia")
      loadPreferences() // rollback
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[250px]">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  // Filtrar solo las categorías que tienen al menos un tipo visible (can_view = true)
  const visibleCategories = CATEGORIES.filter(cat => {
    const primaryType = cat.types[0]
    return Boolean(preferences[primaryType])
  })

  if (visibleCategories.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Canales de Notificación</h2>
            <p className="text-xs text-slate-500">Configuración gestionada directamente por el club.</p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Las opciones de notificación de tu perfil están administradas centralmente por la directiva del club.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Canales de Notificación</h2>
            <p className="text-xs text-slate-500">Configura dónde deseas recibir cada tipo de aviso del club.</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleCategories.map(cat => {
          // Primary type for this category
          const primaryType = cat.types[0]
          const pref = preferences[primaryType]
          if (!pref) return null

          const isLocked = !pref.canModify
          const isClubInAppOff = !pref.clubInApp
          const isClubEmailOff = !pref.clubEmail

          return (
            <div key={cat.id} className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-sm font-bold text-slate-900">{cat.label}</span>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200" title="Gestionado por la administración del club">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Fijado por el club
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-6">
                  {cat.description}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 pl-6 sm:pl-0">
                {/* IN_APP TOGGLE */}
                <button
                  type="button"
                  onClick={() => cat.types.forEach(t => handleToggle(t, 'in_app'))}
                  disabled={Boolean(updatingKey) || isLocked || isClubInAppOff}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isClubInAppOff
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60 line-through"
                      : isLocked
                      ? pref.effectiveInApp
                        ? "bg-indigo-50/70 border-indigo-200/70 text-indigo-700 cursor-not-allowed opacity-80"
                        : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : pref.effectiveInApp
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs hover:bg-indigo-100"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                  }`}
                  title={
                    isClubInAppOff
                      ? "Canal App desactivado por política global del club"
                      : isLocked
                      ? "Preferencia fijada por la administración del club"
                      : "Activar/desactivar notificaciones internas en la app"
                  }
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>App</span>
                  {pref.effectiveInApp && !isClubInAppOff && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                  {isLocked && !isClubInAppOff && <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />}
                </button>

                {/* EMAIL TOGGLE */}
                <button
                  type="button"
                  onClick={() => cat.types.forEach(t => handleToggle(t, 'email'))}
                  disabled={Boolean(updatingKey) || isLocked || isClubEmailOff}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isClubEmailOff
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60 line-through"
                      : isLocked
                      ? pref.effectiveEmail
                        ? "bg-emerald-50/70 border-emerald-200/70 text-emerald-700 cursor-not-allowed opacity-80"
                        : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : pref.effectiveEmail
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs hover:bg-emerald-100"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                  }`}
                  title={
                    isClubEmailOff
                      ? "Canal Email desactivado por política global del club"
                      : isLocked
                      ? "Preferencia fijada por la administración del club"
                      : "Activar/desactivar avisos por correo electrónico"
                  }
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                  {pref.effectiveEmail && !isClubEmailOff && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {isLocked && !isClubEmailOff && <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />}
                </button>

                {/* PUSH (NO OPERATIVO / PRÓXIMAMENTE) */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/60 border border-slate-200/60 text-slate-400 text-[11px] font-semibold cursor-not-allowed opacity-60"
                  title="Canal Web Push en fase de preparación de infraestructura"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Push</span>
                  <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded-sm">Pronto</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

