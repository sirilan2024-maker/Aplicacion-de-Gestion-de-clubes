"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchClubPeopleWizardAction } from "@/app/actions/club-actions";
import { ChevronRight, ArrowLeft, Save, Plus, Trash2, Users, Calendar, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

interface SeasonData {
  name: string;
  startDate: string;
  endDate: string;
}

interface TeamClone {
  tempId: string;
  name: string;
  category: string;
  isNew: boolean;
  cloneFromId?: string;
  oldName?: string;
}

interface PersonAssignment {
  id: string;
  type: 'player' | 'coach';
  name: string;
  oldTeamId: string | null;
  oldTeamName: string | null;
  newTeamTempId: string; // 'unassigned' or tempId
  birthDate?: string | null;
  recommendedCategory?: string;
}

export default function NewSeasonWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  // Data State
  const [seasonData, setSeasonData] = useState<SeasonData>({ name: "", startDate: "", endDate: "" });
  const [teams, setTeams] = useState<TeamClone[]>([]);
  const [people, setPeople] = useState<PersonAssignment[]>([]);

  // Raw data from DB to help mapping
  const [oldTeams, setOldTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
    if (!profile?.club_id) return;
    setClubId(profile.club_id);

    // Fetch active season teams
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single();
    
    if (activeSeason) {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('season_id', activeSeason.id);
      if (teamsData) {
        setOldTeams(teamsData);
        // Pre-fill teams state with clones
        setTeams(teamsData.map(t => ({
          tempId: `clone_${t.id}`,
          name: t.name,
          category: t.category,
          isNew: false,
          cloneFromId: t.id,
          oldName: t.name
        })));

        // Fetch all active players and coaches via Server Action to bypass RLS
        const { players: playersData, coaches: coachesData } = await fetchClubPeopleWizardAction(profile.club_id);

        // Fetch coach assignments to know their current team
        const { data: tc } = await supabase
          .from('team_coaches')
          .select('profile_id, team_id')
          .eq('season_id', activeSeason.id);

        const loadedPeople: PersonAssignment[] = [];
        
        const refYear = seasonData.startDate ? parseInt(seasonData.startDate.substring(0, 4)) : new Date().getFullYear();
        
        const getRecommendedCategory = (birthDate: string | null) => {
          if (!birthDate) return 'Desconocida';
          const birthYear = parseInt(birthDate.substring(0, 4));
          const age = refYear - birthYear;
          if (age <= 5) return 'Querubín';
          if (age >= 6 && age <= 7) return 'Prebenjamín';
          if (age >= 8 && age <= 9) return 'Benjamín';
          if (age >= 10 && age <= 11) return 'Alevín';
          if (age >= 12 && age <= 13) return 'Infantil';
          if (age >= 14 && age <= 15) return 'Cadete';
          if (age >= 16 && age <= 18) return 'Juvenil';
          return 'Amateur/Senior';
        };

        playersData?.forEach((p: any) => {
          const oldTeam = teamsData.find(t => t.id === p.team_id);
          loadedPeople.push({
            id: p.id,
            type: 'player',
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador',
            oldTeamId: p.team_id,
            oldTeamName: oldTeam?.name || 'Sin equipo',
            newTeamTempId: p.team_id ? `clone_${p.team_id}` : 'unassigned', // auto-assign to cloned team
            birthDate: p.birth_date,
            recommendedCategory: getRecommendedCategory(p.birth_date)
          });
        });

        coachesData?.forEach((c: any) => {
          const currentAssignment = tc?.find(t => t.profile_id === c.id);
          const oldTeam = teamsData.find(t => t.id === currentAssignment?.team_id);
          loadedPeople.push({
            id: c.id,
            type: 'coach',
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Entrenador',
            oldTeamId: currentAssignment?.team_id || null,
            oldTeamName: oldTeam?.name || 'Sin equipo',
            newTeamTempId: currentAssignment?.team_id ? `clone_${currentAssignment.team_id}` : 'unassigned'
          });
        });

        setPeople(loadedPeople.sort((a,b) => a.name.localeCompare(b.name)));
      }
    }
    
    setLoading(false);
  };

  const handleAddTeam = () => {
    setTeams([...teams, {
      tempId: `new_${Date.now()}`,
      name: "Nuevo Equipo",
      category: "",
      isNew: true
    }]);
  };

  const handleRemoveTeam = (tempId: string) => {
    setTeams(teams.filter(t => t.tempId !== tempId));
    // Unassign people who were assigned to this team
    setPeople(people.map(p => p.newTeamTempId === tempId ? { ...p, newTeamTempId: 'unassigned' } : p));
  };

  const handleUpdateTeam = (tempId: string, field: keyof TeamClone, value: string) => {
    setTeams(teams.map(t => t.tempId === tempId ? { ...t, [field]: value } : t));
  };

  const handleUpdatePersonAssignment = (personId: string, newTeamTempId: string) => {
    setPeople(people.map(p => p.id === personId ? { ...p, newTeamTempId } : p));
  };

  const executeMigration = async () => {
    if (!clubId) return;
    setSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Archive old active season(s)
      await supabase.from('seasons').update({ is_active: false }).eq('club_id', clubId).eq('is_active', true);

      // 2. Create new season
      const { data: newSeason, error: seasonError } = await supabase.from('seasons').insert({
        club_id: clubId,
        name: seasonData.name,
        start_date: seasonData.startDate,
        end_date: seasonData.endDate,
        is_active: true
      }).select().single();

      if (seasonError || !newSeason) throw new Error("Error al crear la temporada: " + seasonError?.message);

      // 3. Create Teams
      const teamIdMap = new Map<string, string>(); // tempId -> real DB id
      
      for (const t of teams) {
        // Clone other details from original if it's a clone
        const oldTeamData = oldTeams.find(ot => ot.id === t.cloneFromId) || {};
        
        const { data: newTeam, error: teamError } = await supabase.from('teams').insert({
          club_id: clubId,
          season_id: newSeason.id,
          name: t.name,
          category: t.category || oldTeamData.category,
          color: oldTeamData.color || '#1E3A8A'
        }).select().single();

        if (teamError) throw new Error("Error creando equipo: " + teamError.message);
        teamIdMap.set(t.tempId, newTeam.id);
      }

      // 4. Reassign Players
      const playersToInsert = people.filter(p => p.type === 'player' && p.newTeamTempId !== 'unassigned').map(p => {
        const realTeamId = teamIdMap.get(p.newTeamTempId);
        return {
          club_id: clubId,
          season_id: newSeason.id,
          player_id: p.id,
          team_id: realTeamId,
          status: 'active'
        };
      });

      if (playersToInsert.length > 0) {
        const { error: pshError } = await supabase.from('player_season_history').insert(playersToInsert);
        if (pshError) throw new Error("Error reasignando jugadores: " + pshError.message);
        
        // Update players table global team_id for assigned players
        for(const p of playersToInsert) {
           await supabase.from('players').update({ team_id: p.team_id, status: 'active' }).eq('id', p.player_id);
        }
      }

      // Archive unassigned players
      const unassignedPlayers = people.filter(p => p.type === 'player' && p.newTeamTempId === 'unassigned').map(p => p.id);
      if (unassignedPlayers.length > 0) {
        // Marcamos como inactivos (archivados en el sistema) a los que no renovaron
        await supabase.from('players')
          .update({ status: 'inactive', team_id: null })
          .in('id', unassignedPlayers);
      }

      // 5. Reassign Coaches
      const coachesToInsert = people.filter(p => p.type === 'coach' && p.newTeamTempId !== 'unassigned').map(p => {
        const realTeamId = teamIdMap.get(p.newTeamTempId);
        return {
          club_id: clubId,
          season_id: newSeason.id,
          team_id: realTeamId,
          profile_id: p.id,
          role: 'Entrenador'
        };
      });

      if (coachesToInsert.length > 0) {
        const { error: tcError } = await supabase.from('team_coaches').insert(coachesToInsert);
        if (tcError) throw new Error("Error reasignando entrenadores: " + tcError.message);
      }

      toast.success("¡Temporada creada con éxito!");
      router.push("/admin/temporadas");
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ocurrió un error inesperado.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Cargando asistente...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
      {/* Header / Progress bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-6 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/admin/temporadas')} className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> Volver a temporadas
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Calendar className="text-green-500" />
              Asistente de Nueva Temporada
            </h1>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-2.5 w-12 rounded-full transition-colors ${step >= s ? 'bg-green-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 px-6">
        
        {/* STEP 1: FECHAS */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6">Paso 1: Configurar Fechas</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Nombre de la Temporada (Ej. 26/27)</label>
                  <input 
                    type="text" 
                    value={seasonData.name} 
                    onChange={e => setSeasonData({...seasonData, name: e.target.value})}
                    placeholder="26/27"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Fecha de Inicio</label>
                    <input 
                      type="date" 
                      value={seasonData.startDate} 
                      onChange={e => setSeasonData({...seasonData, startDate: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Fecha de Fin</label>
                    <input 
                      type="date" 
                      value={seasonData.endDate} 
                      onChange={e => setSeasonData({...seasonData, endDate: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                disabled={!seasonData.name || !seasonData.startDate || !seasonData.endDate}
                onClick={() => setStep(2)}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
              >
                Continuar a Equipos <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EQUIPOS */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-green-500" />
                  Paso 2: Gestionar Equipos
                </h2>
                <button onClick={handleAddTeam} className="text-green-400 hover:text-green-300 flex items-center gap-1.5 text-sm font-bold bg-green-500/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={16} /> Añadir equipo en blanco
                </button>
              </div>
              
              <p className="text-slate-400 text-sm mb-6">
                Hemos pre-cargado los equipos de la temporada anterior. Puedes cambiarles el nombre (ej. Alevín B → Infantil A) o eliminar los que no continúan.
              </p>

              <div className="space-y-3">
                {teams.map((t) => (
                  <div key={t.tempId} className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-700">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        {t.isNew ? "Nuevo Equipo" : `Viene de: ${t.oldName}`}
                      </label>
                      <input 
                        type="text" 
                        value={t.name}
                        onChange={e => handleUpdateTeam(t.tempId, 'name', e.target.value)}
                        className="w-full bg-transparent text-white font-medium border-b border-slate-700 focus:border-green-500 outline-none pb-1"
                        placeholder="Nombre del equipo"
                      />
                    </div>
                    <button onClick={() => handleRemoveTeam(t.tempId)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No hay equipos. Añade uno.</div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-all">
                Atrás
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-500/20"
              >
                Continuar a Plantillas <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PERSONAS */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <Users className="text-green-500" />
                Paso 3: Reasignar Plantillas
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Selecciona a qué equipo pasará cada jugador y entrenador en esta nueva temporada. Los que marques como "Sin asignar" no tendrán equipo al empezar.
              </p>

              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Nombre</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Categoría Recomendada</th>
                      <th className="px-4 py-3">Temp. Anterior</th>
                      <th className="px-4 py-3 rounded-tr-lg">Nueva Temp.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {people.map(p => (
                      <tr key={`${p.type}-${p.id}`} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${p.type === 'coach' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {p.type === 'coach' ? 'Entrenador' : 'Jugador'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.type === 'player' ? (
                            <span className="text-green-400 font-semibold">{p.recommendedCategory}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {p.oldTeamName}
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={p.newTeamTempId}
                            onChange={(e) => handleUpdatePersonAssignment(p.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded focus:ring-green-500 focus:border-green-500 block p-2 outline-none"
                          >
                            <option value="unassigned">-- Sin asignar --</option>
                            {teams.map(t => (
                              <option key={t.tempId} value={t.tempId}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-all">
                Atrás
              </button>
              <button 
                onClick={() => setStep(4)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-500/20"
              >
                Revisar Resumen <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESUMEN */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Todo listo para empezar</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Estás a punto de iniciar la temporada <strong>{seasonData.name}</strong>. Las temporadas anteriores quedarán archivadas en modo lectura.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-black text-white">{teams.length}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Equipos</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-black text-white">{people.filter(p => p.type === 'player' && p.newTeamTempId !== 'unassigned').length}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Jugadores Asig.</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-black text-white">{people.filter(p => p.type === 'coach' && p.newTeamTempId !== 'unassigned').length}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Cuerpo Técnico</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="text-2xl font-black text-white">{people.filter(p => p.newTeamTempId === 'unassigned').length}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Sin asignar</div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm p-4 rounded-xl text-left flex gap-3">
                <AlertTriangle className="flex-shrink-0 mt-0.5 text-amber-500" size={18} />
                <p>Al confirmar, se creará la nueva arquitectura en la base de datos y tu panel de control cambiará automáticamente a la nueva temporada.</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="text-slate-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-all" disabled={submitting}>
                Atrás
              </button>
              <button 
                onClick={executeMigration}
                disabled={submitting}
                className="bg-green-500 hover:bg-green-400 text-slate-900 font-black py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-green-500/20 disabled:opacity-50"
              >
                {submitting ? "Creando temporada..." : "Empezar nueva temporada"} <Save size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
