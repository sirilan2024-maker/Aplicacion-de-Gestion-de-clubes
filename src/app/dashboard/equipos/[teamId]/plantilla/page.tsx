"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Plus, Pencil, Trash2, Users, ChevronRight, CheckCircle2, User, Loader2, X, Download, FileText } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { updatePlayerPositionAction } from "@/app/actions/player-actions";
import { getTeamCoachesProfilesAction } from "@/app/actions/team-actions";
import { useExport } from "@/components/providers/ExportContext";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  posicion: string;
  birth_date: string;
  email: string | null;
  parent_contact: string | null;
  dorsal: number | null;
  height: number | null;
  weight: number | null;
  phone: string | null;
  link_code?: string | null;
  posicion_principal?: string | null;
  status?: string | null;
  avatar_url?: string | null;
}

export default function PlantillaEquipoPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Edit Modal State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

  const { setExportData } = useExport();

  useEffect(() => {
    fetchData();
  }, [teamId]);

  useEffect(() => {
    const exportFormatted = players.map(p => ({
      Dorsal: p.dorsal || '-',
      Nombre: p.first_name,
      Apellidos: p.last_name,
      Posicion: p.posicion_principal || p.posicion || 'Jugador',
      Etiqueta: p.posicion || '-',
      Email: p.email || p.parent_contact || '-',
      Telefono: p.phone || '-'
    }));
    setExportData(exportFormatted, `Plantilla_Equipo_${teamId}`);
  }, [players, setExportData, teamId]);

  async function fetchData() {
    if (!teamId) return;
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) setUserRole(profile.role);
      }

      // 1. Fetch players via history
        const { data: historyData, error: playersError } = await supabase
          .from("player_season_history")
          .select(`
            status,
            players!inner (id, first_name, last_name, posicion, posicion_principal, status, birth_date, email, parent_contact, dorsal, height, weight, phone, link_code, avatar_url)
          `)
          .eq("team_id", teamId)
        .neq("status", "inactive");

      if (playersError) throw playersError;

      const playersData = historyData?.map((h: any) => ({
        ...h.players,
        posicion: h.players.posicion_principal
      })) || [];

      // 2. Fetch assigned coaches from team_coaches using the server action to bypass RLS
      const coachesData = await getTeamCoachesProfilesAction(teamId);

      // 3. Map coaches to Player interface
      const validCoaches = (coachesData || []).filter((tc: any) => tc && tc.profiles);
      const mappedCoaches: Player[] = validCoaches.map((tc: any) => {
        const p = tc.profiles;
        return {
          id: p.id,
          first_name: p.first_name || "Entrenador",
          last_name: p.last_name || "",
          posicion: "Entrenador", // Usamos "Entrenador" para que el sort lo identifique
          posicion_principal: "-",
          status: "active",
          birth_date: "",
          email: p.email,
          parent_contact: null,
          dorsal: null,
          height: null,
          weight: null,
          phone: null,
        };
      });

      console.log("Coaches fetched from DB:", coachesData);
      console.log("Mapped Coaches:", mappedCoaches);

      const combined = [...(playersData || []), ...mappedCoaches];
      
      const sorted = combined.sort((a, b) => {
        const isCoachA = a.posicion?.toLowerCase().includes('entrenador') || a.posicion?.toLowerCase().includes('delegado') || a.posicion?.toLowerCase().includes('técnico');
        const isCoachB = b.posicion?.toLowerCase().includes('entrenador') || b.posicion?.toLowerCase().includes('delegado') || b.posicion?.toLowerCase().includes('técnico');
        
        if (isCoachA && !isCoachB) return -1;
        if (!isCoachA && isCoachB) return 1;
        
        const nameA = a.last_name || a.first_name || '';
        const nameB = b.last_name || b.first_name || '';
        return nameA.localeCompare(nameB);
      });
      setPlayers(sorted);
    } catch (err: any) {
      toast.error("Error al cargar la plantilla: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (player: Player, newRole: string) => {
    // Si viene del mappedCoaches, no tiene email ni teléfono real aquí salvo que sea de profile
    // Determinamos si es profile (staff) o player comprobando parent_contact que es específico de players.
    // También podríamos verificar player.id.
    const isStaff = player.parent_contact === null && player.dorsal === null && player.height === null && player.first_name === "Entrenador"; // This is fragile, better to check if they are from coachesData
    
    // Mejor lógica para saber si es Ficha Deportiva:
    // Los entrenadores que vienen de la tabla 'profiles' (mappedCoaches) no tienen 'parent_contact' definido en DB (undefined o null), 
    // pero los jugadores (Ficha deportiva) sí lo tienen, al menos como null en la DB.
    // Para no equivocarnos, asumimos ficha deportiva a menos que haya sido inyectado por coachesData.
    const adminRoles = ['admin', 'coordinador', 'staff'];
    const esFicha = true; // Por defecto asumimos ficha en la plantilla a menos que reestruturemos.

    if (esFicha && adminRoles.includes(newRole.toLowerCase())) {
      const confirm = window.confirm(`ATENCIÓN:\n\nEste miembro es una ficha deportiva.\n\nCambiar su etiqueta a "${newRole}" NO le dará acceso real a la plataforma. Para darle acceso con contraseña debes ir a "Miembros" e invitarle.\n\n¿Quieres cambiar la etiqueta de todas formas?`);
      if (!confirm) return;
    }

    const toastId = toast.loading("Actualizando rol...");
    try {
      const res = await updatePlayerPositionAction(player.id, newRole);
      if (!res.success) throw new Error(res.error?.message || "Error al actualizar");
      
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, posicion: newRole } : p));
      toast.success("Rol actualizado", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "N/A";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  const getDisplayEmail = (p: Player) => {
    if (p.email && p.email !== 'N/A') return p.email;
    if (p.parent_contact && p.parent_contact !== 'N/A') return p.parent_contact;
    return "No especificado";
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("players")
        .update({
          first_name: editingPlayer.first_name,
          last_name: editingPlayer.last_name,
          posicion: editingPlayer.posicion,
          posicion_principal: editingPlayer.posicion_principal,
          status: editingPlayer.status,
          dorsal: editingPlayer.dorsal,
          height: editingPlayer.height,
          weight: editingPlayer.weight,
          phone: editingPlayer.phone,
        })
        .eq("id", editingPlayer.id);

      if (error) throw error;
      toast.success("Jugador actualizado");
      setEditingPlayer(null);
      fetchData(); // refresh data
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" />
      
      {/* HEADER DE ACCIONES */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Plantilla Actual</h2>
        <div className="flex gap-3">
          {(!userRole || !['entrenador', 'coach', 'coordinador'].includes(userRole.toLowerCase())) && (
            <>
              <button 
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Jugador,PIN de Registro\n"
                    + players.filter(p => p.posicion !== 'Entrenador').map(e => `${e.first_name} ${e.last_name},${e.link_code || 'SIN PIN'}`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", "PINs_Registro_Familiares.csv");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl border border-indigo-200 transition-colors shadow-sm text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Exportar PINs</span>
              </button>
              
              <button 
                onClick={() => router.push(`/dashboard/club/miembros`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl border border-emerald-700 transition-colors shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Asignar Miembro del Club</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABLA DESKTOP */}
      <div className="hidden md:block pb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700 border-separate border-spacing-y-3">
            <thead className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] px-2">
              <tr>
                <th className="px-6 py-2">Foto</th>
                <th className="px-6 py-2">Jugador</th>
                <th className="px-6 py-2">Posición</th>
                <th className="px-6 py-2">Rol</th>
                <th className="px-6 py-2">Edad / Físico</th>
                <th className="px-6 py-2">Contacto</th>
                <th className="px-6 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Cargando plantilla...</p>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-medium text-lg">Sin jugadores</p>
                    <p className="text-slate-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
                  </td>
                </tr>
              ) : (
                players.map((player) => {
                  const esEntrenador = (player.posicion_principal || player.posicion)?.toLowerCase().includes('entrenador') || (player.posicion_principal || player.posicion)?.toLowerCase().includes('delegado') || (player.posicion_principal || player.posicion)?.toLowerCase().includes('técnico');
                  return (
                    <tr 
                      key={player.id} 
                      onClick={() => {
                        if (esEntrenador) {
                          router.push(`/dashboard/club/miembros/staff/${player.id}`);
                        } else {
                          router.push(`/dashboard/equipos/${teamId}/jugador/${player.id}`);
                        }
                      }}
                      className="bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    >
                      <td className="px-6 py-4 rounded-l-xl border-y border-l border-gray-200 group-hover:border-gray-300">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-xs">
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt={player.first_name}
                              className="w-full h-full object-cover object-[center_25%]"
                            />
                          ) : (
                            <User className={`w-5 h-5 ${esEntrenador ? 'text-blue-500' : 'text-slate-400'}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-2 text-base">
                            {player.first_name} {player.last_name}
                            {player.dorsal && (
                              <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                                {player.dorsal}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300">
                        <span className="capitalize font-bold text-slate-700">{player.posicion_principal || '-'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300">
                        <span
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center capitalize ${
                            esEntrenador ? 'bg-emerald-50 text-emerald-700' :
                            ['admin', 'coordinador'].includes(player.posicion?.toLowerCase() || '') ? 'bg-purple-50 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {player.posicion ? player.posicion : 'Jugador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 border-y border-gray-200 group-hover:border-gray-300">
                        {player.birth_date ? (
                          <div className="flex flex-col">
                            <span className="font-bold">{calcularEdad(player.birth_date)}</span>
                            {player.height && player.weight && (
                              <span className="text-sm font-semibold text-slate-500 mt-0.5">
                                {player.height}m / {player.weight}kg
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium border-y border-gray-200 group-hover:border-gray-300">
                        <div className="flex flex-col">
                          <span className="font-bold">{getDisplayEmail(player)}</span>
                          {player.phone && <span className="text-sm font-semibold text-slate-500">{player.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center rounded-r-xl border-y border-r border-gray-200 group-hover:border-gray-300">
                        <div className="flex items-center justify-center gap-2">
                          <div className="p-2 text-slate-300 group-hover:text-blue-500 transition-colors bg-slate-50 rounded-full group-hover:bg-blue-50">
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TARJETAS MÓVIL */}
      <div className="md:hidden flex flex-col gap-5 pb-10">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Cargando plantilla...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-900 font-medium text-lg">Sin jugadores</p>
            <p className="text-slate-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
          </div>
        ) : (
          players.map((player) => {
            const esEntrenador = (player.posicion_principal || player.posicion)?.toLowerCase().includes('entrenador') || (player.posicion_principal || player.posicion)?.toLowerCase().includes('delegado') || (player.posicion_principal || player.posicion)?.toLowerCase().includes('técnico');
            return (
              <div 
                key={player.id}
                onClick={() => {
                  if (esEntrenador) {
                    router.push(`/dashboard/club/miembros/staff/${player.id}`);
                  } else {
                    router.push(`/dashboard/equipos/${teamId}/jugador/${player.id}`);
                  }
                }}
                className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(37,99,235,0.22)] border border-blue-200/80 hover:shadow-[0_12px_35px_rgba(37,99,235,0.3)] relative overflow-hidden cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                  <span className="text-7xl font-black text-slate-900 italic">
                    {player.dorsal || '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex gap-4 items-center flex-1 min-w-0">
                    {/* Avatar con foto o icono más grande */}
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center flex-shrink-0">
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.first_name}
                          className="w-full h-full object-cover object-[center_25%]"
                        />
                      ) : (
                        <User className={`w-9 h-9 ${esEntrenador ? 'text-blue-500' : 'text-slate-400'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-slate-900 font-bold text-lg leading-tight break-words">
                        {player.first_name} {player.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-emerald-700 text-xs font-semibold capitalize bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                          {player.posicion_principal || 'Sin posición'}
                        </span>
                        {player.posicion && player.posicion.toLowerCase() !== 'jugador' && !esEntrenador && (
                          <span className="text-purple-700 text-xs font-semibold capitalize bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">
                            {player.posicion}
                          </span>
                        )}
                        {esEntrenador && (
                          <span className="text-blue-700 text-xs font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            Míster
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dorsal a la derecha sin almohadilla */}
                  {player.dorsal && (
                    <div className="flex flex-col items-center justify-center min-w-10 px-2.5 py-1 bg-slate-900 text-white rounded-xl shadow-xs ml-3 flex-shrink-0">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 leading-none">Dorsal</span>
                      <span className="text-base font-black leading-tight">{player.dorsal}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs relative z-10">
                  <div className="text-slate-500">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Físico</span>
                    <span className="text-slate-900 font-medium">
                      {player.birth_date ? calcularEdad(player.birth_date) : '-'} años
                      {player.height && player.weight ? ` • ${player.height}m / ${player.weight}kg` : ''}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Contacto</span>
                    <span className="text-slate-900 font-medium truncate block">
                      {getDisplayEmail(player) || '-'}
                    </span>
                  </div>
                </div>


              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE EDICIÓN */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Editar Jugador</h2>
              <button 
                onClick={() => setEditingPlayer(null)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="edit-player-form" onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <input 
                    type="text" 
                    required
                    value={editingPlayer.first_name || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, first_name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Apellidos</label>
                  <input 
                    type="text" 
                    value={editingPlayer.last_name || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, last_name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Rol en el equipo</label>
                  <input 
                    type="text" 
                    value={editingPlayer.posicion || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, posicion: e.target.value})}
                    placeholder="Ej. Jugador, Entrenador..."
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Posición en el campo</label>
                  <input 
                    type="text" 
                    value={editingPlayer.posicion_principal || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, posicion_principal: e.target.value})}
                    placeholder="Ej. Delantero, Defensa..."
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Estado del jugador</label>
                  <select 
                    value={editingPlayer.status || 'active'}
                    onChange={(e) => setEditingPlayer({...editingPlayer, status: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo (Oculto)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Dorsal</label>
                  <input 
                    type="number" 
                    value={editingPlayer.dorsal || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, dorsal: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Altura (m)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingPlayer.height || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, height: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={editingPlayer.weight || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, weight: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <input 
                    type="text" 
                    value={editingPlayer.phone || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="edit-player-form"
                disabled={saving}
                className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center min-w-[120px] rounded-lg font-medium transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
