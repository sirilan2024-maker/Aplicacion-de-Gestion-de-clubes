"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export function PendingRequestsReview() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchPending = async () => {
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, club_id')
        .eq('id', authData.user.id)
        .single()
        
      if (!['admin', 'secretaria'].includes(profile?.role || '')) return

      const { count: pendingCount } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', profile?.club_id)
        .eq('registration_status', 'pending_revision')
      
      setCount(pendingCount || 0)
    }
    fetchPending()
  }, [])

  if (count === 0) return null

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-amber-800">Tienes {count} inscripción{count !== 1 ? 'es' : ''} pendiente{count !== 1 ? 's' : ''} de revisión</h3>
          <p className="text-sm text-amber-700">Revisa la documentación y aprueba o rechaza desde el panel de Secretaría.</p>
        </div>
      </div>
      <Link href="/dashboard/inscripciones" className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors">
        Ir a Secretaría <ArrowRight size={16} />
      </Link>
    </div>
  )
}
