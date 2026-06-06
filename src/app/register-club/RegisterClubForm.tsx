"use client"

import { useState, useTransition } from "react"
import { registerNewClub } from "@/lib/club-actions"
import type { RegisterClubResult } from "@/lib/club-actions"
import {
  MailCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react"
import Link from "next/link"

const SPORTS = ["Fútbol", "Baloncesto", "Balonmano", "Voleibol", "Hockey", "Rugby", "Atletismo", "Natación", "Tenis", "Otro"]
const COUNTRIES = ["España", "México", "Argentina", "Colombia", "Chile", "Perú", "Uruguay", "Venezuela", "Ecuador", "Bolivia", "Otro"]

export function RegisterClubForm() {
  const [pending,      startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [result,       setResult]       = useState<RegisterClubResult | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await registerNewClub(fd)
      setResult(res)
    })
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="text-center py-4 px-2">
        <div className="w-16 h-16 rounded-full bg-emerald-50 ring-4 ring-emerald-100 flex items-center justify-center mx-auto mb-5">
          <MailCheck size={28} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Club creado!</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
          Hemos enviado un enlace de verificación a tu correo. Activa tu cuenta
          para acceder al panel de administración de tu club.
        </p>
        <div className="mt-5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 leading-relaxed text-left">
          <strong>Siguiente paso:</strong> Una vez verificado el email, entra al panel,
          crea tus equipos y comparte el enlace de invitación con tus entrenadores y familias.
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Ir al login →
        </Link>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {result && !result.success && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {result.error}
        </div>
      )}

      {/* ── Sección: Datos del Club ── */}
      <div className="pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Datos del Club
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="nombre_club" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del Club <span className="text-red-400">*</span>
            </label>
            <input
              id="nombre_club" name="nombre_club" type="text" required
              placeholder="Ej. Sporting Saladar CF"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="deporte" className="block text-sm font-medium text-gray-700 mb-1.5">
                Deporte
              </label>
              <select
                id="deporte" name="deporte"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100 appearance-none"
              >
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-1.5">
                País
              </label>
              <select
                id="pais" name="pais"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100 appearance-none"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Administrador ── */}
      <div className="pt-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Tu cuenta de Administrador
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                id="first_name" name="first_name" type="text" required
                autoComplete="given-name" placeholder="Carlos"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Apellidos <span className="text-red-400">*</span>
              </label>
              <input
                id="last_name" name="last_name" type="text" required
                autoComplete="family-name" placeholder="García"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email" name="email" type="email" required
              autoComplete="email" placeholder="admin@tuclub.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPassword ? "text" : "password"}
                required minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-3 focus:ring-blue-100"
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit" disabled={pending}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-3 focus:ring-blue-300 transition-all"
      >
        {pending
          ? <><Loader2 size={16} className="animate-spin" /> Creando tu club…</>
          : <><Building2 size={16} /> Crear mi club</>
        }
      </button>
    </form>
  )
}
