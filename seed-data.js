// ============================================================================
// BLINDAJE DE SEGURIDAD CONTRA EJECUCIÓN ACCIDENTAL EN PRODUCCIÓN (P17-C9)
// ============================================================================
if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_EXECUTION !== 'true') {
  console.error('\n[SEGURIDAD CRÍTICA] Ejecución abortada.');
  console.error('Este script genera datos de prueba/seed y está terminantemente PROHIBIDO en producción.');
  console.error('Para ejecutarlo en un entorno de desarrollo aislado, define explícitamente:');
  console.error('  ALLOW_SEED_EXECUTION=true y asegúrate de no apuntar a producción.\n');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log('Fetching team CADETE A...');
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id, club_id')
    .eq('name', 'CADETE A')
    .single();

  if (teamErr) {
    console.error('Error fetching team:', teamErr);
    return;
  }

  const teamId = team.id;
  const clubId = team.club_id;
  
  const playersToInsert = [
    { first_name: 'Abderrahim', last_name: 'Torqui', dorsal: '15', birth_date: '2008-01-01' },
    { first_name: 'Adam', last_name: 'Faid', dorsal: '6', birth_date: '2008-01-01' },
    { first_name: 'Adam', last_name: 'Bensaad Bentayeb', dorsal: '19', birth_date: '2008-01-01' },
    { first_name: 'Ala Eddine', last_name: 'El Allam', nickname: 'El Papi', dorsal: '21', birth_date: '2008-01-01' },
    { first_name: 'Belmaatouki', last_name: 'Mohamed', nickname: 'Bemo', dorsal: '15', birth_date: '2009-01-01' },
    { first_name: 'David', last_name: 'Mompean Andreu', dorsal: '8', birth_date: '2009-01-01' },
    { first_name: 'Edinson Yampler', last_name: 'Romero Hernández', dorsal: '24', birth_date: '2008-01-01' },
    { first_name: 'Francisco', last_name: 'Romero Fernández', dorsal: '12', birth_date: '2008-01-01' },
    { first_name: 'Ilyas', last_name: 'Zaidi Jouhari', dorsal: '17', birth_date: '2008-01-01' }
  ].map(p => ({
    ...p,
    club_id: clubId,
    team_id: teamId,
    status: 'active',
    registration_status: 'draft'
  }));

  console.log('Inserting players...');
  const { data: insertedPlayers, error: insertErr } = await supabaseAdmin
    .from('players')
    .insert(playersToInsert)
    .select();

  if (insertErr) {
    console.error('Error inserting players:', insertErr);
    return;
  }

  console.log(`Successfully inserted ${insertedPlayers.length} players.`);
  
  // Create JUAN ENTRENADOR
  const { data: adminAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'entrenador@mail.com',
    password: 'password123',
    email_confirm: true
  });
  
  if (adminAuth?.user) {
    console.log('Created coach user');
    await supabaseAdmin.from('profiles').update({
      first_name: 'JUAN',
      last_name: 'ENTRENADOR',
      role: 'coach',
      roles: ['coach'],
      club_id: clubId
    }).eq('id', adminAuth.user.id);
    
    await supabaseAdmin.from('team_coaches').insert({
      profile_id: adminAuth.user.id,
      team_id: teamId,
      club_id: clubId
    });
    console.log('Linked coach to team');
  } else {
    console.log('Auth error creating coach or coach already exists:', authErr?.message);
  }
}

seedData();
