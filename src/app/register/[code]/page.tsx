"use client";

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Shield, Users, AlertCircle, Loader2 } from "lucide-react"
import { RegisterForm } from "./RegisterForm"

export default function InviteRegisterPage() {
  const params = useParams();
  const inviteCode = typeof params.code === 'string' ? params.code.toUpperCase() : '';
  
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchTeam() {
      if (!inviteCode) return;
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('teams')
        .select("id, name, club_id")
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ── Código inválido ────────────────────────────────────────────────────
  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 ring-4 ring-red-100">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitación no válida</h1>
          <p className="text-sm text-gray-500 mb-6">
            El código <span className="font-mono font-bold text-gray-700">{inviteCode}</span> no existe
            o ya ha expirado. Pide al administrador del club un nuevo enlace de invitación.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            ← Ir al login
          </Link>
        </div>
      </div>
    )
  }

  // ── Página de registro ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* ── Logo + Branding ── */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
            <Shield size={20} className="text-white" />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">ClubManager</h1>
          <p className="text-sm text-gray-400 mt-1">Sistema de gestión deportiva</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-7 py-7">

          {/* ── Team Banner ── */}
          <div className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl mb-6 border border-blue-100">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Users size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 leading-none mb-0.5">
                Te estás uniendo a
              </p>
              <p className="text-base font-bold text-blue-800 truncate">{team.name}</p>
            </div>
            <span className="ml-auto font-mono text-xs font-bold text-blue-400 bg-blue-100 px-2 py-0.5 rounded-lg shrink-0">
              {inviteCode}
            </span>
          </div>

          {/* ── Form (Client Component) ── */}
          <RegisterForm inviteCode={inviteCode} teamName={team.name} />
        </div>

        {/* ── Footer ── */}
        <p className="mt-6 text-center text-sm text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Iniciar sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
