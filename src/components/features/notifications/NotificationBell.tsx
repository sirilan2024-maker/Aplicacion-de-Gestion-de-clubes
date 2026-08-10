"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Bell, Check, X } from "lucide-react"
import { getUnreadNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction } from "@/app/actions/notification-actions"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
    fetchUserContext()
    const interval = setInterval(fetchNotifications, 12000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    const res = await getUnreadNotificationsAction()
    if (res.success && res.data) {
      setNotifications(res.data)
    }
  }

  const fetchUserContext = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role) setUserRole(profile.role)

      // For family/tutor roles, fetch first linked player
      const isFamilyRole = ['family', 'familia', 'tutor'].includes(profile?.role || '')
      if (isFamilyRole) {
        const { data: players } = await supabase
          .from('players')
          .select('id')
          .eq('tutor_id', user.id)
          .limit(1)

        if (players && players.length > 0) {
          setLinkedPlayerId(players[0].id)
        }
      }
    } catch (e) {
      // silently fail - context is best-effort
    }
  }

  const unreadCount = notifications.length

  const getNavigationUrl = (notification: any): string => {
    const type = notification.type
    const isFamilyRole = ['family', 'familia', 'tutor'].includes(userRole)

    // Deep link based on notification type
    switch (type) {
      case 'reminder':
        // Entrenamiento/evento reminder → go to eventos page for family
        if (isFamilyRole && linkedPlayerId) {
          return `/dashboard/family/e/${linkedPlayerId}/eventos`
        }
        return '/dashboard'

      case 'partido':
      case 'convocatoria':
        // Match notification → go to partidos page for family
        if (isFamilyRole && linkedPlayerId) {
          return `/dashboard/family/e/${linkedPlayerId}/partidos`
        }
        return '/dashboard/matches'

      case 'tesoreria':
        // Treasury notification → go to family perfil (shows pending fees)
        if (isFamilyRole && linkedPlayerId) {
          return `/dashboard/family/e/${linkedPlayerId}/perfil`
        }
        return '/dashboard/treasury'

      case 'disciplina':
        return '/dashboard'

      default:
        return '/dashboard'
    }
  }

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await markNotificationAsReadAction(id)
    if (res.success) {
      // Remove from state immediately (notification is deleted from DB)
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const handleMarkAllAsRead = async () => {
    const res = await markAllNotificationsAsReadAction()
    if (res.success) {
      // Clear entire list
      setNotifications([])
      setIsOpen(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Delete the notification
    await markNotificationAsReadAction(notification.id)
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setIsOpen(false)

    // Navigate to the right place
    const url = getNavigationUrl(notification)
    router.push(url)
  }

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="relative p-2 transition-transform hover:scale-105 rounded-full hover:bg-slate-100 flex items-center justify-center"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
          <div className="fixed right-4 sm:right-6 top-16 w-[320px] sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 text-left origin-top-right">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Check size={14} /> Borrar todas
                </button>
              )}
            </div>
            
            <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm space-y-1">
                  <p className="font-bold text-slate-700">Sin notificaciones</p>
                  <p className="text-xs text-slate-400">No tienes notificaciones pendientes.</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors relative group bg-indigo-50/50"
                  >
                    <div className="pr-6">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block"></span>
                        <p className="text-xs font-black text-indigo-950">
                          {notif.title}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{notif.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        📅 {new Date(notif.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button 
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="absolute right-3 top-3.5 p-1 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Descartar notificación"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
