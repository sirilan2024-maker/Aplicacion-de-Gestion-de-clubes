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
  if (role === 'admin') redirect('/dashboard/equipos');
  else if (role === 'coach' || role === 'entrenador') redirect('/dashboard/mis-equipos');
  else if (role === 'tutor' || role === 'familia' || role === 'family') redirect('/dashboard/family');
  
  redirect("/dashboard/mi-perfil");
}
