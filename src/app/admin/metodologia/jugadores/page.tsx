"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Target, Plus, X, Activity, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function MetodologiaJugadoresPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");

  // Objectives Modal
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [playerObjectives, setPlayerObjectives] = useState<any[]>([]);
  const [newObjType, setNewObjType] = useState("táctico");
  const [newObjDesc, setNewObjDesc] = useState("");
  const [isAddingObj, setIsAddingObj] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes, attendanceRes, objectivesRes] = await Promise.all([
        supabase.from("players").select("*, teams(id, name, category)"),
        supabase.from("teams").select("id, name, category"),
        supabase.from("attendance").select("player_id, status"),
        supabase.from("player_objectives").select("player_id, status")
      ]);

      const attCountMap: Record<string, { present: number; total: number }> = {};
      (attendanceRes.data || []).forEach((a: any) => {
        if (!attCountMap[a.player_id]) attCountMap[a.player_id] = { present: 0, total: 0 };
        attCountMap[a.player_id].total += 1;
        if (a.status === 'present') attCountMap[a.player_id].present += 1;
      });

      const objCountMap: Record<string, { completed: number; total: number }> = {};
      (objectivesRes.data || []).forEach((o: any) => {
        if (!objCountMap[o.player_id]) objCountMap[o.player_id] = { completed: 0, total: 0 };
        objCountMap[o.player_id].total += 1;
        if (o.status === 'conseguido') objCountMap[o.player_id].completed += 1;
      });

      if (playersRes.data) {
        const enriched = playersRes.data.map((p: any) => ({
          ...p,
          attendanceRate: attCountMap[p.id]?.total ? Math.round((attCountMap[p.id].present / attCountMap[p.id].total) * 100) : 100,
          totalSessions: attCountMap[p.id]?.total || 0,
          completedObjs: objCountMap[p.id]?.completed || 0,
          totalObjs: objCountMap[p.id]?.total || 0
        }));
        setPlayers(enriched);
      }
      if (teamsRes.data) setTeams(teamsRes.data);
    } catch (error) {
      console.error("Error fetching players data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenObjectives = async (player: any) => {
    setSelectedPlayer(player);
    try {
      const { data } = await supabase
        .from("player_objectives")
        .select("*")
        .eq("player_id", player.id)
        .order("created_at", { ascending: false });
      setPlayerObjectives(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateObjective = async () => {
    if (!newObjDesc || !selectedPlayer) return;
    setIsAddingObj(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let clubId = userData.user?.user_metadata?.club_id;
      if (!clubId && userData.user) {
        const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", userData.user.id).single();
        clubId = profile?.club_id;
      }
      if (!clubId && selectedPlayer.team_id) {
        const { data: team } = await supabase.from("teams").select("club_id").eq("id", selectedPlayer.team_id).single();
        clubId = team?.club_id;
      }

      const { data, error } = await supabase.from("player_objectives").insert({
        player_id: selectedPlayer.id,
        club_id: clubId,
        objective_type: newObjType,
        description: newObjDesc,
        status: "pendiente"
      }).select().single();

      if (data) {
        setPlayerObjectives(prev => [data, ...prev]);
        setNewObjDesc("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingObj(false);
    }
  };

  const handleToggleStatus = async (objId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "conseguido" ? "en_progreso" : "conseguido";
    try {
      await supabase.from("player_objectives").update({ status: nextStatus }).eq("id", objId);
      setPlayerObjectives(prev => prev.map(o => o.id === objId ? { ...o, status: nextStatus } : o));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPlayers = players.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || (p.position && p.position.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTeam = selectedTeam === "all" || p.team_id === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
              Desarrollo Individual
            </span>
            <span className="text-slate-400 text-xs font-bold">• Matriz Metodológica</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Perfiles Metodológicos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Seguimiento de objetivos formativos individuales e indicadores de progresión</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de jugador o posición..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px] text-slate-700"
          >
            <option value="all">Todos los Equipos</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          No se encontraron jugadores que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => {
            const initials = `${player.first_name?.[0] || 'J'}${player.last_name?.[0] || ''}`;
            const teamName = player.teams?.name || "Sin equipo";
            const category = player.teams?.category || "General";

            return (
              <div key={player.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm group hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-black flex items-center justify-center border border-blue-100 text-base">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {player.first_name} {player.last_name}
                        </h3>
                        <p className="text-xs font-bold text-slate-400">
                          {teamName} • {player.position || 'Jugador'} {player.dorsal ? `• #${player.dorsal}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asistencia</span>
                      <span className="text-xs font-black text-slate-800">{player.attendanceRate}% ({player.totalSessions} ses)</span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Objetivos</span>
                      <span className="text-xs font-black text-emerald-600">{player.completedObjs} / {player.totalObjs} logrados</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => handleOpenObjectives(player)} 
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl py-2 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <Target className="w-3.5 h-3.5 text-blue-600" /> Objetivos
                  </button>
                  <Link 
                    href={`/dashboard/equipos/${player.team_id || 1}/jugador/${player.id}`} 
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl py-2 flex justify-center items-center gap-1.5 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5" /> Ficha
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OBJECTIVES MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase text-blue-600">Plan de Desarrollo Individual</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {selectedPlayer.first_name} {selectedPlayer.last_name}
                </h3>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new objective form */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                + Asignar Nuevo Objetivo
              </span>
              <div className="grid grid-cols-3 gap-2">
                <select 
                  value={newObjType} 
                  onChange={e => setNewObjType(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="técnico">Técnico</option>
                  <option value="táctico">Táctico</option>
                  <option value="físico">Físico</option>
                  <option value="cognitivo">Cognitivo</option>
                  <option value="psicosocial">Psicosocial</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Descripción del objetivo..." 
                  value={newObjDesc}
                  onChange={e => setNewObjDesc(e.target.value)}
                  className="col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCreateObjective}
                disabled={!newObjDesc || isAddingObj}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all"
              >
                Guardar Objetivo
              </button>
            </div>

            {/* Objectives List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {playerObjectives.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin objetivos asignados todavía.</p>
              ) : (
                playerObjectives.map(obj => (
                  <div 
                    key={obj.id} 
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                      obj.status === 'conseguido' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {obj.objective_type}
                      </span>
                      <p className={`font-bold mt-1 text-slate-800 ${obj.status === 'conseguido' ? 'line-through opacity-70' : ''}`}>
                        {obj.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(obj.id, obj.status)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        obj.status === 'conseguido' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {obj.status === 'conseguido' ? 'Conseguido' : 'Pendiente'}
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
