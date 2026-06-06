import { createClient } from "@/lib/supabase/server"
import { Users, Plus, Link2, Copy } from "lucide-react"
import { CreateTeamButton } from "@/components/features/teams/create-team-button"
import { CopyInviteButton } from "@/components/features/teams/CopyInviteButton"
import Link from "next/link"

export default async function TeamsPage() {
  const supabase = await createClient()

  const { data: teams } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      category,
      color,
      invite_code,
      coach:profiles(first_name, last_name),
      players(count)
    `)
    .order("name")

  const formattedTeams =
    teams?.map((t) => ({
      id:           t.id,
      name:         t.name,
      category:     t.category,
      color:        t.color || "#1E40AF",
      inviteCode:   t.invite_code as string | null,
      coach:        t.coach
        ? `${(t.coach as any).first_name} ${(t.coach as any).last_name}`
        : "Sin entrenador",
      playersCount: (t.players as any)[0]?.count || 0,
    })) || []

  return (
    <div className="min-h-full bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-5 py-7 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mis Equipos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formattedTeams.length} equipo{formattedTeams.length !== 1 ? "s" : ""} en tu club
            </p>
          </div>
          <CreateTeamButton />
        </div>

        {/* ── Teams Grid ── */}
        {formattedTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formattedTeams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col"
              >
                {/* Color stripe */}
                <div className="h-1.5 w-full" style={{ backgroundColor: team.color }} />

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Team info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        <Users size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{team.name}</p>
                        <p className="text-xs text-gray-400 truncate">{team.coach}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {team.category}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 py-3 border-y border-gray-50">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Jugadores
                      </p>
                      <p className="text-lg font-bold text-gray-900">{team.playersCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Estado
                      </p>
                      <span className="text-xs font-semibold text-emerald-600">● Activo</span>
                    </div>
                  </div>

                  {/* Invite code section */}
                  {team.inviteCode ? (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Link2 size={12} className="text-blue-400 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                            Código invitación
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-blue-800 tracking-widest">
                          {team.inviteCode}
                        </span>
                      </div>
                      <CopyInviteButton
                        inviteCode={team.inviteCode}
                        teamName={team.name}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-center">
                      <p className="text-[11px] text-gray-400">
                        Sin código — aplica la migración 00011
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <Link
                    href={`/dashboard/teams/${team.id}`}
                    className="mt-auto block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors py-1"
                  >
                    Ver plantilla →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No hay equipos aún</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
              Crea tu primer equipo para empezar a gestionar jugadores y compartir
              el enlace de invitación con las familias.
            </p>
            <CreateTeamButton />
          </div>
        )}

      </div>
    </div>
  )
}
