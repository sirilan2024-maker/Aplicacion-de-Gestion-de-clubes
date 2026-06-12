const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { 
  const [k, ...v] = line.split('='); 
  if(k && v) acc[k.trim()] = v.join('=').trim(); 
  return acc; 
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const allowedNames = [
  'cadete a', 'cadete b', 'infantil a', 'infantil b', 
  'juvenil a', 'juvenil b', 'infantil c', 'senior'
];

async function clean() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  // 1. Fetch current equipos
  const { data: equipos } = await supabase.from('equipos').select('*');
  
  // 2. Identify the ones to keep and delete
  const equiposToKeep = [];
  const equiposToDelete = [];
  
  // Special rule: if it's 'Infantil Brave', let's rename it to 'Infantil C'
  const brave = equipos.find(e => e.name === 'Infantil Brave');
  if (brave) {
    console.log('Renaming Infantil Brave to Infantil C...');
    await supabase.from('equipos').update({ name: 'Infantil C' }).eq('id', brave.id);
    brave.name = 'Infantil C';
  }

  // Reload equipos after rename
  const { data: updatedEquipos } = await supabase.from('equipos').select('*');

  const seenNames = new Set();
  
  for (const equipo of updatedEquipos) {
    const normName = equipo.name.toLowerCase().trim();
    if (allowedNames.includes(normName) && !seenNames.has(normName)) {
      equiposToKeep.push(equipo);
      seenNames.add(normName);
    } else {
      equiposToDelete.push(equipo);
    }
  }

  console.log('Equipos to KEEP:', equiposToKeep.map(e => e.name));
  console.log('Equipos to DELETE:', equiposToDelete.map(e => e.name));

  // 3. Delete bad equipos
  for (const eq of equiposToDelete) {
    await supabase.from('equipos').delete().eq('id', eq.id);
  }
  
  // 4. Delete from teams table where name is not in allowed list
  const { data: teams } = await supabase.from('teams').select('*');
  const validTeamIds = new Set(equiposToKeep.map(e => e.id));
  
  let deletedTeams = 0;
  for (const t of teams) {
    // Keep it if it matches exactly an ID from equiposToKeep
    if (!validTeamIds.has(t.id)) {
      await supabase.from('teams').delete().eq('id', t.id);
      deletedTeams++;
    }
  }
  console.log(`Deleted ${deletedTeams} rogue teams from the teams table.`);
  
  // 5. Delete matches where equipo_id is not in validTeamIds
  const { data: partidos } = await supabase.from('partidos').select('*');
  let deletedMatches = 0;
  for (const p of partidos) {
    if (!validTeamIds.has(p.equipo_id)) {
      await supabase.from('partidos').delete().eq('id', p.id);
      deletedMatches++;
    }
  }
  console.log(`Deleted ${deletedMatches} orphaned matches.`);

  console.log('Cleanup finished!');
}

clean().catch(console.error);
