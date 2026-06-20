import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Checking for matches and convocatorias...")
  
  // 1. Get matches
  const { data: matches } = await supabase.from('partidos').select('*').limit(5)
  if (!matches || matches.length === 0) {
    console.log("No matches found to add cards.")
    return
  }

  // 2. Get some players
  const { data: players } = await supabase.from('players').select('*').limit(10)
  
  if (!players || players.length === 0) {
    console.log("No players found.")
    return
  }

  console.log("Adding simulated cards to convocatorias...")
  
  for (let i = 0; i < 5; i++) {
    const match = matches[i % matches.length]
    const player = players[i % players.length]
    
    // Check if conv exists
    const { data: existing } = await supabase
      .from('convocatorias')
      .select('*')
      .eq('partido_id', match.id)
      .eq('player_id', player.id)
      .single()
      
    if (existing) {
      await supabase.from('convocatorias').update({
        yellow_cards: (existing.yellow_cards || 0) + 1,
        red_cards: i % 3 === 0 ? 1 : 0 // Some red cards
      }).eq('id', existing.id)
      console.log(`Updated cards for ${player.first_name} in match vs ${match.rival_nombre}`)
    } else {
      await supabase.from('convocatorias').insert({
        partido_id: match.id,
        player_id: player.id,
        yellow_cards: 1,
        red_cards: i % 3 === 0 ? 1 : 0,
        estado_asistencia: 'Asiste'
      })
      console.log(`Inserted simulated cards for ${player.first_name} in match vs ${match.rival_nombre}`)
    }
  }
  
  console.log("Done adding simulated cards.")
}

run()
