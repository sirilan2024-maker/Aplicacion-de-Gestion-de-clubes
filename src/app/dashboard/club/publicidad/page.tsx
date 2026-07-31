import { createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LiveAdManager } from "@/components/features/admin/LiveAdManager"
import { getLiveAd } from "@/app/actions/ad-actions"

export default async function PublicidadConfigPage() {
  const supabase = await createAdminClient()
  
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect("/dashboard")
  }
  
  const currentAd = await getLiveAd();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Publicidad en Directo</h1>
        <p className="text-slate-500 mt-2">
          Configura los patrocinadores y anuncios que aparecen en la ventana pública de partidos en directo.
        </p>
      </div>

      <LiveAdManager initialAd={currentAd} />
    </div>
  )
}
