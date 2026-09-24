import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role;
  const userRoles: string[] = profile?.roles || [];

  // 1. Respetar PRIMERO el rol activo seleccionado (profile.role)
  if (role === 'admin' || role === 'superadmin') {
    redirect('/admin/inicio');
  } else if (role === 'coordinador') {
    redirect('/admin/coordinador');
  } else if (role === 'coach' || role === 'entrenador') {
    redirect('/dashboard/mis-equipos');
  } else if (role === 'jugador') {
    const { data: playerRec } = await supabase
      .from('players')
      .select('id')
      .eq('user_auth_id', authData.user.id)
      .neq('status', 'inactive')
      .maybeSingle();

    if (playerRec) {
      redirect(`/dashboard/family/e/${playerRec.id}/perfil`);
    } else {
      const { data: tutorLink } = await supabase
        .from('player_tutors')
        .select('player_id')
        .eq('tutor_id', authData.user.id)
        .limit(1)
        .maybeSingle();

      if (tutorLink) {
        redirect(`/dashboard/family/e/${tutorLink.player_id}/perfil`);
      }
    }
    redirect('/dashboard/family');
  } else if (role === 'tutor' || role === 'familia' || role === 'family') {
    redirect('/dashboard/family');
  } else if (role === 'utillero') {
    redirect('/dashboard/utilleria');
  }

  // 2. Si no hay rol activo o no coincide, evaluar roles secundarios en profile.roles por jerarquía
  if (userRoles.includes('admin') || userRoles.includes('superadmin')) redirect('/admin/inicio');
  else if (userRoles.includes('coordinador')) redirect('/admin/coordinador');
  else if (userRoles.includes('coach') || userRoles.includes('entrenador')) redirect('/dashboard/mis-equipos');
  else if (userRoles.includes('jugador')) {
    const { data: playerRec } = await supabase
      .from('players')
      .select('id')
      .eq('user_auth_id', authData.user.id)
      .neq('status', 'inactive')
      .maybeSingle();
    if (playerRec) redirect(`/dashboard/family/e/${playerRec.id}/perfil`);
  }
  else if (userRoles.includes('tutor') || userRoles.includes('family')) redirect('/dashboard/family');

  redirect("/dashboard/global-club");
}
