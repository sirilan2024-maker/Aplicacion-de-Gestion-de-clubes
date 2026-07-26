"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Shield } from "lucide-react";
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

      // 2. Fetch all teammates (ONLY public fields: id, name, position, avatar, birth_date)
      const { data: roster, error: rosterError } = await supabase
        .from('players')
        .select('id, first_name, last_name, nickname, avatar_url, posicion_principal, dorsal, birth_date')
        .eq('team_id', player.team_id)
        .order('first_name');
        
      if (rosterError) throw rosterError;
      const coachesData = await getTeamCoachesProfilesAction(player.team_id);
      
      const coaches = (coachesData || [])
        .map((tc: any) => tc.profiles)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          nickname: null,
          avatar_url: c.avatar_url,
          posicion: c.role === 'coordinador' ? 'Coordinador' : 'Entrenador',
          dorsal: null,
          birth_date: null,
          memberType: 'staff'
        }));
        
      const players = (roster || []).map(p => ({...p, posicion: p.posicion_principal, memberType: 'player'}));
      setTeammates([...coaches, ...players]);
      
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
    return age;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantilla del Equipo</h1>
          <p className="text-gray-500 text-sm">Compañeros de {teamName}</p>
        </div>
      </div>

      {!teammates.length ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500">No hay jugadores registrados en este equipo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="p-4 pl-6 text-center w-16">Foto</th>
                  <th className="p-4">Jugador</th>
                  <th className="p-4 text-center">Dorsal</th>
                  <th className="p-4 text-center">Posición</th>
                  <th className="p-4 text-center">Edad</th>
                  <th className="p-4 text-center pr-6">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teammates.map((mate) => (
                  <tr key={mate.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="w-10 h-10 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 mx-auto">
                        {mate.avatar_url ? (
                          <img src={mate.avatar_url} alt={mate.first_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900 leading-tight">
                        {mate.first_name} {mate.last_name}
                      </div>
                      {mate.nickname && (
                        <div className="text-xs text-gray-500 italic">"{mate.nickname}"</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {mate.dorsal ? (
                        <span className="w-8 h-8 mx-auto bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center font-bold text-sm">
                          {mate.dorsal}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                        {mate.posicion || 'ND'}
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm font-medium text-gray-700">
                      {calculateAge(mate.birth_date)}
                    </td>
                    <td className="p-4 text-center pr-6">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${mate.memberType === 'staff' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                        {mate.memberType === 'staff' ? 'Cuerpo Técnico' : 'Jugador'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
