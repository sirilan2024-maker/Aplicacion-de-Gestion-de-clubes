"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, User, PlusCircle } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function FamilyPage() {
  const router = useRouter()
  const [loadingData, setLoadingData] = useState(true)
  const [childrenData, setChildrenData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData.user) {
        router.replace("/dashboard")
        return
      }

      try {
        // Fetch linked children info
        const { data: childrenLinks } = await supabase
          .from("player_tutors")
          .select('player_id')
          .eq("tutor_id", authData.user.id)

        if (!childrenLinks || childrenLinks.length === 0) {
          setLoadingData(false)
          return
        }

        const playerIds = childrenLinks.map(c => c.player_id)
        
        // Fetch detailed player info
        const { data: playersInfo } = await supabase
          .from("players")
          .select(`
            id, first_name, last_name, avatar_url, dorsal, posicion,
            teams (id, name)
          `)
          .in("id", playerIds)
          .neq("status", "inactive")

        if (playersInfo && playersInfo.length > 0) {
          router.replace(`/dashboard/family/e/${playersInfo[0].id}/perfil`)
          return
        }
      } catch (err) {
        console.error("Error fetching family data", err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [router])

  if (loadingData) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  // Si no tiene hijos, le mostramos la vista vacía
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" />
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Área Personal</h1>
          <p className="text-gray-500 mt-2">Resumen de la actividad de tus jugadores vinculados.</p>
        </div>
        <button 
          onClick={() => {
            toast('Para añadir a otro hijo, pídele al coordinador del club que te envíe una Invitación a tu correo electrónico.', {
              icon: 'ℹ️',
              duration: 5000,
            });
          }}
          className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <PlusCircle size={18} />
          Añadir Jugador
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-center py-12">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No tienes jugadores vinculados</h3>
        <p className="text-gray-500 mb-6">Pide al coordinador que te envíe una invitación por email.</p>
      </div>
    </div>
  )
}
