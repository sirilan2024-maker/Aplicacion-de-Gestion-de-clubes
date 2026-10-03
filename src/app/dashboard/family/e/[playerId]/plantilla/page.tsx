"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Shield, Users, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getTeamCoachesProfilesAction } from "@/app/actions/team-actions";

export default function FamilyTeamRosterPage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [teammates, setTeammates] = useState<any[]>([]);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    fetchRoster();
  }, [playerId]);

  const fetchRoster = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      // 1. Get the player's team ID
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
        
      if (playerError) throw playerError;
      
      if (!player.team_id) {
        setLoading(false);
        return; // Player is not in a team
      }

      setTeamName((player.teams as any)?.name || "Equipo");

      // 2. Fetch all teammates (public fields: id, name, position, avatar, birth_date, height, weight)
      const { data: roster, error: rosterError } = await supabase
        .from('players')
        .select('id, first_name, last_name, nickname, avatar_url, posicion, posicion_principal, dorsal, birth_date, height, weight')
        .eq('team_id', player.team_id)
        .order('first_name');
        
      if (rosterError) throw rosterError;
      const coachesData = await getTeamCoachesProfilesAction(player.team_id);
      
      const coaches = (coachesData || [])
        .map((tc: any) => tc.profiles)
        .filter(Boolean)
        .map((c: any) => {
          const staffRole = c.role === 'coordinador' ? 'Coordinador' : 'Entrenador';
          return {
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            nickname: null,
            avatar_url: c.avatar_url,
            posicion: staffRole,
            posicion_principal: staffRole,
            dorsal: null,
            birth_date: null,
            height: null,
            weight: null,
            memberType: 'staff'
          };
        });
        
      const players = (roster || []).map(p => ({
        ...p,
        posicion: p.posicion || p.posicion_principal || 'Jugador',
        posicion_principal: p.posicion_principal || p.posicion || 'Jugador',
        memberType: 'player'
      }));

      const combined = [...coaches, ...players];
      const sorted = combined.sort((a, b) => {
        const isCoachA = a.memberType === 'staff';
        const isCoachB = b.memberType === 'staff';
        if (isCoachA && !isCoachB) return -1;
        if (!isCoachA && isCoachB) return 1;
        const nameA = a.last_name || a.first_name || '';
        const nameB = b.last_name || b.first_name || '';
        return nameA.localeCompare(nameB);
      });

      setTeammates(sorted);
      
    } catch (err: any) {
      toast.error("Error al cargar la plantilla: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 sm:p-3 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Plantilla del Equipo</h1>
          <p className="text-gray-500 text-xs sm:text-sm">{teamName ? `Miembros de ${teamName}` : 'Cargando equipo...'}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Cargando plantilla...</p>
        </div>
      ) : !teammates.length ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-900 font-medium text-lg">Sin miembros</p>
          <p className="text-slate-500 mt-1 text-sm">No hay jugadores registrados en este equipo todavía.</p>
        </div>
      ) : (
        <>
          {/* TABLA DESKTOP (hidden md:block) */}
          <div className="hidden md:block pb-10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 border-separate border-spacing-y-3">
                <thead className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] px-2">
                  <tr>
                    <th className="px-6 py-2">Foto</th>
                    <th className="px-6 py-2">Jugador</th>
                    <th className="px-6 py-2 text-center">Dorsal</th>
                    <th className="px-6 py-2">Posición</th>
                    <th className="px-6 py-2">Rol</th>
                    <th className="px-6 py-2">Edad / Físico</th>
                  </tr>
                </thead>
                <tbody>
                  {teammates.map((mate) => {
                    const esEntrenador = mate.memberType === 'staff';
                    return (
                      <tr 
                        key={mate.id} 
                        className="bg-white shadow-sm hover:shadow-md transition-all group"
                      >
                        <td className="px-6 py-4 rounded-l-xl border-y border-l border-gray-200 group-hover:border-gray-300">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-xs">
                            {mate.avatar_url ? (
                              <img
                                src={mate.avatar_url}
                                alt={mate.first_name}
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
                              {mate.first_name} {mate.last_name}
                            </span>
                            {mate.nickname && (
                              <span className="text-xs text-gray-500 italic">"{mate.nickname}"</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300 text-center">
                          {mate.dorsal ? (
                            <span className="inline-flex items-center justify-center text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md min-w-7">
                              {mate.dorsal}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300">
                          <span className="capitalize font-bold text-slate-700">
                            {esEntrenador ? (mate.posicion || 'Cuerpo Técnico') : (mate.posicion_principal || '-')}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-y border-gray-200 group-hover:border-gray-300">
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center capitalize ${
                              esEntrenador ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {esEntrenador ? (mate.posicion || 'Cuerpo Técnico') : 'Jugador'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 border-y border-r border-gray-200 group-hover:border-gray-300 rounded-r-xl">
                          {mate.birth_date ? (
                            <div className="flex flex-col">
                              <span className="font-bold">{calculateAge(mate.birth_date)}</span>
                              {mate.height && mate.weight && (
                                <span className="text-sm font-semibold text-slate-500 mt-0.5">
                                  {mate.height}m / {mate.weight}kg
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TARJETAS MÓVIL (md:hidden) - SIN SCROLL HORIZONTAL, ADAPTADO A MÓVIL COMO EN VISTA ADMIN */}
          <div className="md:hidden flex flex-col gap-4 pb-10">
            {teammates.map((mate) => {
              const esEntrenador = mate.memberType === 'staff';
              return (
                <div 
                  key={mate.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(37,99,235,0.22)] border border-blue-200/80 hover:shadow-[0_12px_35px_rgba(37,99,235,0.3)] relative overflow-hidden transition-all"
                >
                  {/* Marca de agua dorsal */}
                  <div className="absolute top-0 right-0 p-3 opacity-[0.03] select-none pointer-events-none">
                    <span className="text-7xl font-black text-slate-900 italic">
                      {mate.dorsal || '-'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex gap-3 sm:gap-4 items-center flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center flex-shrink-0">
                        {mate.avatar_url ? (
                          <img
                            src={mate.avatar_url}
                            alt={mate.first_name}
                            className="w-full h-full object-cover object-[center_25%]"
                          />
                        ) : (
                          <User className={`w-8 h-8 sm:w-9 sm:h-9 ${esEntrenador ? 'text-blue-500' : 'text-slate-400'}`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-slate-900 font-bold text-base sm:text-lg leading-tight break-words">
                          {mate.first_name} {mate.last_name}
                        </h3>
                        {mate.nickname && (
                          <p className="text-xs text-slate-500 italic mt-0.5">"{mate.nickname}"</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {esEntrenador ? (
                            <span className="text-blue-700 text-xs font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                              {mate.posicion || 'Cuerpo Técnico'}
                            </span>
                          ) : (
                            <>
                              <span className="text-emerald-700 text-xs font-semibold capitalize bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                                {mate.posicion_principal || mate.posicion || 'Sin posición'}
                              </span>
                              {mate.posicion && mate.posicion.toLowerCase() !== 'jugador' && mate.posicion !== mate.posicion_principal && (
                                <span className="text-purple-700 text-xs font-semibold capitalize bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">
                                  {mate.posicion}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dorsal a la derecha */}
                    {mate.dorsal && (
                      <div className="flex flex-col items-center justify-center min-w-10 px-2.5 py-1 bg-slate-900 text-white rounded-xl shadow-xs ml-2 sm:ml-3 flex-shrink-0">
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 leading-none">Dorsal</span>
                        <span className="text-base font-black leading-tight">{mate.dorsal}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs relative z-10">
                    <div className="text-slate-500">
                      <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Físico</span>
                      <span className="text-slate-900 font-medium">
                        {mate.birth_date ? calculateAge(mate.birth_date) : '-'}
                        {mate.height && mate.weight ? ` · ${mate.height}m / ${mate.weight}kg` : ''}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-70 mb-0.5">Rol / Posición</span>
                      <span className="text-slate-900 font-medium truncate block">
                        {esEntrenador ? (mate.posicion || 'Cuerpo Técnico') : (mate.posicion_principal || mate.posicion || 'Jugador')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
