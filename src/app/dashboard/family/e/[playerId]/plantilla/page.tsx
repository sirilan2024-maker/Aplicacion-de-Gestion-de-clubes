"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Users, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getTeamCoachesProfilesAction } from "@/app/actions/team-actions";

interface RosterMember {
  id: string;
  first_name: string;
  last_name: string;
  posicion: string;
  posicion_principal?: string | null;
  dorsal: number | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  avatar_url?: string | null;
  isStaff: boolean;
}

export default function FamilyTeamRosterPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    fetchRoster();
  }, [playerId]);

  const fetchRoster = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      // 1. Obtener el equipo del jugador (directo o via historial de temporada activa)
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
        
      if (playerError) throw playerError;
      
      let teamId = player.team_id;
      let resolvedTeamName = (player.teams as any)?.name || "Equipo";

      const { data: psh } = await supabase
        .from('player_season_history')
        .select('team_id, teams(name)')
        .eq('player_id', playerId)
        .neq('status', 'inactive')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (psh?.team_id) {
        teamId = psh.team_id;
        resolvedTeamName = (psh.teams as any)?.name || resolvedTeamName;
      }

      if (!teamId) {
        setLoading(false);
        return;
      }

      setTeamName(resolvedTeamName);

      // 2. Cargar jugadores via historial de temporada (idéntico a la vista admin/entrenador)
      const { data: historyData, error: playersError } = await supabase
        .from("player_season_history")
        .select(`
          status,
          players!inner (id, first_name, last_name, posicion, posicion_principal, status, birth_date, dorsal, height, weight, avatar_url, email)
        `)
        .eq("team_id", teamId)
        .neq("status", "inactive");

      if (playersError) throw playersError;

      const playersData = (historyData?.map((h: any) => ({
        ...h.players,
        posicion: h.players.posicion_principal || h.players.posicion
      })) || []).filter((p: any) => {
        const pos = (p.posicion || p.posicion_principal || '').toLowerCase();
        return !['entrenador', 'delegado', 'técnico', 'cuerpo técnico'].includes(pos) && p.status !== 'inactive';
      });

      // 3. Cargar cuerpo técnico asignado en team_coaches
      const coachesData = await getTeamCoachesProfilesAction(teamId);
      const validCoaches = (coachesData || []).filter((tc: any) => tc && tc.profiles);
      const mappedCoaches: RosterMember[] = validCoaches.map((tc: any) => {
        const p = tc.profiles;
        const staffRole = tc.role || p.role || p.rol || "Entrenador";
        return {
          id: p.id,
          first_name: p.first_name || staffRole,
          last_name: p.last_name || "",
          posicion: staffRole,
          posicion_principal: staffRole,
          dorsal: null,
          birth_date: null,
          height: null,
          weight: null,
          avatar_url: p.avatar_url || null,
          isStaff: true
        };
      });

      // 4. Desduplicación: si un técnico tiene ficha de jugador (mismo nombre/email), no duplicar
      const coachEmails = new Set(validCoaches.map((tc: any) => tc.profiles?.email?.toLowerCase()).filter(Boolean));
      const coachNames = new Set(mappedCoaches.map(c => `${c.first_name?.trim()} ${c.last_name?.trim()}`.toLowerCase()));
      const filteredPlayersData = playersData.filter((p: any) => {
        const fullName = `${p.first_name?.trim()} ${p.last_name?.trim()}`.toLowerCase();
        if (p.email && coachEmails.has(p.email.toLowerCase())) return false;
        if (coachNames.has(fullName)) return false;
        return true;
      });

      const mappedPlayers: RosterMember[] = filteredPlayersData.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        posicion: p.posicion || p.posicion_principal || 'Jugador',
        posicion_principal: p.posicion_principal || p.posicion || '-',
        dorsal: p.dorsal || null,
        birth_date: p.birth_date || null,
        height: p.height || null,
        weight: p.weight || null,
        avatar_url: p.avatar_url || null,
        isStaff: false
      }));

      const combined = [...mappedCoaches, ...mappedPlayers];
      const sorted = combined.sort((a, b) => {
        if (a.isStaff && !b.isStaff) return -1;
        if (!a.isStaff && b.isStaff) return 1;
        const nameA = a.last_name || a.first_name || '';
        const nameB = b.last_name || b.first_name || '';
        return nameA.localeCompare(nameB);
      });

      setMembers(sorted);
    } catch (err: any) {
      toast.error("Error al cargar la plantilla: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularEdad = (fechaNacimiento: string | null) => {
    if (!fechaNacimiento) return "-";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-right" />
      
      {/* HEADER IDÉNTICO A LA VISTA ADMIN */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Plantilla Actual</h2>
          <p className="text-sm text-slate-500">{teamName ? `Equipo: ${teamName}` : 'Cargando equipo...'}</p>
        </div>
      </div>

      {/* TABLA DESKTOP (idéntica a la vista admin pero de solo lectura) */}
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Cargando plantilla...</p>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-medium text-lg">Sin miembros</p>
                    <p className="text-slate-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr 
                    key={member.id} 
                    className="bg-white shadow-sm hover:shadow-md transition-all group cursor-default"
                  >
                    <td className="px-6 py-4 rounded-l-xl border-y border-l border-gray-200">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-xs">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.first_name}
                            className="w-full h-full object-cover object-[center_25%]"
                          />
                        ) : (
                          <User className={`w-5 h-5 ${member.isStaff ? 'text-blue-500' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-y border-gray-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 flex items-center gap-2 text-base">
                          {member.first_name} {member.last_name}
                          {member.dorsal && (
                            <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                              {member.dorsal}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-y border-gray-200">
                      <span className="capitalize font-bold text-slate-700">
                        {member.isStaff ? (member.posicion || 'Cuerpo Técnico') : (member.posicion_principal || '-')}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-y border-gray-200">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center capitalize ${
                          member.isStaff ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          ['admin', 'coordinador'].includes(member.posicion?.toLowerCase() || '') ? 'bg-purple-50 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {member.isStaff ? (member.posicion || 'Entrenador') : 'Jugador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 border-y border-r border-gray-200 rounded-r-xl">
                      {member.birth_date ? (
                        <div className="flex flex-col">
                          <span className="font-bold">{calcularEdad(member.birth_date)}</span>
                          {member.height && member.weight && (
                            <span className="text-sm font-semibold text-slate-500 mt-0.5">
                              {member.height}m / {member.weight}kg
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TARJETAS MÓVIL (idénticas a la vista admin pero de solo lectura) */}
      <div className="md:hidden flex flex-col gap-5 pb-10">
        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Cargando plantilla...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-900 font-medium text-lg">Sin miembros</p>
            <p className="text-slate-500 mt-1">No hay miembros registrados en este equipo todavía.</p>
          </div>
        ) : (
          members.map((member) => (
            <div 
              key={member.id}
              className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(37,99,235,0.22)] border border-blue-200/80 hover:shadow-[0_12px_35px_rgba(37,99,235,0.3)] relative overflow-hidden transition-all cursor-default"
            >
              <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                <span className="text-7xl font-black text-slate-900 italic">
                  {member.dorsal || '-'}
                </span>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex gap-4 items-center flex-1 min-w-0">
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center flex-shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.first_name}
                        className="w-full h-full object-cover object-[center_25%]"
                      />
                    ) : (
                      <User className={`w-9 h-9 ${member.isStaff ? 'text-blue-500' : 'text-slate-400'}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-slate-900 font-bold text-lg leading-tight break-words">
                      {member.first_name} {member.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {member.isStaff ? (
                        <span className="text-blue-700 text-xs font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          {member.posicion || 'Cuerpo Técnico'}
                        </span>
                      ) : (
                        <>
                          <span className="text-emerald-700 text-xs font-semibold capitalize bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                            {member.posicion_principal || 'Sin posición'}
                          </span>
                          {member.posicion && member.posicion.toLowerCase() !== 'jugador' && member.posicion !== member.posicion_principal && (
                            <span className="text-purple-700 text-xs font-semibold capitalize bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">
                              {member.posicion}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {member.dorsal && (
                  <div className="flex flex-col items-center justify-center min-w-10 px-2.5 py-1 bg-slate-900 text-white rounded-xl shadow-xs ml-3 flex-shrink-0">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 leading-none">Dorsal</span>
                    <span className="text-base font-black leading-tight">{member.dorsal}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs relative z-10">
                <div className="text-slate-500">
                  <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Físico</span>
                  <span className="text-slate-900 font-medium">
                    {member.birth_date ? `${calcularEdad(member.birth_date)}` : '-'}
                    {member.height && member.weight ? ` • ${member.height}m / ${member.weight}kg` : ''}
                  </span>
                </div>
                <div className="text-slate-500">
                  <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Posición</span>
                  <span className="text-slate-900 font-medium truncate block">
                    {member.isStaff ? (member.posicion || 'Cuerpo Técnico') : (member.posicion_principal || 'Jugador')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
