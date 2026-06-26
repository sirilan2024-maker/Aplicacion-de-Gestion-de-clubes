// src/app/dashboard/equipos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X, Search, UserPlus, MoreHorizontal, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { Suspense } from "react";
import { SPORTS, GENDERS, AGE_GROUPS, FORMATS, COLORS } from "@/lib/constants";
import { importSportingSaladarData } from "@/lib/import-actions";

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

// Create-Team modal (inline – no extra file needed for the beta)
function CreateTeamModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (newTeam: Omit<Team, "id">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [members, setMembers] = useState("");
  const [coaches, setCoaches] = useState("");
  const [ffcvUrl, setFfcvUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) return;
    setSubmitting(true);
    await onCreate({
      name,
      category,
      members: Number(members) || 0,
      coaches: Number(coaches) || 0,
      sport: SPORTS[0],
      gender: GENDERS[0],
      age_group: AGE_GROUPS[0],
      format: FORMATS[0],
      color: COLORS[0].value,
      ffcv_url: ffcvUrl,
    });
    // Reset form
    setName("");
    setCategory("");
    setMembers("");
    setCoaches("");
    setFfcvUrl("");
    setSubmitting(false);
    onClose();
  };

  // Fade‑in/out + backdrop
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      aria-labelledby="create-team-title"
    >
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="create-team-title" className="text-xl font-bold text-slate-900">Crear un nuevo equipo</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200" aria-label="Cerrar">
          <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Nombre del equipo</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Categoría (ej. “Fútbol Masculino”)</label>
            <input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Nº de jugadores</label>
              <input
                type="number"
                min={0}
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Nº de entrenadores</label>
              <input
                type="number"
                min={0}
                value={coaches}
                onChange={(e) => setCoaches(e.target.value)}
                className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Enlace Público FFCV (Opcional)</label>
            <input
              type="url"
              value={ffcvUrl}
              onChange={(e) => setFfcvUrl(e.target.value)}
              placeholder="https://www.ffcv.es/ncompeticiones/..."
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Crear equipo"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddPlayerModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (player: { name: string; position: string; dorsal: number }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("Portero");
  const [dorsal, setDorsal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !position || !dorsal) return;
    setSubmitting(true);
    await onAdd({ name, position, dorsal: Number(dorsal) });
    setName("");
    setPosition("Portero");
    setDorsal("");
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-labelledby="add-player-title">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="add-player-title" className="text-xl font-bold text-slate-900">Añadir jugador</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200" aria-label="Cerrar">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Nombre completo</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 p-2 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Posición</label>
            <select value={position} onChange={e => setPosition(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 p-2 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none">
              <option className="text-slate-900">Portero</option>
              <option className="text-slate-900">Defensa</option>
              <option className="text-slate-900">Medio</option>
              <option className="text-slate-900">Delantero</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Dorsal</label>
            <input type="number" min={0} required value={dorsal} onChange={e => setDorsal(e.target.value)} className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 p-2 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button disabled={submitting} type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {submitting ? "Guardando…" : "Añadir jugador"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
// Edit-Team modal (inline – similar to create modal)
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      aria-labelledby="edit-team-title"
    >
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="edit-team-title" className="text-xl font-bold text-slate-900">
            Editar equipo
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200" aria-label="Cerrar">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Nombre</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Categoría</label>
            <input
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Jugadores</label>
              <input
                type="number"
                min={0}
                value={members}
                onChange={e => setMembers(e.target.value)}
                className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Entrenadores</label>
              <input
                type="number"
                min={0}
                value={coaches}
                onChange={e => setCoaches(e.target.value)}
                className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Deporte</label>
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s} className="text-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Género</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g} className="text-slate-900">
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Grupo de edad</label>
            <select
              value={ageGroup}
              onChange={e => setAgeGroup(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300"
            >
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag} className="text-slate-900">
                  {ag}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Formato</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f} className="text-slate-900">
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Color</label>
            <select
              value={color}
              onChange={e => setColor(e.target.value)}
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300"
            >
              {COLORS.map((c) => (
                <option key={c.value} value={c.value} className="text-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Enlace Público FFCV (Opcional)</label>
            <input
              type="url"
              value={ffcvUrl}
              onChange={(e) => setFfcvUrl(e.target.value)}
              placeholder="https://www.ffcv.es/ncompeticiones/..."
              className="mt-1 w-full rounded-md bg-white text-slate-900 border border-gray-300 placeholder-gray-400"
            />
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Actualizar equipo"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page */
function EquiposPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSeasonId = searchParams.get('seasonId');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false); // Show modal for creating a team
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<string, any[]>>({});
  const [showDropdown, setShowDropdown] = useState(false); // New dropdown state
  const [showPlayersFor, setShowPlayersFor] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null); // which card's dropdown is open

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

      let query = supabase
        .from("teams")
        .select("id, name, category, color, players(count), team_coaches(count)")
        .eq("club_id", profile.club_id)
        .order("name");
        
      // Fetch seasons for selector
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('id, name, is_active')
        .eq('club_id', profile.club_id)
        .order('start_date', { ascending: false });
        
      if (seasonsData) {
        setSeasons(seasonsData);
        // Default to url season, or active season, or first season
        const active = seasonsData.find(s => s.is_active);
        const targetSeasonId = urlSeasonId || active?.id || seasonsData[0]?.id || null;
        setActiveSeasonId(targetSeasonId);
        
        if (targetSeasonId) {
          query = query.eq('season_id', targetSeasonId);
        }
      }

      // RBAC: Coaches and Delegados only see their assigned teams
      if (profile.role === 'coach' || profile.role === 'entrenador' || profile.role === 'delegado') {
        query = query.eq('coach_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42703') {
           console.error("Faltan las columnas club_id o coach_id en la tabla equipos. Ejecuta el parche SQL.");
        } else {
           console.error(error.message || error);
        }
      } else {
        const mapped = (data as any[]).map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          members: t.players?.[0]?.count || 0,
          coaches: t.team_coaches?.[0]?.count || 0,
          color: t.color || '#1E3A8A',
        }));
        setTeams(mapped);
      }
    } catch (e) {
      console.error('Unexpected error fetching teams:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo por completo?')) return;
    const supabase = createClient();
    // .select() makes Supabase return the deleted rows — empty array means RLS silently blocked it
    const { data: deleted, error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .select('id');
    if (error) {
      console.error('⚠️ Error al borrar equipo:', error.message);
      alert('Error al eliminar: ' + error.message);
    } else if (!deleted || deleted.length === 0) {
      // RLS blocked the delete silently (no error, but 0 rows removed)
      alert('No tienes permiso para eliminar este equipo, o no existe. Revisa las políticas RLS en Supabase (tabla "equipos", política DELETE).');
    } else {
      // Delete confirmed by DB — remove from UI
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setOpenMenuId(null);
    }
  };

  const handleFieldChange = async (teamId: string, field: string, value: string) => {
    const supabase = createClient();
    const updates: any = { [field]: value };
    const { error } = await supabase.from("teams").update(updates).eq('id', teamId);
    if (error) {
      console.error('⚠️ Error updating field:', error.message);
    } else {
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, [field]: value } : t))
      );
    }
  };

  // Fetch players for a specific team (used when expanding a team card)
  const fetchPlayersForTeam = async (teamId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, posicion, dorsal')
        .eq('team_id', teamId);
      if (error) console.error('⚠️ Error fetching players:', error.message);
      else setPlayersMap((prev) => ({ ...prev, [teamId]: data || [] }));
    } catch (e) {
      console.error('Unexpected error fetching players for team:', e);
    }
  };

  const handleCreateTeam = async (newTeam: Omit<Team, "id">) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single();
    if (!profile?.club_id) return;

    const { data, error } = await supabase.from("teams").insert({
      name: newTeam.name,
      category: newTeam.category,
      members: newTeam.members,
      coaches: newTeam.coaches,
      color: newTeam.color,
      club_id: profile.club_id,
      season_id: activeSeasonId
    }).select().single();

    if (error) {
      console.error("Error creating team:", error.message);
    } else if (data) {
      setTeams(prev => [...prev, data]);
    }
  };

  useEffect(() => {
    fetchTeams();
    checkRole();
  }, [urlSeasonId]);

  const [isAdmin, setIsAdmin] = useState(false);
  const checkRole = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (data?.role === 'admin') setIsAdmin(true);
    }
  };



  const handleAddPlayer = async (player: { name: string; position: string; dorsal: number; }) => {
    if (!selectedTeamId) return;
    const supabase = createClient();
    // Obtener club_id para cumplir con la restricción NOT NULL
    const { data: clubData, error: clubError } = await supabase.from("clubs").select("id").limit(1).single();
    if (clubError) { console.error('⚠️ Error fetching club id:', clubError.message); return; }
    const club_id = clubData.id;
    const { error } = await supabase.from("players").insert({
      first_name: player.name.split(' ')[0] || "",
      last_name: player.name.split(' ').slice(1).join(' ') || "",
      posicion: player.position,
      dorsal: player.dorsal,
      team_id: selectedTeamId,
      club_id: club_id,
      birth_date: "2010-01-01",
      parent_contact: "Pendiente de rellenar",
    });
    if (error) console.error('⚠️ Error al añadir jugador:', error.message);
    else {
      fetchTeams();
      setShowAddPlayer(false);
    }
  };

  const borderColors = [
    "border-yellow-400",
    "border-green-400",
    "border-orange-400",
    "border-blue-400",
    "border-red-400",
  ];

  const filteredTeams = teams.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-blue-900">Equipos</h1>
            {seasons.length > 0 && (
              <select
                value={activeSeasonId || ''}
                onChange={(e) => {
                  router.push(`/admin/equipos?seasonId=${e.target.value}`);
                }}
                className="px-3 py-1.5 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg border border-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active ? '(Activa)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin/equipos/importador')}
                className="flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-sm"
              >
                <span>⚡ Importar Equipos</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/equipos/crear-varios')}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span>Añadir varios equipos</span>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span>Crear equipo</span>
              </button>
            </div>
          )}
      </div>

      <div className="flex max-w-md items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar"
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
              className="w-full flex flex-row items-center justify-between p-4 bg-white rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: team.color || '#1E40AF' }}
            >
              {/* ── Bloque 1: Logo + Info ── */}
              <div 
                className="flex items-center flex-1 min-w-0 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                onClick={() => router.push(`/dashboard/equipos/${team.id}/plantilla`)}
              >
                <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center mr-4 shrink-0 group-hover:bg-blue-50 transition-colors">
                  <User className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-black font-bold uppercase text-base leading-tight truncate group-hover:text-blue-700 transition-colors">
                    {team.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    {team.category}
                  </p>
                </div>
              </div>

              {/* ── Bloque 2: Contadores ── */}
              <div className="flex flex-col items-end justify-center shrink-0 mx-4">
                <div className="flex items-center">
                  {/* Mini avatars */}
                  <div className="flex -space-x-1 mr-2">
                    {[...Array(Math.min(team.members || 0, 3))].map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                    ))}
                    {(team.members || 0) === 0 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white" />
                    )}
                  </div>
                  <span className="text-gray-800 text-sm font-medium">
                    {team.members ?? 0} miembros
                  </span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="flex -space-x-1 mr-2">
                    {[...Array(Math.min(team.coaches || 0, 2))].map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-400" />
                      </div>
                    ))}
                    {(team.coaches || 0) === 0 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white" />
                    )}
                  </div>
                  <span className="text-gray-800 text-sm font-medium">
                    {team.coaches ?? 0} entrenadores
                  </span>
                </div>
              </div>

              {/* ── Bloque 3: Acciones ── */}
              <div className="border-l border-gray-300 pl-4 ml-2 flex flex-row items-center space-x-4 shrink-0 relative">
                <UserPlus
                  className="text-gray-600 hover:text-black cursor-pointer w-5 h-5 transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/equipos/${team.id}/anadir-miembros`); }}
                />
                <MoreHorizontal
                  className="text-gray-600 hover:text-black cursor-pointer w-5 h-5 transition-colors"
                  onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
                />
                {openMenuId === team.id && (
                  <div className="absolute right-0 top-7 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => { setEditTeam(team); setOpenMenuId(null); }}
                    >
                      Editar
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredTeams.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No hay equipos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      )}

      <AddPlayerModal
      open={showAddPlayer}
      onClose={() => setShowAddPlayer(false)}
      onAdd={handleAddPlayer}
    />
    {editTeam && (
      <EditTeamModal
        open={!!editTeam}
        onClose={() => setEditTeam(null)}
        team={editTeam}
        onUpdate={async (updated) => {
          // Optimistic update: reflect change immediately
          setTeams((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
          );
          setEditTeam(null);
          const supabase = createClient();
          const { error } = await supabase
            .from('teams')
            .update({
              name: updated.name,
              category: updated.category,
              members: updated.members,
              coaches: updated.coaches,
              sport: updated.sport,
              gender: updated.gender,
              age_group: updated.age_group,
              format: updated.format,
              color: updated.color,
              ffcv_url: updated.ffcv_url,
            })
            .eq('id', updated.id);
          if (error) {
            console.error('⚠️ Error updating team:', error.message);
            // Roll back on error
            fetchTeams();
          }
        }}
      />
    )}
    
    <CreateTeamModal
      open={showCreate}
      onClose={() => setShowCreate(false)}
      onCreate={handleCreateTeam}
    />
    </div>
  );
}

export default function EquiposPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando equipos...</div>}>
      <EquiposPageContent />
    </Suspense>
  );
}