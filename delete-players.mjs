import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('players').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  let toDeleteIds = [];
  
  // Find "default" players (e.g. "Nuevo Jugador", "Jugador 1")
  const defaultPlayers = data.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
    return fullName.includes('nuevo jugador') || fullName.match(/^jugador \d+$/) || fullName.trim() === 'jugador';
  });
  
  defaultPlayers.forEach(p => {
    console.log(`Found default player: ${p.first_name} ${p.last_name}`);
    toDeleteIds.push(p.id);
  });
  
  // Find duplicates
  const namesMap = new Map();
  data.forEach(p => {
    // Only check non-default players for duplicates
    if (toDeleteIds.includes(p.id)) return;
    
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
    if (namesMap.has(fullName)) {
      const existing = namesMap.get(fullName);
      // Keep the one that has an email or was created first
      if (!existing.email && p.email) {
        toDeleteIds.push(existing.id);
        namesMap.set(fullName, p);
        console.log(`Found duplicate: ${fullName}. Keeping the one with email.`);
      } else {
        toDeleteIds.push(p.id);
        console.log(`Found duplicate: ${fullName}. Deleting.`);
      }
    } else {
      namesMap.set(fullName, p);
    }
  });
  
  console.log(`Total players to delete: ${toDeleteIds.length}`);
  
  // Actually delete
  if (toDeleteIds.length > 0) {
    const { error: deleteError } = await supabase.from('players').delete().in('id', toDeleteIds);
    if (deleteError) {
      console.error("Delete error:", deleteError);
    } else {
      console.log(`Successfully deleted ${toDeleteIds.length} players.`);
    }
  } else {
    console.log("Nothing to delete.");
  }
}

main();
