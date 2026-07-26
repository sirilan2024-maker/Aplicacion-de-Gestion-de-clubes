"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MailWarning, MailCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function EmailVerificationGuard() {
  const [status, setStatus] = useState<"loading" | "verified" | "unverified" | "blocked">("loading");
  const [sending, setSending] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function checkVerification() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus("verified"); // No user, ignore guard
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin" || profile?.role === "coordinador") {
        setStatus("verified");
        return;
      }

      if (user?.email_confirmed_at) {
        setStatus("verified");
        return;
      }

      // Check account age
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        setStatus("blocked");
      } else {
        setStatus("unverified");
      }
    }

    checkVerification();
  }, [pathname]);

  const handleResend = async () => {
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user?.email) {
      // Usamos el Magic Link nativo de Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?verify=true`
        }
      });
      
      if (error) {
        toast.error("Error al enviar el correo: " + error.message);
      } else {
        toast.success("Correo enviado. Revisa tu bandeja de entrada o spam.");
      }
    }
    setSending(false);
  };

  if (status === "loading" || status === "verified") return null;

  if (status === "blocked") {
    // Pantalla de bloqueo total
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-red-50 p-8 rounded-3xl border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <MailWarning size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-red-900 mb-2">Cuenta bloqueada</h1>
            <p className="text-red-700 text-sm leading-relaxed">
              Han pasado más de 7 días y no has verificado tu dirección de correo electrónico.
              Por seguridad, el acceso a tu cuenta ha sido temporalmente suspendido.
            </p>
          </div>
          
          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <MailCheck size={20} />}
            {sending ? "Enviando..." : "Reenviar correo de verificación"}
          </button>
        </div>
      </div>
    );
  }

  // Banner rojo "Soft verification"
  return (
    <div className="bg-red-600 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm z-40 relative shadow-md">
      <div className="flex items-center gap-2">
        <MailWarning size={18} className="shrink-0" />
        <p className="font-medium text-center sm:text-left">
          Por favor, verifica tu correo electrónico para poder recibir convocatorias y notificaciones.
        </p>
      </div>
      <button 
        onClick={handleResend}
        disabled={sending}
        className="shrink-0 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full font-bold transition-colors disabled:opacity-50 text-xs flex items-center gap-2"
      >
        {sending ? <Loader2 className="animate-spin" size={14} /> : null}
        {sending ? "Enviando..." : "Reenviar correo"}
      </button>
    </div>
  );
}
