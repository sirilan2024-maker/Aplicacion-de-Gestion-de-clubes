import { Metadata } from "next"
import Link from "next/link"
import { Shield, CheckCircle } from "lucide-react"
import { RegisterClubForm } from "./RegisterClubForm"

export const metadata: Metadata = {
  title: "Registra tu Club · ClubManager",
  description: "Crea tu club deportivo y empieza a gestionar tus equipos en minutos.",
}

const FEATURES = [
  "Gestión completa de equipos y jugadores",
  "Planificación de entrenamientos y asistencia",
  "Convocatorias y seguimiento de partidos",
  "Onboarding por invitación para familias",
]

export default function RegisterClubPage() {
  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Left panel: branding + features (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[420px] bg-blue-600 flex-col justify-between p-10 shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">ClubManager</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Gestiona tu club deportivo como un profesional
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-8">
            Todo lo que necesitas para administrar tu club en una sola plataforma.
            Sin complicaciones.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-blue-100">
                <CheckCircle size={17} className="text-blue-300 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-blue-300">
          © {new Date().getFullYear()} ClubManager · Todos los derechos reservados
        </p>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-7 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">ClubManager</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Crea tu club</h1>
            <p className="text-sm text-gray-500 mt-1">
              Empieza en menos de 2 minutos. Sin tarjeta de crédito.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-7 py-7">
            <RegisterClubForm />
          </div>

          {/* Footer links */}
          <p className="mt-5 text-center text-sm text-gray-400">
            ¿Ya tienes un club?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Iniciar sesión
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-400">
            ¿Te han invitado a un equipo?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Regístrate con código
            </Link>
          </p>
        </div>
      </div>

    </div>
  )
}
