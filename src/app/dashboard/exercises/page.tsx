import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BancoTareasModule } from '@/components/features/banco-tareas/BancoTareasModule';

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single();

  const userRole = (profile?.role || '').toLowerCase();
  const allRoles = Array.from(new Set([userRole, ...((profile?.roles || []).map((r: string) => (r || '').toLowerCase()))])).filter(Boolean);
  const isStaffOrCoach = allRoles.some((r) => ['admin', 'superadmin', 'administrador', 'admin_club', 'coordinador', 'coach', 'entrenador', 'delegado', 'preparador_fisico', 'metodologo'].includes(r));

  if (!isStaffOrCoach || userRole === 'jugador' || userRole === 'tutor' || userRole === 'familiar' || userRole === 'family' || userRole === 'familia') {
    redirect('/dashboard');
  }

  return <BancoTareasModule />;
}
