import { registerWithInviteCode } from '@/lib/auth-actions';
import Link from 'next/link';

export default function InviteRegisterPage() {
  async function handleRegister(formData: FormData) {
    "use server";
    await registerWithInviteCode(formData);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Registro con código de invitación</h1>
        <form action={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="invite_code" className="block text-sm font-medium text-gray-700 mb-1">
              Código de invitación
            </label>
            <input
              id="invite_code"
              name="invite_code"
              type="text"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Apellidos
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              id="role"
              name="role"
              required
              className="w-full rounded-md border border-gray-300 bg-white text-slate-900 placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="entrenador">Entrenador</option>
              <option value="jugador">Jugador</option>
              <option value="familia">Familia</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Registrarse
          </button>
        </form>
        <div className="text-center mt-4">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
