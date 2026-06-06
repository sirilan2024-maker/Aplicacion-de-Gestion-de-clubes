const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan las credenciales de Supabase en .env.local");
  process.exit(1);
}

// Ignorar error de TLS en local
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const cadeteMembers = [
  { first_name: 'Adam', last_name: 'Bensaad Bentayeb', email: 'Adambensaad591@gmail.com', role: 'Jugador' },
  { first_name: 'Ala Eddine', last_name: 'El Allam', nickname: 'El papi', email: 'elallamaladdin75@gmail.com', position: 'Mediocampista', jersey_number: 7, role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Etouzani', email: 'touzanimohamd67@gmail.com', birth_date: '2010-08-07', phone: '+34602721198', role: 'Jugador' },
  { first_name: 'Adam', last_name: 'Faid', email: 'jadusfarus@gmail.com', birth_date: '2010-03-27', height: 1.77, weight: 65, position: 'Delantero', jersey_number: 18, role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Farsi', email: 'farsimohamedmbitil@gmail.com', role: 'Jugador' },
  { first_name: 'Elias Jhon', last_name: 'Franco', email: 'francoeliasjhon@gmail.com', arrival_year: 2024, position: 'Defensor', jersey_number: 4, role: 'Jugador' },
  { first_name: 'Mohamed amin', last_name: 'Kassari', email: 'mohamedaminkassari10@gmail.com', birth_date: '2010-12-30', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Belmaatouki', nickname: 'Belma', email: 'mohamedbunda@gmail.com', parent_contact: 'elbelma998@gmail.com', birth_date: '2010-08-13', arrival_year: 2024, height: 1.79, weight: 59, position: 'Defensor', jersey_number: 14, role: 'Jugador' },
  { first_name: 'David', last_name: 'Mompean Andreu', email: 'davidmoan.es@gmail.com', birth_date: '2010-12-28', jersey_number: 47, role: 'Jugador' },
  { first_name: 'Francois', last_name: 'Obele mvondo', email: 'mvondo261330@gmail.com', birth_date: '1989-11-26', phone: '+34640056460', role: 'Entrenador' },
  { first_name: 'Morad', last_name: 'Rgabi', email: 'regabimorad@gmail.com', phone: '+34602029357', role: 'Jugador' },
  { first_name: 'Rafael', last_name: 'Rodriguez cabrera', email: 'rodriguezcabrerarafael33@gmail.com', role: 'Jugador' },
  { first_name: 'Francisco', last_name: 'Romero Fernández', email: 'francisco@placeholder.com', role: 'Jugador' },
  { first_name: 'Edinson Yampier', last_name: 'Romero Hernández', parent_contact: 'lidishernandez1983@gmail.com', email: 'karolrhernandez1904@gmail.com', role: 'Jugador' },
  { first_name: 'Juan Jose', last_name: 'Ruano Garcia', email: 'Juanjoo.rg.2010@gmail.com', phone: '+34623533480', role: 'Jugador' },
  { first_name: 'Marcos', last_name: 'Rufete albaladejo', email: 'marcosrufetealba10@gmail.com', birth_date: '2010-10-30', position: 'Defensor central', jersey_number: 3, role: 'Jugador' },
  { first_name: 'Oliver', last_name: 'Sánchez Pérez', email: 'megadede12345jose@gmail.com', role: 'Jugador' },
  { first_name: 'Alvaro', last_name: 'Sola Bailen', email: 'alvarosolabailen@gmail.com', arrival_year: 2024, role: 'Entrenador' },
  { first_name: 'Abderrahim', last_name: 'Torqui', email: 'talaltorqui@gmail.com', parent_contact: 'rachidtorqui111@gmail.com', position: 'Mediocampista ofensivo', jersey_number: 10, role: 'Jugador' },
  { first_name: 'Manuel', last_name: 'Vicente Caracena', email: 'manuelcaracena11@gmail.com', parent_contact: 'terecaracena1978@gmail.com', role: 'Jugador' },
  { first_name: 'Mohamed', last_name: 'Wahab', email: 'loujaynewahab12345@gmail.com', birth_date: '2010-04-26', phone: '+34611306190', role: 'Jugador' },
  { first_name: 'Ilyas', last_name: 'Zaidi Jouhari', email: 'ilyaszaidi97@gmail.com', birth_date: '2011-01-11', phone: '+34747464865', role: 'Jugador' },
  { first_name: 'Lucas', last_name: 'Zamora Tomás', parent_contact: 'mariaangelestomaspascual@gmail.com', email: 'lucas@placeholder.com', position: 'Delantero', role: 'Jugador' }
];

async function seed() {
  console.log("Iniciando seed de CADETE A (Datos Enriquecidos)...");

  // 1. Obtener el club_id (LAS VEGAS)
  const { data: clubData, error: clubError } = await supabase.from('clubs').select('id').eq('name', 'LAS VEGAS').single();
  if (clubError || !clubData) {
    console.error("Error al obtener el club LAS VEGAS:", clubError);
    return;
  }
  const club_id = clubData.id;

  // 2. Obtener el team_id (CADETE A)
  const { data: teamData, error: teamError } = await supabase.from('teams').select('id').eq('name', 'CADETE A').single();
  if (teamError || !teamData) {
    console.error("Error al obtener el equipo CADETE A:", teamError);
    return;
  }
  const team_id = teamData.id;

  // 3. Preparar e insertar jugadores usando UPSERT basado en email/nombre o borrar e insertar
  console.log("Limpiando jugadores antiguos del equipo CADETE A...");
  await supabase.from('players').delete().eq('team_id', team_id);

  console.log("Insertando jugadores enriquecidos...");
  const playersToInsert = cadeteMembers.map(m => {
    return {
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      parent_contact: m.parent_contact || m.email || 'N/A',
      birth_date: m.birth_date || '2010-01-01',
      team_id: team_id,
      club_id: club_id,
      posicion: m.position ? m.position.toLowerCase() : m.role.toLowerCase(), // role as fallback
      email_verified: true,
      
      // Nuevos campos
      nickname: m.nickname || null,
      phone: m.phone || null,
      height: m.height || null,
      weight: m.weight || null,
      arrival_year: m.arrival_year || null,
      dorsal: m.jersey_number || null // Mapeado a 'dorsal' que ya existe (o usar jersey_number si la migración lo creó nuevo)
    };
  });

  const { data: insertData, error: insertError } = await supabase
    .from('players')
    .insert(playersToInsert)
    .select();

  if (insertError) {
    console.error("Error al insertar los jugadores:", insertError);
  } else {
    console.log(`¡Éxito! Se han importado ${insertData.length} miembros correctamente con todos sus datos extendidos al equipo CADETE A.`);
  }
}

seed();
