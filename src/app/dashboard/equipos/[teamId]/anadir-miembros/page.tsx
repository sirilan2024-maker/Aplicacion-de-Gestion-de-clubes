// src/app/dashboard/equipos/[teamId]/anadir-miembros/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Check, Copy, RefreshCcw, Mail, ChevronRight, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function Breadcrumb({ teamName }: { teamName: string }) {
  return (
    <nav className="flex items-center space-x-1 text-xs text-gray-400 uppercase tracking-wide font-medium mb-4">
      <Link href="/dashboard/equipos" className="hover:text-blue-600 transition-colors">
        Equipos
      </Link>
      <ChevronRight size={12} />
      <span className="text-gray-500">{teamName}</span>
      <ChevronRight size={12} />
      <span className="text-gray-500">Plantel</span>
      <ChevronRight size={12} />
      <span className="text-gray-700">Añadir miembros</span>
    </nav>
  );
}

export default function AnadirMiembrosPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [teamName, setTeamName] = useState("Equipo");

  const [code, setCode] = useState<string>("Cargando...");
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .single();
      if (data?.name) setTeamName(data.name);
    };
    if (teamId) fetchTeam();
  }, [teamId]);

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  };

  const fetchOrGenerateCode = async (forceNew = false) => {
    try {
      setLoading(true);
      const supabase = createClient();
      let newCode = "";

      if (!forceNew) {
        const { data } = await supabase.from("teams").select("invite_code").eq("id", teamId).single();
        if (data?.invite_code) {
          setCode(data.invite_code);
          setLoading(false);
          return;
        }
      }

      newCode = generateRandomCode();
      const { error } = await supabase.from("teams").update({ invite_code: newCode }).eq("id", teamId);
      if (!error) {
        setCode(newCode);
      } else {
        console.error(error);
        toast.error("Error al generar código de invitación");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) fetchOrGenerateCode();
  }, [teamId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.sportingsaladar.es";
  const link = code === "Cargando..." ? "Cargando..." : `${origin}/register/${code}`;

  const handleCopy = (text: string, type: "link" | "code") => {
    if (text === "Cargando...") return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("¡Copiado al portapapeles!");
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb teamName={teamName} />
        <h1 className="text-3xl font-bold text-blue-800 mb-2">Añadir miembros</h1>
        <p className="text-gray-500 mb-8 text-sm">Invitar nuevos miembros al equipo</p>

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-700 leading-relaxed">
            Comparte este enlace o código con los jugadores o sus padres. Al registrarse, aceptarán las condiciones de privacidad (LOPDGDD) y quedarán asignados automáticamente a <strong>{teamName}</strong>.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch gap-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Bloque Izquierdo: Enlace */}
          <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 space-y-6 bg-gray-50/50">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">Compartir enlace directo</h3>
              <p className="text-xs text-gray-500 mb-4">El usuario solo tendrá que abrir este enlace en su navegador.</p>
            </div>

            <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <input
                type="text"
                readOnly
                value={link}
                className="flex-1 min-w-0 truncate bg-transparent px-4 py-3 text-sm text-gray-700 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(link, "link")}
                className="shrink-0 border-l border-gray-200 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {copiedLink ? (
                  <span className="flex items-center gap-1.5"><Check size={16} />Copiado</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Copy size={16} />Copiar</span>
                )}
              </button>
            </div>

            <button 
              onClick={() => fetchOrGenerateCode(true)}
              disabled={loading}
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50 mt-2"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              Generar un nuevo enlace (anulará el anterior)
            </button>

            <div className="pt-4 flex gap-3">
              <a
                href={`mailto:?subject=Únete al equipo ${teamName}&body=Regístrate en el equipo usando este enlace: ${link}`}
                className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: "#E1F0FF" }}
                title="Compartir por Email"
              >
                <Mail size={22} className="text-blue-600" />
              </a>
              <a
                href={`https://wa.me/?text=Únete al equipo ${teamName} registrándote en este enlace: ${link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform hover:scale-105 hover:shadow-md"
                style={{ backgroundColor: "#25D366" }}
                title="Compartir por WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Bloque Derecho: Código */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">Código de invitación</h3>
              <p className="text-xs text-gray-500 mb-4">Si ya tienen cuenta, pueden introducir este código al añadir un equipo.</p>
            </div>

            <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-300 bg-gray-50 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <div className="flex-1 flex items-center justify-center min-w-0 px-2 sm:px-5 py-3 sm:py-4">
                <span className="text-2xl sm:text-3xl font-black tracking-[0.1em] sm:tracking-widest text-center text-gray-900 font-mono truncate">
                  {code}
                </span>
              </div>
              <button
                onClick={() => handleCopy(code, "code")}
                className="shrink-0 border-l border-gray-200 px-3 sm:px-5 py-3 sm:py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 bg-white transition-colors flex flex-col items-center justify-center"
              >
                {copiedCode ? (
                  <span className="flex flex-col items-center gap-1"><Check size={20} className="w-4 h-4 sm:w-5 sm:h-5" />Copiado</span>
                ) : (
                  <span className="flex flex-col items-center gap-1"><Copy size={20} className="w-4 h-4 sm:w-5 sm:h-5" />Copiar</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => router.push(`/dashboard/equipos/${teamId}`)}
            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
          >
            Volver al panel del equipo
          </button>
        </div>
      </div>
    </div>
  );
}
