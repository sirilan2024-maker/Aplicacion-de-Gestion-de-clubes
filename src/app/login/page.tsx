"use client";

import { login } from '@/lib/auth-actions';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { resetPasswordAction } from '@/app/actions/inscriptions-actions';
import toast, { Toaster } from 'react-hot-toast';

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
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
      <div className="hidden md:flex w-1/2 bg-blue-600 text-white flex-col justify-center items-start p-12 relative">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/escudo-saladar.jpg"
            alt="Escudo Sporting Saladar"
            className="w-16 h-16 object-contain rounded-full bg-white/10 p-1 border border-white/20 shadow-md"
          />
          <div>
            <h3 className="text-2xl font-black tracking-wider text-white">SPORTING SALADAR</h3>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-widest">Gestión Integral</p>
          </div>
        </div>
        <div className="text-blue-200 font-medium uppercase tracking-wider mb-2">
          BIENVENIDO A LA PLATAFORMA DEL CLUB ⚽
        </div>
        <h2 className="text-4xl font-bold mt-2">
          Gestión integral de tu equipo y miembros
        </h2>
        <p className="text-lg text-blue-100 mt-4">
          Todo lo que necesitas para la gestión deportiva, entrenamientos, convocatorias y comunicación en un solo lugar.
        </p>
        <ul className="mt-8 space-y-4">
          <li className="flex items-center">
            <span className="text-blue-200 mr-2 font-bold">✓</span>
            Gestión completa de equipos y jugadores
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2 font-bold">✓</span>
            Planificación de entrenamientos y asistencia
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2 font-bold">✓</span>
            Convocatorias y seguimiento de partidos
          </li>
          <li className="flex items-center">
            <span className="text-blue-200 mr-2 font-bold">✓</span>
            Portal para familias y jugadores
          </li>
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex w-full md:w-1/2 bg-white items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6">
          <div className="flex flex-col items-center text-center mb-4">
            <img
              src="/escudo-saladar.jpg"
              alt="Escudo Sporting Saladar"
              className="w-24 h-24 object-contain mb-3 drop-shadow-md rounded-full"
            />
            <h1 className="text-2xl font-bold text-slate-900">SPORTING SALADAR</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Acceso a la Plataforma</p>
          </div>

          {urlError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start space-x-3 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al iniciar sesión</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {urlError.includes('Invalid login credentials')
                    ? 'Credenciales incorrectas. Comprueba tu correo y contraseña.'
                    : decodeURIComponent(urlError)}
                </p>
              </div>
            </div>
          )}

          <form action={login} className="space-y-5">
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
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors"
            >
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
