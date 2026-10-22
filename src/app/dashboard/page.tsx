import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COACH_ROLES } from "@/lib/auth-helpers";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles, linked_player_id")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role;
  const userRoles: string[] = profile?.roles || [];

  // 1. Respetar PRIMERO el rol activo seleccionado (profile.role)
  if (role === 'admin' || role === 'superadmin') {
    redirect('/admin/inicio');
  } else if (role === 'coordinador' || role === 'coordinador_general') {
    redirect('/admin/coordinador');
  } else if (COACH_ROLES.includes(role || '')) {
    // Si no tiene equipos como entrenador pero sí un jugador vinculado, redirigir a su ficha de jugador
    const { data: coachTeams } = await supabase
      .from('team_coaches')
      .select('team_id')
      .eq('user_id', authData.user.id)
      .limit(1);

    if ((!coachTeams || coachTeams.length === 0) && profile?.linked_player_id) {
      redirect(`/dashboard/family/e/${profile.linked_player_id}/perfil`);
    }
    redirect('/dashboard/mis-equipos');
  } else if (role === 'metodologo' || role === 'metodologia') {
    redirect('/admin/metodologia');
  } else if (role === 'utillero') {
    redirect('/dashboard/utilleria');
  } else if (role === 'jugador') {
    if (profile?.linked_player_id) {
      redirect(`/dashboard/family/e/${profile.linked_player_id}/perfil`);
    }

    const { data: playerRec } = await supabase
      .from('players')
      .select('id')
      .or(`user_auth_id.eq.${authData.user.id},tutor_id.eq.${authData.user.id},user_id.eq.${authData.user.id}`)
      .neq('status', 'inactive')
      .limit(1)
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
    if (profile?.linked_player_id) {
      redirect(`/dashboard/family/e/${profile.linked_player_id}/perfil`);
    }
    redirect('/dashboard/family');
  }

  // 2. Si no hay rol activo o no coincide, evaluar roles secundarios en profile.roles por jerarquía
  if (userRoles.includes('admin') || userRoles.includes('superadmin')) redirect('/admin/inicio');
  else if (userRoles.includes('coordinador') || userRoles.includes('coordinador_general')) redirect('/admin/coordinador');
  else if (userRoles.some(r => COACH_ROLES.includes(r))) redirect('/dashboard/mis-equipos');
  else if (userRoles.includes('metodologo') || userRoles.includes('metodologia')) redirect('/admin/metodologia');
  else if (userRoles.includes('utillero')) redirect('/dashboard/utilleria');
  else if (userRoles.includes('jugador')) {
    if (profile?.linked_player_id) redirect(`/dashboard/family/e/${profile.linked_player_id}/perfil`);
    const { data: playerRec } = await supabase
      .from('players')
      .select('id')
      .or(`user_auth_id.eq.${authData.user.id},tutor_id.eq.${authData.user.id},user_id.eq.${authData.user.id}`)
      .neq('status', 'inactive')
      .maybeSingle();
    if (playerRec) redirect(`/dashboard/family/e/${playerRec.id}/perfil`);
  }
  else if (userRoles.includes('tutor') || userRoles.includes('family') || userRoles.includes('familia')) redirect('/dashboard/family');

  // Fallback seguro: si el usuario tiene rol de entrenador de cualquier forma, nunca enviar a global-club
  const allRoles = Array.from(new Set([role, ...userRoles].filter(Boolean)));
  if (allRoles.some(r => COACH_ROLES.includes(r as string))) {
    redirect('/dashboard/mis-equipos');
  }

  redirect("/dashboard/global-club");
}
