// src/app/dashboard/miembros/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";

/* ------------------------------------------------------------------ */
/*  Types
/* ------------------------------------------------------------------ */
interface Member {
  id: string;
  name: string;
  nickname?: string;
  team_name: string;
  role: string; // 'jugador' | 'entrenador' | 'familia' …
}

interface TeamOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Main page
/* ------------------------------------------------------------------ */
export default function MiembrosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  /* --------------------------------------------------------------
     Fetch teams –‑ for the filter dropdown
   -------------------------------------------------------------- */
  useEffect(() => {
    const fetchTeams = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");
      if (error) console.error(error);
      else setTeams(data as TeamOption[]);
      setLoadingTeams(false);
    };
    fetchTeams();
  }, []);

  /* --------------------------------------------------------------
     Fetch members –‑ applies team filter + search
   -------------------------------------------------------------- */
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const supabase = createClient();
      let query = supabase
        .from("profiles")
        .select("id, name, nickname, role, team_id");

      if (selectedTeamIds.length > 0) {
        query = query.in("team_id", selectedTeamIds);
      }
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const { data, error } = await query.order("name");
      if (error) console.error(error);
      else {
        // Resolve the team name locally (simple join)
        const map: Record<string, string> = {};
        teams.forEach((t) => (map[t.id] = t.name));
        const enriched = (data as any[]).map((m) => ({
          id: m.id,
          name: m.name,
          nickname: m.nickname,
          role: m.role,
          team_name: map[m.team_id] || "—",
        }));
        setMembers(enriched as Member[]);
      }
      setLoadingMembers(false);
    };

    // Wait until the teams list is available –‑ otherwise the map would be empty.
    if (!loadingTeams) fetchMembers();
  }, [selectedTeamIds, searchTerm, teams, loadingTeams]);

  /* --------------------------------------------------------------
     Team filter toggle
   -------------------------------------------------------------- */
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  /* ------------------------------------------------------------------ */
  /*  UI –‑ Header, Filters, Table (with skeletons while loading)
   * ------------------------------------------------------------------ */
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Miembros</h1>

      {/* --------------------------------------------------------------
          Controls (search + team filter)
         -------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Buscar por nombre…"
            className="w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
        </div>

        {/* Team filter dropdown */}
        <div className="relative inline-block w-64">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            Filtrar por Equipo
            <ChevronDown className="ml-2 h-4 w-4" />
          </button>

          {filterOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200">
              {loadingTeams ? (
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => toggleTeamSelection(team.id)}
                    />
                    {team.name}
                  </label>
                ))
              )}

              {selectedTeamIds.length > 0 && (
  <div className="px-3 py-2 cursor-pointer hover:bg-gray-100" onClick={() => setSelectedTeamIds([])}>
    Ver Todos
  </div>
)}
{teams.length === 0 && !loadingTeams && (
                <p className="px-3 py-2 text-gray-500">No hay equipos.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------
          Table (members)
         -------------------------------------------------------------- */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Nombre
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Apodo
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Equipo
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                Rol
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {/* Loading skeleton rows */}
            {loadingMembers
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-2">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              : members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{m.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {m.nickname || "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {m.team_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 capitalize">
                      {m.role}
                    </td>
                  </tr>
                ))}

            {/* Empty‑state */}
            {!loadingMembers && members.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-4 text-center text-gray-500"
                >
                  No hay miembros que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}