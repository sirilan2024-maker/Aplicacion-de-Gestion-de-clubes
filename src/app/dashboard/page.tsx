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
    .select("role")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role;
  if (role === 'admin' || role === 'coordinador') redirect('/dashboard/equipos');
  else if (role === 'coach' || role === 'entrenador') redirect('/dashboard/mis-equipos');
  else if (role === 'tutor' || role === 'familia' || role === 'family') redirect('/dashboard/family');
  else if (role === 'jugador') {
    const { data: playerRec } = await supabase
      .from('players')
      .select('id')
      .eq('user_auth_id', authData.user.id)
      .neq('status', 'inactive')
      .maybeSingle();

    if (playerRec) {
      redirect(`/dashboard/family/e/${playerRec.id}/perfil`);
    } else {
      // Fallback: If no player record matches the user_auth_id (e.g. testing with tutor account),
      // redirect to the first linked tutor player to show the Cadet view.
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
  }
  
  redirect("/dashboard/mi-perfil");
}
