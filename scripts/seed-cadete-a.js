const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
for (let line of env) {
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...rest] = line.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

// Desactiva la verificación de TLS para el entorno local si es necesario
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Usamos el SERVICE_ROLE_KEY para saltarnos el RLS al insertar (modo Admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const cadeteMembers = [
  { first_name: 'Adam', last_name: 'Bensaad Bentayeb', email: 'Adambensaad591@gmail.com', role: 'Jugador' },
  { first_name: 'Ala Eddine', last_name: 'El Allam', email: 'elallamaladdin75@gmail.com', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Etouzani', email: 'touzanimohamd67@gmail.com', birth_date: '2010-08-07', role: 'Jugador' },
  { first_name: 'Adam', last_name: 'Faid', email: 'jadusfarus@gmail.com', birth_date: '2010-03-27', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Farsi', email: 'farsimohamedmbitil@gmail.com', role: 'Jugador' },
  { first_name: 'Elias Jhon', last_name: 'Franco', email: 'francoeliasjhon@gmail.com', role: 'Jugador' },
  { first_name: 'Mohamed amin', last_name: 'Kassari', email: 'mohamedaminkassari10@gmail.com', birth_date: '2010-12-30', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Belmaatouki', email: 'mohamedbunda@gmail.com', parent_contact: 'elbelma998@gmail.com', birth_date: '2010-08-13', role: 'Jugador' },
  { first_name: 'David', last_name: 'Mompean Andreu', email: 'davidmoan.es@gmail.com', birth_date: '2010-12-28', role: 'Jugador' },
  { first_name: 'Francois', last_name: 'Obele mvondo', email: 'mvondo261330@gmail.com', birth_date: '1989-11-26', role: 'Entrenador' },
  { first_name: 'Morad', last_name: 'Rgabi', email: 'regabimorad@gmail.com', role: 'Jugador' },
  { first_name: 'Rafael', last_name: 'Rodriguez cabrera', email: 'rodriguezcabrerarafael33@gmail.com', role: 'Jugador' },
  { first_name: 'Francisco', last_name: 'Romero Fernández', email: 'francisco@placeholder.com', role: 'Jugador' },
  { first_name: 'Edinson Yampier', last_name: 'Romero Hernández', parent_contact: 'lidishernandez1983@gmail.com', email: 'karolrhernandez1904@gmail.com', role: 'Jugador' },
  { first_name: 'Juan Jose', last_name: 'Ruano Garcia', email: 'Juanjoo.rg.2010@gmail.com', role: 'Jugador' },
  { first_name: 'Marcos', last_name: 'Rufete albaladejo', email: 'marcosrufetealba10@gmail.com', birth_date: '2010-10-30', role: 'Jugador' },
  { first_name: 'Oliver', last_name: 'Sánchez Pérez', email: 'megadede12345jose@gmail.com', role: 'Jugador' },
  { first_name: 'Alvaro', last_name: 'Sola Bailen', email: 'alvarosolabailen@gmail.com', role: 'Jugador' },
  { first_name: 'Abderrahim', last_name: 'Torqui', email: 'talaltorqui@gmail.com', parent_contact: 'rachidtorqui111@gmail.com', role: 'Jugador' },
  { first_name: 'Manuel', last_name: 'Vicente Caracena', email: 'manuelcaracena11@gmail.com', parent_contact: 'terecaracena1978@gmail.com', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Wahab', email: 'loujaynewahab12345@gmail.com', birth_date: '2010-04-26', role: 'Jugador' },
  { first_name: 'Ilyas', last_name: 'Zaidi Jouhari', email: 'ilyaszaidi97@gmail.com', birth_date: '2011-01-11', role: 'Jugador' },
  { first_name: 'Lucas', last_name: 'Zamora Tomás', parent_contact: 'mariaangelestomaspascual@gmail.com', email: 'lucas@placeholder.com', role: 'Jugador' }
];

async function seed() {
  console.log("Iniciando seed de CADETE A...");

  // 1. Obtener el club_id (¡Tiene que ser LAS VEGAS o el club activo del usuario!)
  const { data: clubData, error: clubError } = await supabase.from('clubs').select('id').eq('name', 'LAS VEGAS').single();
  if (clubError || !clubData) {
    console.error("Error al obtener el club:", clubError);
    return;
  }
  const club_id = clubData.id;
  console.log("Club ID encontrado:", club_id);

  // 2. Crear el equipo en 'equipos'
  const newEquipo = {
    name: 'CADETE A',
    sport: 'Fútbol',
    gender: 'Masculino',
    color: '#3B82F6',
    invite_code: 'CADETE2026',
    age_group: 'Sub-16',
    format: 'Fútbol 11',
    members: cadeteMembers.length
  };

  const { data: equipoData, error: equipoError } = await supabase
    .from('equipos')
    .insert([newEquipo])
    .select('id')
    .single();

  if (equipoError) {
    console.error("Error al crear en equipos:", equipoError);
    return;
  }
  
  const team_id = equipoData.id;
  
  // Crear el equipo en 'teams' (que es la tabla principal para plantilla y estadisticas)
  const newTeam = {
    id: team_id,
    name: 'CADETE A',
    club_id: club_id,
    category: 'Cadete',
    color: '#3B82F6'
  };

  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .insert([newTeam])
    .select('id')
    .single();

  if (teamError) {
    console.error("Error al crear el equipo en teams:", teamError);
  }
  
  console.log("Equipo creado en ambas tablas con ID:", team_id);

  // 3. Preparar los datos de los jugadores para inserción
  const playersToInsert = cadeteMembers.map(m => {
    return {
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      parent_contact: m.parent_contact || m.email || 'N/A',
      birth_date: m.birth_date || '2010-01-01',
      team_id: team_id,
      club_id: club_id,
      posicion: m.role.toLowerCase(), // 'jugador' o 'entrenador'
      email_verified: true, // Forzamos email_verified: true como pediste
      verification_token: null // Ya está verificado
    };
  });

  // 4. Inserción masiva
  const { data: insertedPlayers, error: playersError } = await supabase
    .from('players')
    .insert(playersToInsert)
    .select('id');

  if (playersError) {
    console.error("Error al insertar los jugadores:", playersError);
    return;
  }

  console.log(`¡Éxito! Se han importado ${insertedPlayers.length} miembros correctamente al equipo CADETE A.`);
}

seed();
