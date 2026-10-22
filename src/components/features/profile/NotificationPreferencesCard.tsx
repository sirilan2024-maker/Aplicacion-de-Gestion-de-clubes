"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, Smartphone, Loader2, CheckCircle2, Lock, ShieldAlert, Send, SmartphoneNfc } from "lucide-react"
import { getUserPreferencesAction, updateUserPreferenceAction, UserPreferenceItem } from "@/app/actions/preference-actions"
import { isPushSupported, getCurrentPushSubscription, subscribeToPush } from "@/lib/push-client"
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
  const [isPushActive, setIsPushActive] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)

  useEffect(() => {
    loadPreferences()
    checkDevicePushStatus()
  }, [])

  const checkDevicePushStatus = async () => {
    if (isPushSupported()) {
      const sub = await getCurrentPushSubscription()
      setIsPushActive(Boolean(sub))
    }
  }

  const loadPreferences = async () => {
    setLoading(true)
    const res = await getUserPreferencesAction()
    if (res.success && res.data) {
      setPreferences(res.data)
    }
    setLoading(false)
  }

  const handleToggle = async (type: string, channel: 'in_app' | 'email' | 'push') => {
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

    if (channel === 'push' && !current.clubPush) {
      toast.error("Este canal está desactivado globalmente por la política del club", { id: "club-off-push" })
      return
    }

    const nextInApp = channel === 'in_app' ? !current.inAppEnabled : current.inAppEnabled
    const nextEmail = channel === 'email' ? !current.emailEnabled : current.emailEnabled
    const nextPush = channel === 'push' ? !current.pushEnabled : current.pushEnabled

    // Update optimistic state
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...current,
        inAppEnabled: nextInApp,
        emailEnabled: nextEmail,
        pushEnabled: nextPush,
        effectiveInApp: current.clubInApp && nextInApp,
        effectiveEmail: current.clubEmail && nextEmail,
        effectivePush: current.clubPush && nextPush,
      },
    }))

    setUpdatingKey(`${type}-${channel}`)
    const res = await updateUserPreferenceAction({
      notificationType: type,
      inAppEnabled: nextInApp,
      emailEnabled: nextEmail,
      pushEnabled: nextPush,
    })
    setUpdatingKey(null)

    if (res.success) {
      toast.success("Preferencia guardada", { id: "notif-pref-toast" })
    } else {
      toast.error(res.error || "Error al guardar preferencia")
      loadPreferences() // rollback
    }
  }

  const handleEnableDevicePush = async () => {
    setEnablingPush(true)
    try {
      const res = await subscribeToPush()
      if (res.success && res.subscription) {
        setIsPushActive(true)
        toast.success("¡Dispositivo suscrito con éxito a las notificaciones Push!")
      } else {
        toast.error(res.error || "No se pudo suscribir este dispositivo.")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al habilitar notificaciones.")
    } finally {
      setEnablingPush(false)
    }
  }

  const handleSendTestPush = async () => {
    setTestingPush(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("¡Aviso de prueba enviado a tu móvil!", { icon: '📲', duration: 4000 })
      } else {
        toast.error(data.error || "No se pudo enviar el aviso de prueba.")
      }
    } catch {
      toast.error("Error de conexión al enviar la prueba.")
    } finally {
      setTestingPush(false)
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
      {/* HEADER CON BOTÓN DE TEST */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Canales de Notificación</h2>
            <p className="text-xs text-slate-500">Configura dónde deseas recibir cada tipo de aviso del club.</p>
          </div>
        </div>

        {/* ESTADO PUSH & PRUEBA */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isPushActive ? (
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testingPush}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
              title="Envía una notificación push de prueba a tu móvil para comprobar que todo funciona"
            >
              {testingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Enviar aviso de prueba</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableDevicePush}
              disabled={enablingPush}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
              title="Activar notificaciones push en este dispositivo"
            >
              {enablingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SmartphoneNfc className="w-3.5 h-3.5" />}
              <span>Activar en este móvil</span>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleCategories.map(cat => {
          const primaryType = cat.types[0]
          const pref = preferences[primaryType]
          if (!pref) return null

          const isLocked = !pref.canModify
          const isClubInAppOff = !pref.clubInApp
          const isClubEmailOff = !pref.clubEmail
          const isClubPushOff = !pref.clubPush

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

              <div className="flex items-center gap-2 sm:gap-3 pl-6 sm:pl-0 flex-wrap sm:flex-nowrap">
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

                {/* PUSH TOGGLE */}
                <button
                  type="button"
                  onClick={() => cat.types.forEach(t => handleToggle(t, 'push'))}
                  disabled={Boolean(updatingKey) || isLocked || isClubPushOff}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isClubPushOff
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60 line-through"
                      : isLocked
                      ? pref.effectivePush
                        ? "bg-purple-50/70 border-purple-200/70 text-purple-700 cursor-not-allowed opacity-80"
                        : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : pref.effectivePush
                      ? "bg-purple-50 border-purple-200 text-purple-700 shadow-xs hover:bg-purple-100"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                  }`}
                  title={
                    isClubPushOff
                      ? "Canal Push desactivado por política global del club"
                      : isLocked
                      ? "Preferencia fijada por la administración del club"
                      : "Activar/desactivar notificaciones push en el móvil"
                  }
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Móvil (Push)</span>
                  {pref.effectivePush && !isClubPushOff && <CheckCircle2 className="w-3 h-3 text-purple-600" />}
                  {isLocked && !isClubPushOff && <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
