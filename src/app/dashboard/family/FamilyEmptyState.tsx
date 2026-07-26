"use client"

import { User, PlusCircle } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

  import { useRouter } from "next/navigation"

  export function FamilyEmptyState() {
    const router = useRouter()
    
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Toaster position="top-right" />
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Área Personal</h1>
            <p className="text-gray-500 mt-2">Resumen de la actividad de tus jugadores vinculados.</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard/family/nuevo-jugador')}
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
