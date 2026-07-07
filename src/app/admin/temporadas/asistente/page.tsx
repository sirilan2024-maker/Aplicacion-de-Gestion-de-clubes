"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save, Search, Users, Copy, ArrowLeft, Loader2, CheckSquare } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { bulkEnrollPlayers, cloneTeamsAction } from "@/app/actions/season-actions";
import Link from "next/link";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  posicion: string;
  birth_date: string;
}

interface Team {
  id: string;
  name: string;
  category: string;
}

export default function AsistenteMatriculacionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pastTeams, setPastTeams] = useState<Team[]>([]);
  const [selectedPastTeams, setSelectedPastTeams] = useState<Set<string>>(new Set());
  
  const [activeSeason, setActiveSeason] = useState<{ id: string, name: string } | null>(null);
  
  const [enrollments, setEnrollments] = useState<Record<string, string | null>>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
    if (!profile?.club_id || profile.role !== 'admin') {
      toast.error("No tienes permisos para acceder aquí");
      router.push('/dashboard');
      return;
    }

    // Obtener temporada activa
    const { data: season } = await supabase.from('seasons')
      .select('id, name')
      .eq('club_id', profile.club_id)
      .eq('is_active', true)
      .single();

    if (!season) {
      toast.error("No hay una temporada activa para matricular");
      setLoading(false);
      return;
    }
    setActiveSeason(season);

    // Obtener todos los equipos de la temporada activa
    const { data: teamsData } = await supabase.from('teams')
      .select('id, name, category')
      .eq('season_id', season.id)
      .order('name');
    
    setTeams(teamsData || []);

    // Si hay pocos equipos, buscar los de la temporada anterior para sugerir clonarlos
    if (!teamsData || teamsData.length === 0) {
      const { data: pastSeasons } = await supabase.from('seasons')
        .select('id')
        .eq('club_id', profile.club_id)
        .eq('is_active', false)
        .order('end_date', { ascending: false })
        .limit(1);
        
      if (pastSeasons && pastSeasons.length > 0) {
        const { data: oldTeams } = await supabase.from('teams')
          .select('id, name, category')
          .eq('season_id', pastSeasons[0].id)
          .order('name');
        
        if (oldTeams) {
          setPastTeams(oldTeams);
          setSelectedPastTeams(new Set(oldTeams.map(t => t.id))); // Select all by default
        }
      }
    }

    // Obtener todos los jugadores del club
    const { data: playersData } = await supabase.from('players')
      .select('id, first_name, last_name, posicion, birth_date')
      .eq('club_id', profile.club_id)
      .neq('status', 'inactive')
      .order('first_name');
    
    setPlayers(playersData || []);

    // Obtener historial de la temporada activa para preseleccionar
    const { data: historyData } = await supabase.from('player_season_history')
      .select('player_id, team_id, status')
      .eq('season_id', season.id)
      .eq('status', 'active');

    const initialEnrollments: Record<string, string | null> = {};
    if (historyData) {
      historyData.forEach(h => {
        initialEnrollments[h.player_id] = h.team_id;
      });
    }
    setEnrollments(initialEnrollments);
    
    setLoading(false);
  };

  const handleEnrollmentChange = (playerId: string, teamId: string) => {
    setEnrollments(prev => ({
      ...prev,
      [playerId]: teamId === "" ? null : teamId
    }));
  };

  const handleSave = async () => {
    if (!activeSeason) return;
    setSaving(true);
    
    const payload = Object.entries(enrollments).map(([playerId, teamId]) => ({
      playerId,
      teamId
    }));

    try {
      const res = await bulkEnrollPlayers(activeSeason.id, payload);
      if (res.success) {
        toast.success("Matriculaciones guardadas exitosamente");
      }
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
    
    setSaving(false);
  };

  const handleCloneTeams = async () => {
    if (!activeSeason || selectedPastTeams.size === 0) return;
    setCloning(true);
    try {
      await cloneTeamsAction(activeSeason.id, Array.from(selectedPastTeams));
      toast.success("Equipos clonados exitosamente");
      setPastTeams([]);
      fetchData(); // Recargar para ver los equipos clonados
    } catch (e: any) {
      toast.error("Error al clonar equipos: " + e.message);
    }
    setCloning(false);
  };

  const togglePastTeam = (id: string) => {
    const next = new Set(selectedPastTeams);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPastTeams(next);
  };

  const filteredPlayers = players.filter(p => 
    (p.first_name + " " + p.last_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8">
      <Toaster position="bottom-right" />
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/temporadas" className="text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asistente de Matriculación</h1>
          <p className="text-gray-500 mt-1">Asigna globalmente los jugadores a los equipos para la temporada activa: <strong className="text-blue-600">{activeSeason?.name}</strong></p>
        </div>
      </div>

      {pastTeams.length > 0 && teams.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Copy size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Clonar Equipos de la Temporada Anterior</h3>
              <p className="text-gray-600 mb-4">No hay equipos en la nueva temporada. Selecciona los equipos que deseas crear idénticos (solo su nombre y estructura, sin jugadores).</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {pastTeams.map(t => (
                  <label key={t.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-400 transition-colors shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={selectedPastTeams.has(t.id)}
                      onChange={() => togglePastTeam(t.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-medium text-sm text-slate-700">{t.name} <span className="text-gray-400">({t.category})</span></span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleCloneTeams}
                disabled={cloning || selectedPastTeams.size === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-600/20"
              >
                {cloning ? <Loader2 className="animate-spin" size={18} /> : <CheckSquare size={18} />}
                Clonar {selectedPastTeams.size} Equipos Seleccionados
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar jugador..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || teams.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm shadow-green-600/20"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b">
              <tr>
                <th className="px-6 py-4">Jugador</th>
                <th className="px-6 py-4">Edad / Año</th>
                <th className="px-6 py-4">Posición</th>
                <th className="px-6 py-4 w-64">Equipo Asignado ({activeSeason?.name})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron jugadores.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map(player => {
                  const currentTeamId = enrollments[player.id] || "";
                  return (
                    <tr key={player.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {player.first_name} {player.last_name}
                      </td>
                      <td className="px-6 py-3">
                        {new Date(player.birth_date).getFullYear()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {player.posicion}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <select 
                          className={`w-full border rounded-lg px-3 py-2 outline-none transition-colors ${currentTeamId ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : 'bg-white border-gray-300'}`}
                          value={currentTeamId}
                          onChange={(e) => handleEnrollmentChange(player.id, e.target.value)}
                          disabled={teams.length === 0}
                        >
                          <option value="">-- Sin Asignar --</option>
                          {teams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name} ({team.category})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
