import { createClient } from '@/lib/supabase/server';

export async function isSeasonEditable(seasonId: string, clubId: string): Promise<boolean> {
  if (!seasonId || !clubId) return false;
  
  const supabase = await createClient();
  const { data: season } = await supabase
    .from('seasons')
    .select('is_active, name')
    .eq('id', seasonId)
    .eq('club_id', clubId)
    .single();

  if (!season) return false;

  if (season.is_active) return true;

  // Si no est� activa, solo es editable si est� "Reabierta" (tiene ?? en el nombre)
  // Y adem�s debemos verificar que el usuario actual es admin
  if (season.name.includes('??')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role === 'admin') {
        return true;
      }
    }
  }

  return false;
}
