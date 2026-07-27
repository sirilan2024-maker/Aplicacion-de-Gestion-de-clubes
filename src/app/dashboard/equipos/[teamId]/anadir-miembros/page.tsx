// src/app/dashboard/equipos/[teamId]/anadir-miembros/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  X,
  Users,
  UserPlus,
  MailPlus,
  Link2,
  Info,
  Search,
  RefreshCcw,
  Download,
  Mail,
  Copy,
  Check,
  ChevronRight,
  User,
  Plus
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types */
type Screen =
  | "initial"          // Pantalla 1: Modal de selección inicial
  | "nuevo-tipo"       // Pantalla 2: Menú de 3 tarjetas (Añadir nuevos miembros)
  | "tabla-manual"     // Pantalla 3: Tabla manual / CSV
  | "enlace-codigo"    // Pantalla 4: Enlace y código de invitación
  | "miembros-club";   // Pantalla 5: Miembros del club

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  category?: string;
  team_id?: string;
  birth_date?: string;
}

/* ------------------------------------------------------------------ */
/* Helper: Breadcrumb */
function Breadcrumb({
  teamName,
  screenLabel,
  onBack,
}: {
  teamName: string;
  screenLabel: string;
  onBack?: () => void;
}) {
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
      {onBack ? (
        <button onClick={onBack} className="hover:text-blue-600 transition-colors">
          Añadir miembros
        </button>
      ) : (
        <span className="text-gray-700">{screenLabel}</span>
      )}
      {onBack && (
        <>
          <ChevronRight size={12} />
          <span className="text-gray-700">{screenLabel}</span>
        </>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 1: Initial Modal Selection */
function ScreenInitial({
  teamName,
  onSelect,
}: {
  teamName: string;
  onSelect: (choice: "nuevo" | "club") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Añadir miembros al equipo</h2>
          <Link
            href="/dashboard/equipos"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </Link>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          <button
            onClick={() => onSelect("nuevo")}
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="p-4 rounded-full bg-blue-50 text-blue-600">
              <UserPlus size={36} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-gray-700 leading-snug">
              Añadir nuevos miembros al club
            </span>
            <span className="text-xs text-gray-400">
              Crea fichas nuevas o comparte el enlace de registro
            </span>
          </button>

          <button
            onClick={() => onSelect("club")}
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="p-4 rounded-full bg-indigo-50 text-indigo-600">
              <Users size={36} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-gray-700 leading-snug">
              Asignar miembro ya presente en el club
            </span>
            <span className="text-xs text-gray-400">
              Busca y añade jugadores o entrenadores existentes
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 2: Invitar nuevos - Tipo de invitación */
function ScreenNuevoTipo({
  teamName,
  onBack,
  onSelect,
}: {
  teamName: string;
  onBack: () => void;
  onSelect: (type: "tabla" | "enlace") => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in-50 duration-200">
      <Breadcrumb teamName={teamName} screenLabel="Invitar nuevos miembros" onBack={onBack} />

      <h1 className="text-3xl font-bold text-blue-900 mb-2">Añadir miembros</h1>
      <p className="text-gray-500 mb-8 text-sm">Elige el método para invitar nuevos miembros al club</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Opción 1: Tabla */}
        <button
          onClick={() => onSelect("tabla")}
          className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Users size={32} strokeWidth={1.3} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Completar la tabla</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              Rellena los datos de los nuevos miembros directamente en la tabla.
            </p>
          </div>
        </button>

        {/* Opción 2: Enlace/Código */}
        <button
          onClick={() => onSelect("enlace")}
          className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Link2 size={32} strokeWidth={1.3} className="text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Enlace o código</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              Comparte un enlace o código de invitación para que se unan.
            </p>
          </div>
        </button>

        {/* Opción 3: Email */}
        <button
          onClick={() => window.open(`mailto:?subject=Invitación al equipo ${teamName}&body=Únete al equipo usando el enlace de registro de la plataforma.`, '_blank')}
          className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
            <MailPlus size={32} strokeWidth={1.3} className="text-purple-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Invitar por email</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              Envía invitaciones directamente al correo de cada miembro.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 3: Tabla manual + CSV */
interface NewMemberRow {
  apellidos: string;
  nombre: string;
  rol: string;
}

function ScreenTablaManual({
  teamId,
  teamName,
  onBack,
  onFinish,
}: {
  teamId: string;
  teamName: string;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [rows, setRows] = useState<NewMemberRow[]>([
    { apellidos: "", nombre: "", rol: "jugador" },
    { apellidos: "", nombre: "", rol: "jugador" },
    { apellidos: "", nombre: "", rol: "jugador" },
  ]);
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleRowChange = (idx: number, field: keyof NewMemberRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { apellidos: "", nombre: "", rol: "jugador" }]);

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.nombre.trim() || r.apellidos.trim());
    if (validRows.length === 0) { setSaveError("Rellena al menos un miembro."); return; }
    setSubmitting(true);
    setSaveError("");
    try {
      const supabase = createClient();
      // Get club_id for the NOT NULL constraint
      const { data: clubData } = await supabase.from("clubs").select("id").limit(1).single();
      const club_id = clubData?.id ?? null;
      const inserts = validRows.map((r) => ({
        first_name: r.nombre.trim() || "-",
        last_name: r.apellidos.trim() || "-",
        posicion: r.rol,
        team_id: teamId,
        club_id,
        birth_date: "2010-01-01",
        parent_contact: "Pendiente",
      }));
      const { data: inserted, error } = await supabase.from("players").insert(inserts).select("id");
      if (error) {
        setSaveError("Error al guardar: " + error.message);
      } else if (!inserted || inserted.length === 0) {
        setSaveError("Error: Inserción bloqueada. Revisa la política RLS de INSERT en la tabla 'players'.");
      } else {
        // Fetch active season to insert into history
        const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', club_id).eq('is_active', true).single();
        if (activeSeason) {
          const historyInserts = inserted.map((player) => ({
            player_id: player.id,
            club_id: club_id,
            season_id: activeSeason.id,
            team_id: teamId,
            status: 'active'
          }));
          await supabase.from('player_season_history').insert(historyInserts);
        }
        // Increment the counts in the equipos table
        const { data: teamData } = await supabase.from('teams').select("members, coaches").eq("id", teamId).single();
        if (teamData) {
          const numJugadores = inserts.filter(i => i.posicion !== "entrenador").length;
          const numEntrenadores = inserts.filter(i => i.posicion === "entrenador").length;
          await supabase.from('teams').update({ 
            members: (teamData.members || 0) + numJugadores,
            coaches: (teamData.coaches || 0) + numEntrenadores 
          }).eq("id", teamId);
        }
        toast.success("Miembros añadidos con éxito");
        onFinish();
      }
    } catch (e: any) {
      setSaveError("Error inesperado: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setSubmitting(true);
    setSaveError("");
    try {
      const lines = csvText.split("\n");
      const parsedRows: NewMemberRow[] = [];
      
      lines.forEach((line) => {
        if (!line.trim()) return;
        const parts = line.split(/[,\t]/);
        if (parts.length >= 2) {
          const apellidos = parts[0]?.trim() || "";
          const nombre = parts[1]?.trim() || "";
          let rol = parts[2]?.trim()?.toLowerCase() || "jugador";
          if (rol.includes("entrenador") || rol.includes("mister")) {
            rol = "entrenador";
          } else if (rol.includes("auxiliar")) {
            rol = "auxiliar";
          } else {
            rol = "jugador";
          }
          parsedRows.push({ apellidos, nombre, rol });
        }
      });

      if (parsedRows.length === 0) {
        setSaveError("No se pudieron parsear líneas en el formato 'Apellidos, Nombre, Rol'");
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      const { data: clubData } = await supabase.from("clubs").select("id").limit(1).single();
      const club_id = clubData?.id ?? null;
      
      const inserts = parsedRows.map((r) => ({
        first_name: r.nombre,
        last_name: r.apellidos,
        posicion: r.rol,
        team_id: teamId,
        club_id,
        birth_date: "2010-01-01",
        parent_contact: "Pendiente",
      }));

      const { data: inserted, error } = await supabase.from("players").insert(inserts).select("id");
      if (error) {
        setSaveError("Error al guardar CSV: " + error.message);
      } else if (inserted && inserted.length > 0) {
        const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', club_id).eq('is_active', true).single();
        if (activeSeason) {
          const historyInserts = inserted.map((player) => ({
            player_id: player.id,
            club_id: club_id,
            season_id: activeSeason.id,
            team_id: teamId,
            status: 'active'
          }));
          await supabase.from('player_season_history').insert(historyInserts);
        }
        
        const { data: teamData } = await supabase.from('teams').select("members, coaches").eq("id", teamId).single();
        if (teamData) {
          const numJugadores = inserts.filter(i => i.posicion !== "entrenador").length;
          const numEntrenadores = inserts.filter(i => i.posicion === "entrenador").length;
          await supabase.from('teams').update({ 
            members: (teamData.members || 0) + numJugadores,
            coaches: (teamData.coaches || 0) + numEntrenadores 
          }).eq("id", teamId);
        }
        toast.success(`Se importaron ${inserted.length} miembros con éxito`);
        onFinish();
      }
    } catch (e: any) {
      setSaveError("Error al procesar CSV: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in-50 duration-200">
      <Breadcrumb teamName={teamName} screenLabel="Invitar nuevos miembros" onBack={onBack} />

      <h1 className="text-2xl font-bold text-blue-900 mb-6">Invitar nuevos miembros</h1>

      {/* Aviso info */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Los miembros creados directamente aparecerán en la plantilla del equipo y podrán recibir sus PINs de registro de familiares.
        </p>
      </div>

      {/* Opción 1: Tabla */}
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Opción 1: Completar la tabla de nuevos miembros
      </h2>

      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Apellido(s) <span className="text-red-500">*</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                Nombre <span className="text-red-500">*</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Rol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={row.apellidos}
                    onChange={(e) => handleRowChange(idx, "apellidos", e.target.value)}
                    placeholder="Apellido(s)"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={row.nombre}
                    onChange={(e) => handleRowChange(idx, "nombre", e.target.value)}
                    placeholder="Nombre"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={row.rol}
                    onChange={(e) => handleRowChange(idx, "rol", e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="jugador">Jugador</option>
                    <option value="entrenador">Entrenador</option>
                    <option value="auxiliar">Auxiliar</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-gray-100 px-4 py-2">
          <button
            onClick={addRow}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            + Añadir fila
          </button>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Guardando…" : "Guardar desde la tabla"}
        </button>
      </div>

      {/* Opción 2: CSV */}
      <h2 className="mb-2 text-sm font-semibold text-gray-700">
        Opción 2: Pegar una lista (un miembro por línea)
      </h2>
      <p className="mb-2 text-xs text-gray-400">
        Formato: Apellidos, Nombre, Rol (separados por coma o tabulador)
      </p>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={5}
        placeholder="Ejemplo:&#10;García López, Juan, jugador&#10;Martínez Ruiz, Ana, entrenador"
        className="mb-3 h-32 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
      />
      
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={handleCsvImport}
          disabled={submitting || !csvText.trim()}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Users size={14} />
          Procesar e importar lista
        </button>
      </div>

      {saveError && (
        <p className="mb-3 text-sm text-red-600 font-medium">{saveError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-100 pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 4: Enlace y Código */
function ScreenEnlaceCodigo({
  teamId,
  teamName,
  onBack,
}: {
  teamId: string;
  teamName: string;
  onBack: () => void;
}) {
  const [code, setCode] = useState<string>("Cargando...");
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
  const isSeniorTeam = teamName.toLowerCase().includes("senior");
  // Usamos el flujo unificado nuevo pasando el teamId por parámetro URL
  const link = code === "Cargando..." ? "Cargando..." : 
    isSeniorTeam ? `${origin}/inscripcion/senior?team=${teamId}` : `${origin}/test-registro?team=${teamId}`;

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
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in-50 duration-200">
      <Breadcrumb teamName={teamName} screenLabel="Enlace y código de invitación" onBack={onBack} />
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Añadir miembros</h1>
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

      <div className="mt-8 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen 5: Miembros del club */
function ScreenMiembrosClub({
  teamId,
  teamName,
  onBack,
}: {
  teamId: string;
  teamName: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("jugador"); // Default to jugador
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(true); // Default to true to show all members easily

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const supabase = createClient();
      
      // 1. Fetch player IDs already assigned to this team
      const { data: teamHistory } = await supabase
        .from("player_season_history")
        .select("player_id")
        .eq("team_id", teamId)
        .neq("status", "inactive");
      const existingPlayerIds = new Set(teamHistory?.map(h => h.player_id) || []);

      // 2. Fetch the club ID of the team
      const { data: teamData } = await supabase
        .from("teams")
        .select("club_id")
        .eq("id", teamId)
        .single();
      const clubId = teamData?.club_id;

      // 3. Fetch all active players in the club
      let query = supabase
        .from("players")
        .select("id, first_name, last_name, birth_date, team_id, posicion")
        .neq("status", "inactive");
      
      if (clubId) {
        query = query.eq("club_id", clubId);
      }
      
      const { data } = await query.order("last_name");
        
      if (data) {
        const currentYear = new Date().getFullYear();
        const playersWithCategories = data.map((p: any) => {
          let category = "desconocida";
          if (p.birth_date) {
            const birthYear = new Date(p.birth_date).getFullYear();
            const age = currentYear - birthYear;
            if (age >= 19) category = "senior";
            else if (age >= 16) category = "juvenil";
            else if (age >= 14) category = "cadete";
            else if (age >= 12) category = "infantil";
            else if (age >= 10) category = "alevin";
            else if (age >= 8) category = "benjamin";
            else if (age >= 6) category = "prebenjamin";
            else category = "querubin";
          }
          
          return {
            ...p,
            category,
            role: p.posicion || "jugador"
          };
        });
        
        // Exclude players already in THIS team (by checking history or current team_id)
        const filteredPlayers = playersWithCategories.filter(
          (p: any) => p.team_id !== teamId && !existingPlayerIds.has(p.id)
        );
        
        setMembers(filteredPlayers as ClubMember[]);
      }
      setLoading(false);
    };
    fetchMembers();
  }, [teamId]);

  // Determine current team category from team name
  const teamNameLower = teamName.toLowerCase();
  const currentTeamCategory = 
    teamNameLower.includes("senior") || teamNameLower.includes("aficionado") || teamNameLower.includes("1er") || teamNameLower.includes("primer") ? "senior" :
    teamNameLower.includes("juvenil") ? "juvenil" :
    teamNameLower.includes("cadete") ? "cadete" :
    teamNameLower.includes("infantil") ? "infantil" :
    teamNameLower.includes("alevin") ? "alevin" :
    teamNameLower.includes("benjamin") && !teamNameLower.includes("pre") ? "benjamin" :
    teamNameLower.includes("prebenjamin") ? "prebenjamin" :
    teamNameLower.includes("querubin") ? "querubin" : null;

  const filtered = members.filter((m) => {
    const full = `${m.first_name} ${m.last_name}`.toLowerCase();
    const matchesSearch = full.includes(search.toLowerCase());
    
    if (showAll) return matchesSearch;
    
    // Filter by role
    let matchesRole = true;
    if (role) {
      const playerRole = (m.role || "jugador").toLowerCase();
      matchesRole = playerRole === role.toLowerCase();
    }
    
    // Filter by category if we found one
    let matchesCategory = true;
    if (role === "jugador" && currentTeamCategory && m.category) {
      matchesCategory = m.category === currentTeamCategory || m.category === "desconocida";
    }
    
    return matchesSearch && matchesCategory && matchesRole;
  });

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0 || !role) {
      toast.error("Por favor selecciona un rol y al menos un jugador");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      
      // Move selected players to this team
      const { error } = await supabase
        .from("players")
        .update({ team_id: teamId, posicion: role })
        .in("id", Array.from(selected));
        
      if (error) throw error;
      
      toast.success("¡Miembros asignados al equipo correctamente!");
      setTimeout(() => {
        window.location.href = `/dashboard/equipos/${teamId}/plantilla`;
      }, 1000);
      
    } catch (e: any) {
      toast.error("Error inesperado: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in-50 duration-200">
      <Breadcrumb teamName={teamName} screenLabel="Añadir miembros del club" />

      <h1 className="text-2xl font-bold text-blue-800 mb-6">Añadir miembros del club</h1>

      {/* Info box */}
      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          Vas a añadir miembros del club al equipo :{" "}
          <span className="font-bold text-gray-900">{teamName.toUpperCase()}</span>
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Elegir un papel <span className="text-red-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          >
            <option value="jugador">Jugador</option>
            <option value="entrenador">Entrenador</option>
            <option value="auxiliar">Auxiliar</option>
          </select>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar miembros por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-all"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="show-all" className="text-sm font-medium text-gray-600 cursor-pointer">
            Mostrar todo el club (ignorar edad y papel)
          </label>
        </div>
      </div>

      {/* Seleccionar todo */}
      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="select-all"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
          Seleccionar todo ({selected.size} seleccionados)
        </label>
      </div>

      {/* Lista de miembros */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
          <RefreshCcw className="animate-spin text-blue-600" size={16} />
          Cargando miembros del club...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400 bg-gray-50 border border-dashed rounded-lg border-gray-200">
          No se encontraron miembros en el club disponibles para añadir.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="flex items-center space-x-3 border-b border-gray-100 px-4 py-2.5 last:border-0 hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleMember(member.id)}
            >
              <input
                type="checkbox"
                checked={selected.has(member.id)}
                onChange={() => toggleMember(member.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                <User size={16} className="text-gray-500" />
              </div>
              <div className="flex flex-col ml-2 truncate">
                <span className="text-sm text-gray-800 truncate font-medium">
                  {member.last_name}, {member.first_name}
                </span>
                {member.category && (
                  <span className="text-[10px] uppercase font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 w-max mt-0.5">
                    {member.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3 border-t border-gray-100 pt-6">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
        <button
          onClick={handleAdd}
          disabled={submitting || selected.size === 0 || !role}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Añadiendo…" : `Añadir ${selected.size > 0 ? selected.size : ""} miembro${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page */
export default function AnadirMiembrosPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [teamName, setTeamName] = useState("Equipo");
  const [screen, setScreen] = useState<Screen>("initial");

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

  const handleInitialSelect = (choice: "nuevo" | "club") => {
    if (choice === "nuevo") setScreen("nuevo-tipo");
    else setScreen("miembros-club");
  };

  const handleNuevoTipoSelect = (type: "tabla" | "enlace") => {
    if (type === "tabla") setScreen("tabla-manual");
    else setScreen("enlace-codigo");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {/* Pantalla 1: Modal superpuesto */}
      {screen === "initial" && (
        <>
          {/* Fondo de página (visible detrás del modal) */}
          <div className="max-w-4xl mx-auto px-4 py-8 opacity-20 pointer-events-none select-none">
            <h1 className="text-3xl font-bold text-blue-800">Plantel</h1>
          </div>
          <ScreenInitial teamName={teamName} onSelect={handleInitialSelect} />
        </>
      )}

      {screen === "nuevo-tipo" && (
        <ScreenNuevoTipo
          teamName={teamName}
          onBack={() => setScreen("initial")}
          onSelect={handleNuevoTipoSelect}
        />
      )}

      {screen === "tabla-manual" && (
        <ScreenTablaManual
          teamId={teamId}
          teamName={teamName}
          onBack={() => setScreen("nuevo-tipo")}
          onFinish={() => router.push(`/dashboard/equipos/${teamId}/plantilla`)}
        />
      )}

      {screen === "enlace-codigo" && (
        <ScreenEnlaceCodigo
          teamId={teamId}
          teamName={teamName}
          onBack={() => setScreen("nuevo-tipo")}
        />
      )}

      {screen === "miembros-club" && (
        <ScreenMiembrosClub
          teamId={teamId}
          teamName={teamName}
          onBack={() => setScreen("initial")}
        />
      )}
    </div>
  );
}
