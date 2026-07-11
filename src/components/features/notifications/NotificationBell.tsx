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
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
    // Optional: Set up real-time subscription here later if needed
  }, [])

  const fetchNotifications = async () => {
    const res = await getUnreadNotificationsAction()
    if (res.success && res.data) {
      setNotifications(res.data)
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
    
    // Navigate based on type
    if (notification.type === 'disciplina') {
      router.push('/dashboard/mensajes') // Go to chat to see the alert
    }
  }

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 transition-transform hover:scale-105 rounded-full hover:bg-white/10"
      >
        {/* Tarjeta amarilla */}
        <div className="w-[18px] h-[24px] bg-[#fcd34d] rounded-[3px] border border-[#d97706] shadow-sm flex items-center justify-center">
          <div className="w-[6px] h-[6px] rounded-full bg-white/40"></div>
        </div>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full animate-pulse border-2 border-slate-900"></span>
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
                          {new Date(notif.created_at).toLocaleDateString()}
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
