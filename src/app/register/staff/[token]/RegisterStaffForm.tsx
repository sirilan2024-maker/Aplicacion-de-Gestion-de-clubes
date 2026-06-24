"use client"

import { useState } from "react"
import { registerInvitedStaffAction } from "@/lib/auth-actions"
import { Shield, Loader2, AlertCircle } from "lucide-react"

export default function RegisterStaffForm({ token, role }: { token: string, role: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    
    const res = await registerInvitedStaffAction(token, formData)
    
    if (res.success) {
      setSuccess(true)
    } else {
      setError(res.error || "Error inesperado al registrarse.")
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Registro Completado!</h2>
        <p className="text-gray-600">
          Tu cuenta de <strong>{role}</strong> ha sido creada correctamente.
        </p>
        <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
          Te hemos enviado un correo de confirmación. Por favor, revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta antes de iniciar sesión.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Configura tu cuenta</h2>
        <p className="text-gray-500 mt-2">
          Has sido invitado como <strong className="text-blue-600 capitalize">{role}</strong>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input 
              name="first_name" 
              type="text" 
              required 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
            <input 
              name="last_name" 
              type="text" 
              required 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
          <input 
            name="email" 
            type="email" 
            required 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input 
            name="password" 
            type="password" 
            required 
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres.</p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Creando cuenta..." : "Completar Registro"}
          </button>
        </div>
      </form>
    </div>
  )
}
