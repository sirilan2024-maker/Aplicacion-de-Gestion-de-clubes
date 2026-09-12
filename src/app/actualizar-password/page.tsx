"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'Error al actualizar la contraseña. Por favor solicita un nuevo enlace.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?message=' + encodeURIComponent('Contraseña actualizada con éxito. Inicia sesión con tus nuevas credenciales.'));
        }, 2500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 text-blue-600 rounded-full mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Restablecer Contraseña</h1>
          <p className="text-sm text-slate-600 mt-1">
            Club Sporting Saladar
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">¡Contraseña Actualizada!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Tu nueva contraseña se ha guardado correctamente. Redirigiendo a la pantalla de inicio de sesión...
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-md"
              >
                Ir al Inicio de Sesión
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <span>Guardar Nueva Contraseña</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
