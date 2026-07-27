const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'juan@mail.com',
    password: 'juan2026'
  });
  
  if (authErr) {
    console.error('Login error:', authErr.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('User ID:', userId);
  
  const { data: playerRec, error: pErr } = await supabase
    .from('players')
    .select('id')
    .eq('user_auth_id', userId)
    .neq('status', 'inactive')
    .maybeSingle();
    
  console.log('Player Rec:', playerRec);
  console.log('Player Error:', pErr);
}

test();
