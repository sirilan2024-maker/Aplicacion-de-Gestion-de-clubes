"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { acceptGdprAction } from "@/app/actions/player-actions"
import { Shield, CheckCircle, Loader2 } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function RgpdPendientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<any[]>([])
  const [clubName, setClubName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [allAccepted, setAllAccepted] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id, role, clubs(name)")
        .eq("id", user.id)
        .single()

      if (!profile) { router.push("/login"); return }

      // Solo familias necesitan firmar
      if (profile.role !== "family") {
        router.push("/dashboard")
        return
      }

      setClubName((profile as any).clubs?.name || "el Club")

      // Buscar jugadores vinculados sin consentimiento
      const { data: pendingPlayers } = await supabase
        .from("players")
        .select("id, first_name, last_name, gdpr_consent")
        .eq("tutor_id", user.id)
        .eq("gdpr_consent", false)

      if (!pendingPlayers || pendingPlayers.length === 0) {
        router.push("/dashboard")
        return
      }

      setPlayers(pendingPlayers)
      setLoading(false)
    }
    check()
  }, [router])

  const handleAcceptAll = async () => {
    setSubmitting(true)
    try {
      for (const player of players) {
        const result = await acceptGdprAction({ playerId: player.id })
        if (!result.success) {
          toast.error(`Error con ${player.first_name}: ${result.error}`)
          setSubmitting(false)
          return
        }
      }
      setAllAccepted(true)
      toast.success("¡Consentimiento registrado para todos los jugadores!")
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch (err: any) {
      toast.error("Error al registrar el consentimiento")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (allAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Toaster />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo!</h1>
          <p className="text-gray-500">Redirigiendo al panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Firma Pendiente</h1>
          <p className="text-amber-100 mt-1">Debes aceptar la Política de Privacidad para continuar</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              Para poder acceder a la aplicación de <strong>{clubName}</strong>, necesitas aceptar la Política de Protección de Datos de los siguientes jugadores:
            </p>
          </div>

          {/* Lista de jugadores pendientes */}
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                  {p.first_name?.[0]}{p.last_name?.[0]}
                </div>
                <span className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</span>
              </div>
            ))}
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
            <h3 className="text-gray-900 text-base font-bold">Política de Privacidad</h3>
            <p>En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), le informamos que sus datos serán tratados para la gestión deportiva, comunicaciones del club, licencias federativas y difusión de imágenes en canales oficiales.</p>
            <p>Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición contactando con el club.</p>
          </div>

          <button
            onClick={handleAcceptAll}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {submitting ? "Registrando..." : "✅ Acepto la Política de Privacidad"}
          </button>
        </div>
      </div>
    </div>
  )
}
