"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerWithInviteCode } from '@/lib/auth-actions';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function InviteRegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'familia' | 'jugador' | 'entrenador'>('familia');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('role', role);

    try {
      const res = await registerWithInviteCode(formData);
      if (res.success) {
        setSuccessMsg("¡Registro completado con éxito! Redirigiendo al inicio de sesión...");
        toast.success("Cuenta creada correctamente");
        setTimeout(() => {
          router.push('/login?message=Registro exitoso. Inicia sesión con tu correo y contraseña.');
        }, 1500);
      } else {
        setErrorMsg(res.error || "Ocurrió un error durante el registro.");
        toast.error(res.error || "Error al registrarse");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al conectar con el servidor.");
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header con Escudo */}
        <div className="bg-slate-900 px-6 py-6 text-center relative border-b border-white/10">
          <img
            src="/escudo-saladar.jpg"
            alt="Escudo Sporting Saladar"
            className="w-20 h-20 object-contain mx-auto mb-2 drop-shadow-md rounded-full bg-white/10 p-1 border border-white/20"
          />
          <h1 className="text-xl font-black text-white tracking-wide">SPORTING SALADAR</h1>
          <p className="text-xs text-blue-200 font-medium">Registro con Código de Invitación o PIN</p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipo de cuenta
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('familia')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'familia'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Familia / Tutor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('jugador')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'jugador'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Jugador
                </button>
                <button
                  type="button"
                  onClick={() => setRole('entrenador')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    role === 'entrenador'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Entrenador
                </button>
              </div>
            </div>

            {/* Código del equipo */}
            <div>
              <label htmlFor="invite_code" className="block text-xs font-semibold text-slate-700 mb-1">
                Código de invitación del equipo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="invite_code"
                  name="invite_code"
                  type="text"
                  required
                  placeholder="Ej: TEAM123 o código alfanumérico"
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 uppercase font-mono px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* PIN de vinculación opcional para familias */}
            {role === 'familia' && (
              <div>
                <label htmlFor="pin_code" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>PIN de jugador (opcional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Si el club te facilitó un PIN</span>
                </label>
                <div className="relative">
                  <input
                    id="pin_code"
                    name="pin_code"
                    type="text"
                    placeholder="Ej: A8F2K9"
                    className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 uppercase font-mono px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input type="hidden" name="registration_type" value="pin" />
                </div>
              </div>
            )}

            {/* Nombre y Apellidos */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first_name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <span>Completar registro</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
