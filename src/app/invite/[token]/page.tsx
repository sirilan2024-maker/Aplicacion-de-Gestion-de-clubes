import { getInvitationByToken, acceptInvitation } from "@/lib/invitations-actions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const { data: invite, error } = await getInvitationByToken(token)

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Enlace no válido</h1>
          <p className="text-slate-500">Esta invitación no existe, ha caducado o ya ha sido utilizada.</p>
        </div>
      </div>
    )
  }

  // Handle form submission Server Action inline
  const handleSubmit = async (formData: FormData) => {
    "use server"
    
    const playerData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      medical_notes: formData.get("medical_notes") as string,
      gdpr_consent: formData.get("gdpr_consent") === "on",
    }

    const res = await acceptInvitation(token, playerData)

    if (res.success) {
      redirect(`/dashboard/e/${invite.team_id}`)
    } else {
      // Simplification for the demo: we'll redirect to an error or handle it via a client component usually
      console.error(res.error)
      redirect(`/invite/${token}?error=1`)
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-150 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            👋
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            Te han invitado a unirte
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            El club <strong>{(invite.equipo as any)?.club?.name || 'Sporting Saladar'}</strong> te ha invitado como <strong className="capitalize text-blue-600">{invite.role}</strong> para el equipo <strong>{(invite.equipo as any)?.name}</strong>.
          </p>
        </div>

        {!user ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium text-center">
            Debes <a href="/login" className="font-bold underline text-amber-900">iniciar sesión o registrarte</a> con el correo <strong>{invite.email}</strong> antes de aceptar esta invitación.
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-5">
            {invite.role === 'jugador' || invite.role === 'familia' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nombre del Jugador</label>
                    <input type="text" name="first_name" required className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Apellidos</label>
                    <input type="text" name="last_name" required className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Alergias o Notas Médicas (Opcional)</label>
                  <textarea name="medical_notes" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium resize-none h-20" placeholder="Ej. Alergia al polen, asma..."></textarea>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                  <input type="checkbox" name="gdpr_consent" id="gdpr" required className="mt-1 w-4 h-4 rounded text-blue-600 accent-blue-600" />
                  <label htmlFor="gdpr" className="text-xs text-slate-600 leading-relaxed">
                    <strong>Consentimiento LOPD:</strong> Otorgo permiso al club para el tratamiento de los datos personales y deportivos del jugador en esta plataforma con fines de gestión deportiva.
                  </label>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 text-center">
                Te unirás como <strong>{invite.role}</strong> al cuerpo técnico.
              </div>
            )}

            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-[1.02]">
              Aceptar Invitación
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
