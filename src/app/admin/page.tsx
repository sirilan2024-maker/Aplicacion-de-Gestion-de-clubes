import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AdminIndex() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("id", user.id)
    .single()

  const role = profile?.role
  if (role === "coordinador" || role === "coordinador_general") {
    redirect("/admin/coordinador")
  } else if (role === "coach" || role === "entrenador") {
    redirect("/dashboard/mis-equipos")
  } else if (role === "metodologo" || role === "metodologia") {
    redirect("/admin/metodologia")
  } else if (role === "jugador" || role === "tutor" || role === "familia" || role === "family") {
    redirect("/dashboard/family")
  } else if (role === "utillero") {
    redirect("/dashboard/utilleria")
  }

  redirect("/admin/inicio")
}
