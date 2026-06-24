"use client"

import { useState, useTransition } from "react"
import { registerWithInviteCode } from "@/lib/auth-actions"
import type { RegisterWithInviteResult } from "@/lib/auth-actions"
import {
  MailCheck,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Users,
  User,
  AlertCircle,
} from "lucide-react"

interface Props {
  inviteCode: string
  teamName:   string
}

export function RegisterForm({ inviteCode, teamName }: Props) {
  const [pending,        startTransition]  = useTransition()
  const [showPassword,   setShowPassword]  = useState(false)
  const [result,         setResult]        = useState<RegisterWithInviteResult | null>(null)
  const [selectedRole,   setSelectedRole]  = useState<"jugador" | "tutor" | "">("")

  // ── Submit ───────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("invite_code", inviteCode)
    fd.set("role", selectedRole)

    startTransition(async () => {
      const res = await registerWithInviteCode(fd)
      setResult(res)
    })
  }

  // ── Success State ────────────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="text-center px-2 py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5 ring-4 ring-emerald-100">
          <MailCheck size={30} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Casi listo!</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
          Te hemos enviado un enlace de verificación a tu correo. Por favor, revisa tu bandeja
          de entrada (o la carpeta de spam) para activar tu cuenta y acceder al equipo.
        </p>
        <div className="mt-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 leading-relaxed">
          <strong>Tip:</strong> El enlace caduca en 24 horas. Si no lo recibes, revisa el spam.
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Error global */}
      {result && !result.success && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {/* Nombre + Apellidos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="first_name" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Nombre
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            placeholder="Carlos"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Apellidos
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            placeholder="García López"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
        />
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="password" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Selector de Rol */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          ¿Cuál es tu rol?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* Jugador */}
          <button
            type="button"
            onClick={() => setSelectedRole("jugador")}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 text-xs font-semibold transition-all text-slate-900 bg-white ${
              selectedRole === "jugador"
                ? "border-blue-600 ring-2 ring-blue-100"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <User size={20} className={selectedRole === "jugador" ? "text-blue-600" : "text-slate-400"} />
            <span>Soy Jugador</span>
          </button>

          {/* Familia */}
          <button
            type="button"
            onClick={() => setSelectedRole("tutor")}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 text-xs font-semibold transition-all text-slate-900 bg-white ${
              selectedRole === "tutor"
                ? "border-blue-600 ring-2 ring-blue-100"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <Users size={20} className={selectedRole === "tutor" ? "text-blue-600" : "text-slate-400"} />
            <span>Soy Familiar/Tutor</span>
          </button>
        </div>
        {!selectedRole && result && !result.success && (
          <p className="mt-1.5 text-xs text-red-500">Selecciona un rol para continuar.</p>
        )}
      </div>

      {/* Checkbox LOPDGDD */}
      <div className="flex items-start gap-2.5 mt-4">
        <input
          id="lopd"
          name="lopd"
          type="checkbox"
          required
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="lopd" className="text-xs text-gray-600 leading-relaxed">
          Declaro que soy <strong>mayor de 14 años</strong> o actúo como <strong>tutor legal</strong> del menor, y consiento el tratamiento de mis datos y los del menor para la gestión deportiva del club según la LOPDGDD.
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending || !selectedRole}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-3 focus:ring-blue-300 transition-all mt-1"
      >
        {pending
          ? <><Loader2 size={16} className="animate-spin" /> Creando cuenta…</>
          : "Unirme al equipo"
        }
      </button>
    </form>
  )
}
