"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, AlertCircle, Shield, User, Users } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type Step = "presentation" | "form" | "success";

export default function JoinTeamPage() {
  const params = useParams();
  const inviteCode = typeof params.code === 'string' ? params.code.toUpperCase() : '';
  
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // UI State
  const [step, setStep] = useState<Step>("presentation");
  const [role, setRole] = useState<"jugador" | "familiar" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  useEffect(() => {
    async function fetchTeam() {
      if (!inviteCode) return;
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("equipos")
        .select("id, name, sport, category")
        .eq("invite_code", inviteCode)
        .single();
        
      if (fetchError || !data) {
        setError(true);
      } else {
        setTeam(data);
      }
      setLoading(false);
    }
    fetchTeam();
  }, [inviteCode]);

  const handleRoleSelect = (selectedRole: "jugador" | "familiar") => {
    setRole(selectedRole);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !birthDate || !email || !parentEmail) {
      toast.error("Por favor, rellena todos los campos obligatorios");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos de privacidad");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      
      // Get club_id for the NOT NULL constraint
      const { data: clubData } = await supabase.from("clubs").select("id").limit(1).single();
      const club_id = clubData?.id ?? null;

      const verificationToken = crypto.randomUUID();

      const insertData = {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        email: email,
        parent_contact: parentEmail,
        team_id: team.id,
        club_id: club_id,
        posicion: role === "familiar" ? "familiar" : "jugador",
        email_verified: false,
        verification_token: verificationToken
      };

      const { data: inserted, error: insertError } = await supabase
        .from("players")
        .insert([insertData])
        .select("id");

      if (insertError) {
        throw new Error(insertError.message);
      }
      
      if (!inserted || inserted.length === 0) {
        throw new Error("Inserción bloqueada por políticas de seguridad");
      }

      // Optimistically increment members count in equipos table (optional)
      const { data: teamData } = await supabase.from("equipos").select("members").eq("id", team.id).single();
      if (teamData) {
        await supabase.from("equipos").update({ members: (teamData.members || 0) + 1 }).eq("id", team.id);
      }

      const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`;
      console.log("----------------------------------------");
      console.log("EMAIL DE VERIFICACIÓN (Simulación)");
      console.log(`Para: ${email}, ${parentEmail}`);
      console.log(`Enlace: ${verificationLink}`);
      console.log("----------------------------------------");

      setStep("success");
    } catch (err: any) {
      toast.error("Error al unirse al equipo: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <div className="mx-auto bg-red-50 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace de invitación inválido o caducado</h1>
          <p className="text-sm text-gray-500">
            El código <span className="font-mono font-bold text-gray-700">{inviteCode}</span> no pertenece a ningún equipo o ya no es válido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md overflow-hidden relative">
        
        {/* PROGRESS INDICATOR */}
        {step !== "success" && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: step === "presentation" ? "50%" : "100%" }}
            />
          </div>
        )}

        {/* STEP 1: PRESENTATION */}
        {step === "presentation" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8 pt-4">
              <div className="mx-auto bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <Shield size={36} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{team.name}</h1>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {team.sport} • {team.category}
              </p>
            </div>
            
            <div className="mb-6 text-center">
              <p className="text-gray-600 text-sm">
                Estás a punto de unirte a este equipo. Antes de empezar, indícanos tu rol:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleRoleSelect("jugador")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
              >
                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                  <User size={24} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">Soy el jugador</span>
              </button>

              <button 
                onClick={() => handleRoleSelect("familiar")}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
              >
                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Users size={24} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="font-semibold text-gray-800 text-sm group-hover:text-blue-700">Soy un familiar/tutor</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FORM */}
        {step === "form" && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 pt-4">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setStep("presentation")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                ← Volver
              </button>
              <h2 className="text-xl font-bold text-gray-900">Completar registro</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido(s) *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Tus apellidos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de nacimiento *</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email de un familiar *</label>
                <input
                  type="email"
                  required
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="correo@familiar.com"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Acepto los términos de privacidad del club y el tratamiento de mis datos.
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !acceptedTerms}
                className="w-full mt-4 rounded-lg bg-blue-600 px-4 py-3.5 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  "Unirme al equipo"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="animate-in zoom-in-95 duration-500 text-center py-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Registro casi completado!
            </h2>
            <p className="text-gray-500 text-base">
              Por favor, revisa tu bandeja de entrada y verifica tu correo para poder recibir notificaciones del equipo.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
