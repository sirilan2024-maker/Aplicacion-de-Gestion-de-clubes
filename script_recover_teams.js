const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';
const supabase = createClient(supabaseUrl, supabaseKey);

const OLD_SEASON_ID = '1f95102d-1d00-43fa-9e4c-408681a03e7f';
const CSV_DIR = 'C:\\Users\\siril\\Documents\\SPORTING SALADAR\\GESTION INTEGRAL DEL CLUB\\EQUIPOS SPORTEASY\\formato subida archivos equipos';

async function run() {
  console.log("Fetching old teams...");
  const { data: teams } = await supabase.from('teams').select('id, name').eq('season_id', OLD_SEASON_ID);
  
  const teamMap = new Map();
  teams.forEach(t => {
    teamMap.set(t.name.trim().toLowerCase(), t.id);
  });

  console.log("Fetching all inactive/archived players...");
  const { data: players } = await supabase.from('players')
    .select('id, first_name, last_name')
    .in('status', ['inactive', 'archived']);

  const playerMap = new Map();
  players.forEach(p => {
    const key = `${(p.first_name || '').trim().toLowerCase()} ${(p.last_name || '').trim().toLowerCase()}`;
    playerMap.set(key, p.id);
  });

  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));
  let matchedCount = 0;
  let totalRows = 0;

  for (const file of files) {
    const filePath = path.join(CSV_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length === 0) continue;
    
    const headers = lines[0].split(';');
    const getIndex = (str) => headers.findIndex(h => h.trim().toLowerCase().includes(str));
    
    const teamIdx = getIndex('equipo');
    const lastIdx = getIndex('apellido');
    const firstIdx = getIndex('nombre');
    const roleIdx = getIndex('rol');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(';');

      const teamName = teamIdx >= 0 ? cols[teamIdx]?.trim() : '';
      const lastName = lastIdx >= 0 ? cols[lastIdx]?.trim() : '';
      const firstName = firstIdx >= 0 ? cols[firstIdx]?.trim() : '';
      const role = roleIdx >= 0 ? cols[roleIdx]?.trim() : '';

      if (role && role.toLowerCase() !== 'jugador') continue;
      if (!firstName) continue; // Must have at least a first name

      totalRows++;

      const teamId = teamMap.get(teamName.toLowerCase());
      if (!teamId) {
        // console.warn(`Warning: Team not found in DB: ${teamName}`);
        continue;
      }

      const playerKey = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
      const playerId = playerMap.get(playerKey);

      if (playerId) {
        // Update player_season_history
        const { error } = await supabase.from('player_season_history')
          .update({ team_id: teamId })
          .eq('player_id', playerId)
          .eq('season_id', OLD_SEASON_ID);
          
        if (error) {
          console.error(`Error updating history for ${playerKey}:`, error.message);
        } else {
          matchedCount++;
        }
      } else {
        // Try matching just by first name and last name separately in case of slight format changes
        // Often, names have extra spaces or accents.
        const fuzzyMatch = players.find(p => 
          (p.first_name || '').toLowerCase().trim() === firstName.toLowerCase() && 
          (p.last_name || '').toLowerCase().trim() === lastName.toLowerCase()
        );
        if (fuzzyMatch) {
          await supabase.from('player_season_history')
            .update({ team_id: teamId })
            .eq('player_id', fuzzyMatch.id)
            .eq('season_id', OLD_SEASON_ID);
          matchedCount++;
        }
      }
    }
  }

  console.log(`\nRecovery Complete!`);
  console.log(`Total player rows in CSVs: ${totalRows}`);
  console.log(`Successfully mapped and updated: ${matchedCount}`);
}

run().catch(console.error);
