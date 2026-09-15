import { createClient } from '@/lib/supabase/server';

export async function isSeasonEditable(seasonId: string, clubId: string): Promise<boolean> {
  if (!seasonId || !clubId) return false;
  
  const supabase = await createClient();
  const { data: season } = await supabase
    .from('seasons')
    .select('is_active, is_unlocked, name')
    .eq('id', seasonId)
    .eq('club_id', clubId)
    .single();

  if (!season) return false;

  // 1. Temporada activa: EDITABLE
  if (season.is_active) return true;

  // 2. Temporada no activa: solo editable si tiene is_unlocked = true (o fallback name 🔓) Y el usuario es admin
  const isMasterUnlocked = Boolean((season as any)?.is_unlocked || (season.name && season.name.includes('🔓')));
  if (isMasterUnlocked) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        return true;
      }
    }
  }

  return false;
}

export async function assertSeasonEditable(seasonId: string, clubId: string): Promise<void> {
  const editable = await isSeasonEditable(seasonId, clubId);
  if (!editable) {
    throw new Error('No se pueden modificar datos de una temporada cerrada.');
  }
}
