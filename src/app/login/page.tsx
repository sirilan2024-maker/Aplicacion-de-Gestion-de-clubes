import { login } from '@/lib/auth-actions';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left information panel */}
      <div className="hidden md:flex w-1/2 bg-blue-600 text-white flex-col justify-center items-start p-12">
        <div className="text-blue-200 font-medium uppercase tracking-wider mb-2">
          LLEVA A TU CLUB AL SIGUIENTE NIVEL 🚀
        </div>
        <h2 className="text-4xl font-bold mt-4">
          Gestiona tu club deportivo como un profesional
        </h2>
        <p className="text-lg text-blue-100 mt-4">
          Todo lo que necesitas para administrar tu club en una sola plataforma. Sin complicaciones.
        </p>
        <ul className="mt-8 space-y-4">
          <li className="flex items-center">
            <span className="text-blue-200 mr-2">✓</span>
            Gestión completa de equipos y jugadores
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2">✓</span>
            Planificación de entrenamientos y asistencia
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2">✓</span>
            Convocatorias y seguimiento de partidos
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2">✓</span>
            Onboarding por invitación para familias
          </li>
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex w-full md:w-1/2 bg-white items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <h1 className="text-3xl font-semibold text-slate-900 text-center mb-6">Iniciar sesión</h1>
          <form action={login} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow-md transition-colors"
            >
              Entrar
            </button>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">
                ¿Eres nuevo?{' '}
                <Link href="/register-club" className="text-blue-600 hover:underline font-medium">
                  Añadir mi Club
                </Link>
              </p>
              <p className="text-sm text-slate-600">
                ¿Eres jugador o familiar?{' '}
                <Link href="/invite" className="text-blue-600 hover:underline font-medium">
                  Entrar con código de invitación
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
