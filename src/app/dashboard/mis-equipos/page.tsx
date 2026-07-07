"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, UserPlus, MoreHorizontal, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import SeasonAlertBanner from "@/components/season/SeasonAlertBanner";
import RoleGuard from "@/components/RoleGuard";
import { SPORTS, GENDERS, AGE_GROUPS, FORMATS, COLORS } from "@/lib/constants";

// Types
interface Team {
  id: string;
  name: string;
  category: string;
  members: number;
  coaches: number;
  color: string;
  sport?: string;
  gender?: string;
  age_group?: string;
  format?: string;
  ffcv_url?: string;
}

// Edit-Team modal (inline)
function EditTeamModal({
  open,
  onClose,
  team,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  team: Team;
  onUpdate: (updatedTeam: Team) => Promise<void>;
}) {
  const [name, setName] = useState(team.name);
  const [category, setCategory] = useState(team.category);
  const [members, setMembers] = useState(String(team.members));
  const [coaches, setCoaches] = useState(String(team.coaches));
  const [sport, setSport] = useState(team.sport);
  const [gender, setGender] = useState(team.gender);
  const [ageGroup, setAgeGroup] = useState(team.age_group);
  const [format, setFormat] = useState(team.format);
  const [color, setColor] = useState(team.color);
  const [ffcvUrl, setFfcvUrl] = useState(team.ffcv_url || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onUpdate({
      ...team,
      name,
      category,
      members: Number(members) || 0,
      coaches: Number(coaches) || 0,
      sport,
      gender,
      age_group: ageGroup,
      format,
      color,
      ffcv_url: ffcvUrl,
    });
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-labelledby="edit-team-title">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="edit-team-title" className="text-xl font-bold text-slate-900">Editar equipo</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Nombre</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400 p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Categoría</label>
            <input required value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400 p-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Deporte</label>
              <select value={sport} onChange={e => setSport(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 p-2">
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Color</label>
              <select value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 p-2">
                {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button disabled={submitting} type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Guardando…" : "Actualizar equipo"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MisEquiposPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTeams([]); setLoading(false); return; }

      // Fetch user profile to get club_id and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id, role")
        .eq("id", user.id)
        .single();
        
      if (!profile?.club_id) { setTeams([]); setLoading(false); return; }

      // Fetch the active season to filter teams correctly
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('club_id', profile.club_id)
        .eq('is_active', true)
        .single();

      let query = supabase
        .from('teams')
        .select(`
          id, name, category, color, team_coaches(count),
          player_season_history(
            status,
            season_id,
            players(posicion)
          )
        `)
        .eq("club_id", profile.club_id);

      if (activeSeason?.id) {
        query = query.eq("season_id", activeSeason.id);
      }
      
      query = query.order("name");
        
      // Filter for this coach
      // Since they are on 'mis-equipos', they should only see their assigned teams.
      const { data: coachTeams } = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
      const teamIds = coachTeams?.map(ct => ct.team_id) || [];
      if (teamIds.length > 0) {
        query = query.or(`coach_id.eq.${user.id},id.in.(${teamIds.join(',')})`);
      } else {
        query = query.eq('coach_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
         console.error(error.message || error);
      } else {
        const mapped = (data as any[]).map((t) => {
          let membersCount = 0;
          let coachesCount = t.team_coaches?.[0]?.count || 0;
          
          // Filter history manually
          const activeHistory = t.player_season_history?.filter((h: any) => 
            (!h.season_id || h.season_id === activeSeason?.id) && h.status !== 'inactive'
          ) || [];
          
          activeHistory.forEach((h: any) => {
            const pos = h.players?.posicion?.toLowerCase() || '';
            const isCoach = pos.includes('entrenador') || pos.includes('delegado') || pos.includes('técnico');
            if (isCoach) coachesCount++;
            else membersCount++;
          });

          return {
            id: t.id,
            name: t.name,
            category: t.category,
            members: membersCount,
            coaches: coachesCount,
            color: t.color,
          };
        });
        setTeams(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (updatedTeam: Team) => {
    const supabase = createClient();
    const { error } = await supabase.from('teams').update({
      name: updatedTeam.name,
      category: updatedTeam.category,
      color: updatedTeam.color,
    }).eq('id', updatedTeam.id);

    if (error) {
      console.error("Error updating team:", error.message);
    } else {
      setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['entrenador', 'coach', 'delegado']}>
      <div className="w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
        <SeasonAlertBanner />
        <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-blue-900">Mis Equipos</h1>
        </div>

        <div className="flex max-w-md items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar mis equipos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-l-md border border-gray-300 bg-white px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Skeleton className="h-6 w-48" />
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => router.push(`/dashboard/equipos/${team.id}/plantilla`)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg shadow-sm border-l-4 cursor-pointer hover:bg-gray-50 transition-colors relative"
                style={{ borderLeftColor: team.color || '#1E40AF' }}
              >
                {/* ── Bloque 1: Logo + Info ── */}
                <div className="flex items-center flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center mr-4 shrink-0 group-hover:bg-blue-50 transition-colors">
                    <User className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <h2 className="text-black font-bold uppercase text-base leading-tight truncate group-hover:text-blue-700 transition-colors">
                      {team.name}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      {team.category}
                    </p>
                  </div>
                </div>

                {/* Contenedor derecho para escritorio (y fila inferior para móvil) */}
                <div className="flex items-center justify-between sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                  {/* ── Bloque 2: Contadores ── */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto sm:mx-4 px-2 sm:px-0">
                    <div className="flex items-center">
                      {/* Mini avatars */}
                      <div className="flex -space-x-1 mr-2 hidden sm:flex">
                        {[...Array(Math.min(team.members || 0, 3))].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-400" />
                          </div>
                        ))}
                        {(team.members || 0) === 0 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white hidden sm:block" />
                        )}
                      </div>
                      <span className="text-gray-800 text-sm font-medium">
                        {team.members ?? 0} <span className="sm:hidden">Jug.</span><span className="hidden sm:inline">miembros</span>
                      </span>
                    </div>
                    <div className="flex items-center mt-0 sm:mt-1">
                      <div className="flex -space-x-1 mr-2 hidden sm:flex">
                        {[...Array(Math.min(team.coaches || 0, 2))].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-400" />
                          </div>
                        ))}
                        {(team.coaches || 0) === 0 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white hidden sm:block" />
                        )}
                      </div>
                      <span className="text-gray-800 text-sm font-medium">
                        {team.coaches ?? 0} <span className="sm:hidden">Entr.</span><span className="hidden sm:inline">entrenadores</span>
                      </span>
                    </div>
                  </div>

                  {/* ── Bloque 3: Acciones ── */}
                  <div className="sm:border-l sm:border-gray-300 sm:pl-4 sm:ml-2 flex flex-row items-center space-x-4 shrink-0 relative pr-2 sm:pr-0">
                    <UserPlus
                      className="text-gray-600 hover:text-black cursor-pointer w-5 h-5 transition-colors"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/equipos/${team.id}/anadir-miembros`); }}
                    />
                    <MoreHorizontal
                      className="text-gray-600 hover:text-black cursor-pointer w-5 h-5 transition-colors"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === team.id ? null : team.id); }}
                    />
                    {openMenuId === team.id && (
                      <div className="absolute right-0 top-7 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditTeam(team); setOpenMenuId(null); }}
                        >
                          Editar Equipo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTeams.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No tienes equipos asignados actualmente.
              </div>
            )}
          </div>
        )}
      </div>

      {editTeam && (
        <EditTeamModal
          open={!!editTeam}
          team={editTeam}
          onClose={() => setEditTeam(null)}
          onUpdate={handleUpdateTeam}
        />
      )}
    </RoleGuard>
  );
}
