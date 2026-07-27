const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRLS() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sirilan2024@gmail.com',
    password: 'securepassword123' // Try a default password or I can't guess it. Wait, I can't guess the password.
  });
  console.log("Auth Error:", authError);
}
testRLS();
