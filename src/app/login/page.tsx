"use client";

import { login } from '@/lib/auth-actions';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { resetPasswordAction } from '@/app/actions/inscriptions-actions';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState({ text: "", type: "" });

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setResetMessage({ text: "", type: "" });
    if (!emailValue) {
      setResetMessage({ text: "Introduce tu correo arriba para recuperar la contraseña.", type: "error" });
      return;
    }
    
    setIsResetting(true);
    const res = await resetPasswordAction(emailValue);
    if (res.success) {
      setResetMessage({ text: "Te hemos enviado un enlace. Revisa tu correo.", type: "success" });
    } else {
      setResetMessage({ text: "Error al enviar. Comprueba el correo o contacta con el club.", type: "error" });
    }
    setIsResetting(false);
  };

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
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <Link href="#" onClick={handleForgotPassword} className="text-xs font-medium text-blue-600 hover:text-blue-500">
                  {isResetting ? 'Enviando...' : '¿Has olvidado la contraseña?'}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {resetMessage.text && (
                <p className={`text-xs mt-2 font-medium ${resetMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {resetMessage.text}
                </p>
              )}
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
