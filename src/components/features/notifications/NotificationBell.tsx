"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Bell, Check, X } from "lucide-react"
import { getUnreadNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction } from "@/app/actions/notification-actions"
import { useRouter } from "next/navigation"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    const res = await getUnreadNotificationsAction()
    if (res.success && res.data) {
      setNotifications(res.data)
      const hasUnreadNotifs = res.data.length > 0;
      setHasUnread(hasUnreadNotifs)
      
      if (hasUnreadNotifs) {
        // Automatically pop open the bell or show a toast on first load if there are unread notifications
        setTimeout(() => {
          setIsOpen(true);
        }, 500);
      }
    }
  }

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await markNotificationAsReadAction(id)
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const handleMarkAllAsRead = async () => {
    const res = await markAllNotificationsAsReadAction()
    if (res.success) {
      setNotifications([])
      setIsOpen(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markNotificationAsReadAction(notification.id)
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setIsOpen(false)
    
    // Navigate based on type or link
    if (notification.link) {
      router.push(notification.link)
    } else if (notification.type === 'disciplina') {
      router.push('/dashboard/mensajes') // Go to chat to see the alert
    }
  }

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen && hasUnread) {
            setHasUnread(false);
            await markAllNotificationsAsReadAction();
          }
        }}
        className="relative p-2 transition-transform hover:scale-105 rounded-full hover:bg-slate-100 flex items-center justify-center"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white"></span>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
          <div className="fixed right-4 sm:right-6 top-16 w-[300px] sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 text-left origin-top-right">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">Notificaciones</h3>
              {notifications.length > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Check size={14} /> Marcar todo
                </button>
              )}
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No tienes notificaciones nuevas.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition-colors relative group"
                    >
                      <div className="pr-6">
                        <p className="text-xs font-bold text-slate-900 mb-0.5">{notif.title}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{notif.content}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(notif.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="absolute right-3 top-3 p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Marcar como leída"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
