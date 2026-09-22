"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updatePasswordServerAction } from '@/lib/auth-actions';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function ActualizarPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Estados de verificación de sesión
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function initSession() {
      // 1. Comprobar si hay error en los parámetros de la URL
      const urlError = searchParams.get('error') || searchParams.get('error_description');
      if (urlError) {
        if (isMounted) {
          setErrorMessage(decodeURIComponent(urlError));
          setCheckingSession(false);
          setIsSessionValid(false);
        }
        return;
      }

      // 2. Comprobar si Supabase pasó el código en la query (?code=...)
      const code = searchParams.get('code');
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            if (isMounted) {
              setIsSessionValid(true);
              setCheckingSession(false);
            }
            return;
          }
        } catch (err) {
          console.warn('[ActualizarPassword] Error intercambiando código:', err);
        }
      }

      // 3. Comprobar si Supabase devolvió tokens en el hash fragment (#access_token=...)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const hashError = params.get('error_description') || params.get('error');
        if (hashError) {
          if (isMounted) {
            setErrorMessage(decodeURIComponent(hashError));
            setCheckingSession(false);
            setIsSessionValid(false);
          }
          return;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (!error && data?.session) {
              if (isMounted) {
                setIsSessionValid(true);
                setCheckingSession(false);
              }
              return;
            }
          } catch (err) {
            console.warn('[ActualizarPassword] Error estableciendo sesión desde hash:', err);
          }
        }
      }

      // 4. Comprobar si ya existe una sesión activa (ej. cookies establecidas por /auth/callback)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setIsSessionValid(true);
            setCheckingSession(false);
          }
          return;
        }
      } catch (err) {
        console.warn('[ActualizarPassword] Error comprobando sesión existente:', err);
      }

      // 5. Esperar brevemente por si onAuthStateChange se dispara (PASSWORD_RECOVERY)
      const timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsSessionValid(true);
        } else {
          setIsSessionValid(false);
        }
        setCheckingSession(false);
      }, 1200);

      return () => clearTimeout(timeoutId);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) {
          setIsSessionValid(true);
          setCheckingSession(false);
        }
      }
    });

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

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
      
      // Intento 1: Actualizar contraseña usando el cliente de navegador
      const { error: clientError } = await supabase.auth.updateUser({
        password: password,
      });

      if (!clientError) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?message=' + encodeURIComponent('Contraseña actualizada con éxito. Inicia sesión con tus nuevas credenciales.'));
        }, 2500);
        return;
      }

      console.warn('[ActualizarPassword] Fallo cliente, probando acción de servidor:', clientError.message);

      // Intento 2 (Fallback): Actualizar contraseña usando Server Action (lee cookies de sesión del servidor)
      const serverRes = await updatePasswordServerAction(password);
      if (serverRes.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?message=' + encodeURIComponent('Contraseña actualizada con éxito. Inicia sesión con tus nuevas credenciales.'));
        }, 2500);
      } else {
        setErrorMessage(serverRes.error || clientError.message || 'Error al actualizar la contraseña. Por favor solicita un nuevo enlace.');
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

        {checkingSession ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Verificando enlace de recuperación...</p>
          </div>
        ) : !isSessionValid ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">Enlace no válido o expirado</h3>
              <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                {errorMessage || 'El enlace para restablecer tu contraseña ha caducado o ya ha sido utilizado. Por favor, solicita uno nuevo desde el inicio de sesión.'}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-md"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          </div>
        ) : success ? (
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
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

export default function ActualizarPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ActualizarPasswordForm />
    </Suspense>
  );
}
