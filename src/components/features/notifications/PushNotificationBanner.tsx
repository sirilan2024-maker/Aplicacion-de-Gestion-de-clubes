'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Smartphone, Share, PlusSquare, CheckCircle2, X, Loader2, Send, AlertTriangle } from 'lucide-react'
import {
  isPushSupported,
  getPushPermissionState,
  getCurrentPushSubscription,
  subscribeToPush,
  syncPushSubscriptionToServer,
} from '@/lib/push-client'
import toast from 'react-hot-toast'

export function PushNotificationBanner() {
  const [mounted, setMounted] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setMounted(true)

    const supported = isPushSupported()
    setIsSupported(supported)

    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent || ''
      const isApple =
        /iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
      setIsIos(isApple)

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsStandalone(standalone)

      if (supported) {
        const state = getPushPermissionState()
        setPermission(state)
        getCurrentPushSubscription().then((sub) => {
          setIsSubscribed(Boolean(sub))
          if (sub && state === 'granted') {
            syncPushSubscriptionToServer(sub).catch(() => {})
          }
        })
      }
    }
  }, [])

  if (!mounted || dismissed) return null

  // Si ya está suscrito y con permiso concedido, no mostrar el banner grande de aviso
  if (isSubscribed && permission === 'granted') {
    return null
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const res = await subscribeToPush()
      if (res.success && res.subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        toast.success('¡Notificaciones activadas en este dispositivo!')
      } else {
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setPermission('denied')
        }
        toast.error(res.error || 'No se pudieron activar las notificaciones.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al suscribir.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setTesting(true)
    try {
      // 1. Sincronizar suscripción actual con el usuario de la sesión
      await syncPushSubscriptionToServer()

      let res = await fetch('/api/push/test', { method: 'POST' })
      let data = await res.json()

      // 2. Si el servidor dice que no hay suscripciones, intentar activar/re-vincular automáticamente
      if (!res.ok && res.status === 400) {
        const subRes = await subscribeToPush()
        if (subRes.success) {
          setIsSubscribed(true)
          setPermission('granted')
          res = await fetch('/api/push/test', { method: 'POST' })
          data = await res.json()
        }
      }

      if (res.ok && data.success) {
        toast.success('¡Notificación enviada! Comprueba tu barra de notificaciones.', {
          icon: '📲',
          duration: 5000,
        })
      } else {
        toast.error(data.error || 'No se pudo enviar la notificación de prueba.')
      }
    } catch {
      toast.error('Error de red al enviar la prueba.')
    } finally {
      setTesting(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // CASO 1: Notificaciones bloqueadas en el navegador
  if (permission === 'denied') {
    return (
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-4 sm:p-5 shadow-sm">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-semibold text-foreground">
              Notificaciones bloqueadas en este navegador
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Has denegado el permiso anteriormente. Para recibir avisos en este móvil, toca el icono del candado o ajustes junto a la barra de direcciones de tu navegador y cambia <strong>Notificaciones</strong> a <strong>Permitir</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CASO 2: Dispositivo iOS y NO está instalado en la Pantalla de Inicio
  // (Apple requiere obligatoriamente que esté añadida a inicio para Web Push)
  if (isIos && !isStandalone) {
    return (
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-sm">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
            <Smartphone className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                Avisos en tu iPhone
              </span>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                Instala la app para recibir avisos sin abrir la web
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Para recibir convocatorias, horarios de partidos y avisos del entrenador con la pantalla apagada en tu iPhone:
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-foreground/90 font-medium">
              <span className="flex items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1.5 border border-border shadow-xs">
                1. Pulsa <Share className="h-3.5 w-3.5 text-blue-500 inline" /> Compartir en Safari
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1.5 border border-border shadow-xs">
                2. Pulsa <PlusSquare className="h-3.5 w-3.5 text-primary inline" /> Añadir a pantalla de inicio
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1.5 border border-border shadow-xs">
                3. Abre la app desde tu pantalla de inicio y pulsa Activar
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CASO 3: Android, PWA instalada, o Navegador compatible
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Bell className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                Activa las notificaciones en tu móvil
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Recomendado
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Recibe avisos inmediatos de partidos, convocatorias, cambios de hora y eventos sin tener la web abierta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Activar en este móvil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
