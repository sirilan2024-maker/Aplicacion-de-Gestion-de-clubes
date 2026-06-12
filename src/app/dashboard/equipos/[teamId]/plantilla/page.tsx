"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, Pencil, X, ChevronRight } from "lucide-react";
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
      const { data: playersData, error } = await supabase
        .from("players")
        .select("id, first_name, last_name, posicion, birth_date, email, parent_contact, dorsal, height, weight, phone")
        .eq("team_id", teamId)
        .order("last_name", { ascending: true });

      if (error) throw error;
      
      const sorted = (playersData || []).sort((a, b) => {
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
      
      {/* TABLA */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Dorsal</th>
                <th className="px-6 py-4">Jugador</th>
                <th className="px-6 py-4">Posición</th>
                <th className="px-6 py-4 hidden sm:table-cell">Rol</th>
                <th className="px-6 py-4 hidden md:table-cell">Edad / Físico</th>
                <th className="px-6 py-4 hidden lg:table-cell">Contacto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Cargando plantilla...</p>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium text-lg">Sin jugadores</p>
                    <p className="text-gray-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
                  </td>
                </tr>
              ) : (
                players.map((player) => {
                  const esEntrenador = player.posicion?.toLowerCase() === 'entrenador';
                  return (
                    <tr 
                      key={player.id} 
                      onClick={() => router.push(`/dashboard/equipos/${teamId}/jugador/${player.id}`)}
                      className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        {player.dorsal ? (
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold shadow-sm text-sm border border-gray-700">
                            {player.dorsal}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs ml-2">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                            {player.first_name} {player.last_name}
                          </span>
                          <span className="text-xs text-gray-500 lg:hidden mt-0.5">{getDisplayEmail(player)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize font-medium text-gray-700">{player.posicion || '-'}</span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {esEntrenador ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                            Entrenador
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            Jugador
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-gray-900">
                        {player.birth_date ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{calcularEdad(player.birth_date)}</span>
                            {player.height && player.weight && (
                              <span className="text-xs text-gray-500 mt-0.5">
                                {player.height}m / {player.weight}kg
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-gray-600 font-medium">
                        <div className="flex flex-col">
                          <span>{getDisplayEmail(player)}</span>
                          {player.phone && <span className="text-xs text-gray-500">{player.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlayer(player);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors inline-flex"
                            title="Edición rápida"
                          >
                            <Pencil size={18} />
                          </button>
                          <div className="p-2 text-gray-300 group-hover:text-blue-500 transition-colors">
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
