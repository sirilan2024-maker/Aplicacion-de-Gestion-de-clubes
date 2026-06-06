import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Load env
const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function test() {
  console.log('Testing connection...')
  
  const { data: matches, error: matchesError } = await supabase
    .from('partidos')
    .select('id')
    .limit(1)
  
  if (matchesError) {
    console.error('Error fetching partidos:', matchesError.message)
  } else {
    console.log('Successfully connected to partidos table, found:', matches)
  }

  const { error: mvpError } = await supabase
    .from('mvp_votes')
    .select('id')
    .limit(1)
  
  if (mvpError) {
    console.log('mvp_votes table does NOT exist or has error:', mvpError.message)
  } else {
    console.log('mvp_votes table EXISTS!')
  }

  const { error: notifError } = await supabase
    .from('notifications')
    .select('id')
    .limit(1)
  
  if (notifError) {
    console.log('notifications table does NOT exist or has error:', notifError.message)
  } else {
    console.log('notifications table EXISTS!')
  }
}

test()
