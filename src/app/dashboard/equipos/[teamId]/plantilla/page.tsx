"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Plus, Pencil, Trash2, Users, ChevronRight, CheckCircle2, User, Loader2, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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
}

import { getTeamCoachesProfilesAction } from "@/app/actions/team-actions";

export default function PlantillaEquipoPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teamId]);

  async function fetchData() {
    if (!teamId) return;
    const supabase = createClient();
    try {
      // 1. Fetch players via history
      const { data: historyData, error: playersError } = await supabase
        .from("player_season_history")
        .select(`
          status,
          players!inner (id, first_name, last_name, posicion, birth_date, email, parent_contact, dorsal, height, weight, phone)
        `)
        .eq("team_id", teamId)
        .neq("status", "inactive");

      if (playersError) throw playersError;

      const playersData = historyData?.map((h: any) => h.players) || [];

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
      
      {/* TABLA DESKTOP */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Dorsal</th>
                <th className="px-6 py-4">Jugador</th>
                <th className="px-6 py-4">Posición</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Edad / Físico</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  const esEntrenador = player.posicion?.toLowerCase() === 'entrenador';
                  return (
                    <tr 
                      key={player.id} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/jugador/${player.id}`)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        {player.dorsal ? (
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm text-sm border border-slate-700">
                            {player.dorsal}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs ml-2">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                            {player.first_name} {player.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize font-medium text-slate-700">{player.posicion || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {esEntrenador ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                            Entrenador
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Jugador
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        {player.birth_date ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{calcularEdad(player.birth_date)}</span>
                            {player.height && player.weight && (
                              <span className="text-xs text-slate-500 mt-0.5">
                                {player.height}m / {player.weight}kg
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        <div className="flex flex-col">
                          <span>{getDisplayEmail(player)}</span>
                          {player.phone && <span className="text-xs text-slate-500">{player.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlayer(player);
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex"
                            title="Edición rápida"
                          >
                            <Pencil size={18} />
                          </button>
                          <div className="p-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
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
      <div className="md:hidden flex flex-col gap-4">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Cargando plantilla...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-900 font-medium text-lg">Sin jugadores</p>
            <p className="text-slate-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
          </div>
        ) : (
          players.map((player) => {
            const esEntrenador = player.posicion?.toLowerCase() === 'entrenador';
            return (
              <div 
                key={player.id}
                onClick={() => router.push(`/dashboard/equipos/${teamId}/jugador/${player.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <span className="text-6xl font-black text-slate-900 italic">
                    {player.dorsal || '-'}
                  </span>
                </div>
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-700 text-xl font-bold">
                      {player.dorsal || <User size={24} className="text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-slate-900 font-bold text-lg leading-tight truncate">
                        {player.first_name} {player.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-700 text-xs font-semibold capitalize bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                          {player.posicion || 'Sin posición'}
                        </span>
                        {esEntrenador && (
                          <span className="text-blue-700 text-xs font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            Míster
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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

                <div className="absolute top-4 right-4 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlayer(player);
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 border border-slate-200 hover:bg-emerald-50 rounded-full transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
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
                  <label className="text-sm font-medium text-gray-700">Posición / Rol</label>
                  <input 
                    type="text" 
                    value={editingPlayer.posicion || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, posicion: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900" 
                  />
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
