import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COACH_ROLES, getAuthenticatedContext } from "@/lib/auth-helpers";
import { resolveOrAutoLinkFamilyPlayer } from "@/lib/family-helpers";

export default async function DashboardPage() {
  const { context: ctx } = await getAuthenticatedContext();
  if (ctx?.isImpersonating) {
    const impRole = (ctx.profile.role || '').toLowerCase().trim();
    if (['jugador', 'tutor', 'familia', 'family', 'familiar'].includes(impRole)) {
      const targetPlayerId = ctx.impersonatedPlayerId || ctx.profile.linked_player_id || await resolveOrAutoLinkFamilyPlayer(ctx.user.id, ctx.user.email);
      if (targetPlayerId) {
        redirect(`/dashboard/family/e/${targetPlayerId}/perfil`);
      }
      redirect('/dashboard/bienvenida-familia');
    }
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roles, linked_player_id, is_active")
    .eq("id", authData.user.id)
    .single();

  if (profile?.is_active === false) {
    redirect("/dashboard/bienvenida-familia");
  }

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
  } else if (role === 'jugador' || role === 'tutor' || role === 'familia' || role === 'family') {
    const linkedId = await resolveOrAutoLinkFamilyPlayer(authData.user.id, authData.user.email);
    if (linkedId) {
      redirect(`/dashboard/family/e/${linkedId}/perfil`);
    }
    redirect('/dashboard/bienvenida-familia');
  }

  // 2. Si no hay rol activo o no coincide, evaluar roles secundarios en profile.roles por jerarquía
  if (userRoles.includes('admin') || userRoles.includes('superadmin')) redirect('/admin/inicio');
  else if (userRoles.includes('coordinador') || userRoles.includes('coordinador_general')) redirect('/admin/coordinador');
  else if (userRoles.some(r => COACH_ROLES.includes(r))) redirect('/dashboard/mis-equipos');
  else if (userRoles.includes('metodologo') || userRoles.includes('metodologia')) redirect('/admin/metodologia');
  else if (userRoles.includes('utillero')) redirect('/dashboard/utilleria');
  else if (userRoles.some(r => ['jugador', 'tutor', 'family', 'familia'].includes(r))) {
    const linkedId = await resolveOrAutoLinkFamilyPlayer(authData.user.id, authData.user.email);
    if (linkedId) redirect(`/dashboard/family/e/${linkedId}/perfil`);
    redirect('/dashboard/bienvenida-familia');
  }

  // Fallback seguro: si el usuario tiene rol de entrenador de cualquier forma, nunca enviar a global-club
  const allRoles = Array.from(new Set([role, ...userRoles].filter(Boolean)));
  if (allRoles.some(r => COACH_ROLES.includes(r as string))) {
    redirect('/dashboard/mis-equipos');
  }

  // Si no tiene rol válido o autorizado
  redirect("/dashboard/bienvenida-familia");
}
