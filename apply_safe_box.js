const fs = require('fs');

function injectSeasonId(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Inject season_id into creates
  if (filePath.includes('match-actions.ts')) {
    code = code.replace(
      /async function createMatch\(matchData: Partial<Partido>\) \{/,
      \sync function createMatch(matchData: Partial<Partido>) {
  const supabase = createClient(cookies());
  const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
  const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single();
  if (activeSeason) {
    matchData.season_id = activeSeason.id;
  }\
    );
  }
  
  fs.writeFileSync(filePath, code);
}

injectSeasonId('src/app/actions/match-actions.ts');
console.log('Applied safe box logic');
