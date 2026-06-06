"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setStatus("error");
        return;
      }

      const supabase = createClient();
      
      try {
        // En un entorno de producción, esto debería ser un Server Action (RPC o endpoint seguro)
        // ya que estamos actualizando un registro desde una vista pública usando RLS.
        // Para este prototipo/ejemplo, usaremos update normal, asumiendo que RLS permite update si el token coincide.
        // NOTA: Si RLS bloquea esto, habría que crear un RPC (stored procedure) en Supabase:
        // CREATE OR REPLACE FUNCTION verify_email(verification_token text) ...
        
        const { data, error } = await supabase
          .from("players")
          .update({ email_verified: true, verification_token: null })
          .eq("verification_token", token)
          .select("id");

        if (error) throw error;
        
        if (data && data.length > 0) {
          setStatus("success");
        } else {
          // El token no existe o ya fue usado
          setStatus("error");
        }
      } catch (error) {
        console.error("Error verificando email:", error);
        setStatus("error");
      }
    }

    verifyToken();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verificando tu correo...</h2>
        <p className="text-gray-500 mt-2">Por favor, espera un momento.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Enlace inválido o expirado
        </h2>
        <p className="text-gray-500 text-base max-w-sm">
          El enlace de verificación que has utilizado no es válido o tu correo ya ha sido verificado anteriormente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm ring-4 ring-green-50">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        ¡Tu correo ha sido verificado con éxito!
      </h2>
      <p className="text-gray-500 text-base max-w-sm">
        Ya formas parte de la red de notificaciones del club. Recibirás avisos importantes sobre los entrenamientos y partidos.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md max-w-md w-full overflow-hidden">
        <Suspense fallback={
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
