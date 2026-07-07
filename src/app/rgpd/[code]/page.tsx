"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { acceptGdprAction, getPlayerByLinkCodeAction } from "@/app/actions/player-actions"
import { Shield, CheckCircle, Loader2 } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

export default function RgpdPublicPage() {
  const params = useParams()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState("")
  const [clubName, setClubName] = useState("")
  const [alreadyAccepted, setAlreadyAccepted] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchPlayer() {
      const result = await getPlayerByLinkCodeAction(code)

      if (!result.success || !result.data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const player = result.data

      setPlayerName(`${player.first_name} ${player.last_name}`)
      setClubName((player as any).clubs?.name || "el Club")
      if (player.gdpr_consent) {
        setAlreadyAccepted(true)
      }
      setLoading(false)
    }
    fetchPlayer()
  }, [code])

  const handleAccept = async () => {
    setSubmitting(true)
    const result = await acceptGdprAction({ linkCode: code })
    if (result.success) {
      setAccepted(true)
      toast.success("¡Consentimiento registrado correctamente!")
    } else {
      toast.error(result.error || "Error al registrar el consentimiento")
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

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-gray-500">Este enlace de consentimiento no existe o ha caducado. Contacta con el club para solicitar uno nuevo.</p>
        </div>
      </div>
    )
  }

  if (alreadyAccepted || accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Toaster />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Consentimiento Registrado</h1>
          <p className="text-gray-500">
            La Política de Privacidad para <strong>{playerName}</strong> ya ha sido aceptada. Puedes cerrar esta página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Protección de Datos</h1>
          <p className="text-blue-100 mt-1">Consentimiento para el tratamiento de datos personales</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>{clubName}</strong> necesita tu consentimiento para tratar los datos personales de <strong>{playerName}</strong> conforme al Reglamento General de Protección de Datos (RGPD).
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
            <h3 className="text-gray-900 text-base font-bold">Política de Privacidad</h3>
            <p>En cumplimiento del Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de 27 de abril de 2016 (RGPD), y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le informamos de lo siguiente:</p>
            
            <h4 className="text-gray-800 text-sm font-semibold mt-4">1. Responsable del Tratamiento</h4>
            <p>{clubName}. Puede contactarnos a través de los canales oficiales del club.</p>

            <h4 className="text-gray-800 text-sm font-semibold mt-4">2. Finalidad del Tratamiento</h4>
            <p>Los datos personales recogidos serán utilizados exclusivamente para:</p>
            <ul>
              <li>Gestión administrativa de la inscripción del jugador/a.</li>
              <li>Comunicaciones relacionadas con la actividad deportiva (entrenamientos, partidos, eventos).</li>
              <li>Gestión de licencias federativas.</li>
              <li>Difusión de imágenes y resultados deportivos en los canales oficiales del club.</li>
            </ul>

            <h4 className="text-gray-800 text-sm font-semibold mt-4">3. Legitimación</h4>
            <p>La base legal para el tratamiento de sus datos es el consentimiento del interesado o su representante legal.</p>

            <h4 className="text-gray-800 text-sm font-semibold mt-4">4. Conservación de los Datos</h4>
            <p>Los datos se conservarán mientras dure la relación deportiva y durante los plazos legalmente establecidos.</p>

            <h4 className="text-gray-800 text-sm font-semibold mt-4">5. Derechos</h4>
            <p>Puede ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición contactando con el club.</p>
          </div>

          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {submitting ? "Registrando..." : "✅ Acepto la Política de Privacidad"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Al pulsar "Acepto", confirmas que has leído y aceptas la Política de Privacidad de {clubName} para el tratamiento de los datos de {playerName}.
          </p>
        </div>
      </div>
    </div>
  )
}
