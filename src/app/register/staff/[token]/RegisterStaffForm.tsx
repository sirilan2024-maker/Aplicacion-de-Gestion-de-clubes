"use client"

import { useState } from "react"
import { registerInvitedStaffAction, acceptStaffInviteExistingUserAction } from "@/lib/auth-actions"
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function RegisterStaffForm({ token, role }: { token: string, role: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // State for existing users
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [existingEmail, setExistingEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    
    if (isExistingUser) {
      // Flow for existing user: login and accept invite
      const res = await acceptStaffInviteExistingUserAction(token, formData)
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || "Contraseña incorrecta o error al vincular.")
      }
    } else {
      // Flow for new user
      const res = await registerInvitedStaffAction(token, formData)
      
      if (res.success) {
        setSuccess(true)
      } else if (res.existingUser) {
        // User exists!
        setIsExistingUser(true)
        setExistingEmail(email)
        setError(res.error || "Esta cuenta ya existe. Por favor, inicia sesión.")
      } else {
        setError(res.error || "Error inesperado al registrarse.")
      }
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
          Ya puedes iniciar sesión con tu email y contraseña.
        </p>
        <a 
          href="/login" 
          className="inline-block w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-center"
        >
          Ir a Iniciar Sesión
        </a>
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
        {!isExistingUser ? (
          <>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Crear Contraseña</label>
              <div className="relative">
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  minLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres.</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium mb-1">
                Vincular equipo a cuenta existente
              </p>
              <p className="text-xs text-blue-600">
                Introduce tu contraseña para aceptar la invitación con esta cuenta.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input 
                name="email" 
                type="email" 
                required 
                readOnly
                value={existingEmail}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Procesando..." : isExistingUser ? "Iniciar Sesión y Aceptar" : "Completar Registro"}
          </button>
        </div>
      </form>
    </div>
  )
}
