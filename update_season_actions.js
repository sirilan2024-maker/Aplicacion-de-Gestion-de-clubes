const fs = require('fs');
const file = 'src/app/actions/season-actions.ts';
let code = fs.readFileSync(file, 'utf8');

const newAction = \\n
export async function bulkEnrollPlayers(seasonId: string, enrollments: {playerId: string, teamId: string | null}[]) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden hacer matriculaciones masivas');

  // Verify season exists and belongs to club
  const { data: season } = await supabase.from('seasons').select('id, is_active, name').eq('id', seasonId).eq('club_id', profile.club_id).single();
  if (!season) throw new Error('Temporada no encontrada');

  let hasErrors = false;

  for (const enr of enrollments) {
    if (!enr.teamId) {
      // Inactivate in this season
      await supabase.from('player_season_history').update({ status: 'inactive' }).eq('player_id', enr.playerId).eq('season_id', seasonId);
    } else {
      // Upsert to the new team
      const { data: existing } = await supabase.from('player_season_history').select('id').eq('player_id', enr.playerId).eq('season_id', seasonId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('player_season_history').update({ team_id: enr.teamId, status: 'active' }).eq('id', existing.id);
        if (error) hasErrors = true;
      } else {
        const { error } = await supabase.from('player_season_history').insert({ player_id: enr.playerId, team_id: enr.teamId, season_id: seasonId, club_id: profile.club_id, status: 'active' });
        if (error) hasErrors = true;
      }
      
      // Update global team_id if it's the active season
      if (season.is_active) {
        await supabase.from('players').update({ team_id: enr.teamId, status: 'active' }).eq('id', enr.playerId);
      }
    }
  }

  revalidatePath('/dashboard/club/miembros');
  revalidatePath('/dashboard/equipos');
  return { success: !hasErrors };
}
\;

fs.writeFileSync(file, code + newAction);
console.log('Appended bulkEnrollPlayers to season-actions.ts');
