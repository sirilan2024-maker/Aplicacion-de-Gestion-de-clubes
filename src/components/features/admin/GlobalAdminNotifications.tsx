"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { UserPlus } from "lucide-react"

export function GlobalAdminNotifications() {
  useEffect(() => {
    checkPendingRequests()
  }, [])

  const checkPendingRequests = async () => {
    const supabase = createClient()
    
    // Check if user is admin
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()
      
    if (profile?.role !== 'admin') return

    try {
      const { count } = await supabase
        .from('player_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      if (count && count > 0) {
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    Nuevos miembros pendientes
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Tienes {count} solicitud{count > 1 ? 'es' : ''} de familias esperando validación en el panel de Miembros.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        ), { duration: 8000, position: 'top-right' })
      }
    } catch (err) {
      console.error("Error checking pending requests:", err)
    }
  }

  return <></>
}
