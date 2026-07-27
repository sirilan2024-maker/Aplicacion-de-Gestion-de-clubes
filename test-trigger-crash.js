const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testCreateUser() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_trigger_crash_2@example.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      role: 'family',
      rol: 'familia',
      first_name: 'Test',
      last_name: 'User'
    }
  });

  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('User created successfully:', data.user.id);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
}

testCreateUser();
