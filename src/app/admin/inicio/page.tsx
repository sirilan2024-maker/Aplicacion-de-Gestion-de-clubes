import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExecutiveDashboardAction } from "@/app/actions/club-actions";
import { AdminInicioClient } from "@/components/features/admin/AdminInicioClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminInicioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "";
  const roles = profile?.roles || [];

  // Seguridad estricta por rol: El coordinador debe ver su propio panel
  if (role === "coordinador" || role === "coordinador_general") {
    redirect("/admin/coordinador");
  } else if (role === "coach" || role === "entrenador") {
    redirect("/dashboard/mis-equipos");
  } else if (role === "metodologo" || role === "metodologia") {
    redirect("/admin/metodologia");
  } else if (role === "jugador" || role === "tutor" || role === "familia" || role === "family") {
    redirect("/dashboard/family");
  } else if (role === "utillero") {
    redirect("/dashboard/utilleria");
  }

  const isAdmin = role === "admin" || role === "superadmin" || role === "administrador" || role === "admin_club" ||
    roles.includes("admin") || roles.includes("superadmin");

  if (!isAdmin && (roles.includes("coordinador") || roles.includes("coordinador_general"))) {
    redirect("/admin/coordinador");
  }

  const result = await getExecutiveDashboardAction();
  return <AdminInicioClient initialResult={result} />;
}
