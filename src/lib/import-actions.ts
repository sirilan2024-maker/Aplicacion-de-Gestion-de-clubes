"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

const SPORTING_SALADAR_DATA = [
  {
    "name": "Infantil Brave", "category": "Infantil",
    "staff": [{"name": "Manolo", "role": "Entrenador"}],
    "players": ["Amin Ziani", "Ayoud Badoun", "Manuel Ballester", "Alessandro Becerra", "Miguel Bonillo", "Akram Debdoubi", "Mustafa El Orf", "Noamane Ess Salihy", "Adrián Fabra", "Daniel Ferrandez", "Pablo Gascón", "Alejandro Girona", "Manuel Girona", "Miguel Ángel Girona", "Abdelilah Hsine", "Abdelali Laassiri", "Imrane Lekhdassi", "Rubén Lorenzo", "Juan Rodrigo Muñoz", "Joel Pascual", "Mounir Sadir", "Rayane Soukrat"]
  },
  {
    "name": "Cadete A", "category": "2ª Regional Cadete - Gr 8",
    "staff": [{"name": "Víctor Manuel Reina", "role": "Entrenador"}, {"name": "Francois Obele", "role": "Delegado"}],
    "players": ["Mohammed Atouzani", "Mohammed Belmaatouki", "Adam Bensaad", "Ala Eddine El Allam", "Adam Faid", "Mohamed Farsi", "Jhon Franco", "Mohammed Amin Kassari", "David Mompean", "Mourad Rgabi", "Rafael Rodriguez", "Francisco Romero", "Edinson Yampier Romero", "Juan Jose Ruano", "Marcos Rufete", "Oliver Sanchez", "Abderrahim Talal Torqui", "Manuel Vicente", "Mohammed Wahab", "Ilyas Zaidi"]
  },
  {
    "name": "Cadete B", "category": "2ª Regional Cadete - Gr 7",
    "staff": [{"name": "Pablo Gascón Gumbao", "role": "Entrenador"}],
    "players": ["Pepe Abadia", "Mohamed Islam Aharram", "Ali Archi", "Osama El Aghlid", "Mohamed El Khayal", "Adam El Ouafir", "Raid El Oufi", "Jose Manuel Garcia", "Dario Garcia", "Mohammed Amine Gnaoui", "Rayan Guenfoudi", "Jose Miguel Hernandez", "Salah Eddine Khai", "Yassir Mahdad", "Emilio Mena", "Marcos Ponce", "Mohammed Ashraf Rahhou", "Adam Razzougui", "Ismail Salhi", "Emmanuel Valencia"]
  },
  {
    "name": "Infantil A", "category": "2ª Regional Infantil - Gr 8",
    "staff": [{"name": "Alejandro Carrillo", "role": "Entrenador"}, {"name": "Manuel Espinosa", "role": "Delegado"}],
    "players": ["Rayane Abadou", "Mohamed Ammou", "Nadir Azaroual", "Sergio Manuel Bas", "Imran Bassim", "Rida Bejji", "Youssef Bouayad", "Youssef El Kiali", "Luis Martinez", "Mario Mas", "Fernando Mora", "Nicolas Ñiguez", "Azeddine Qotbi", "Redwan Regragui", "Adriano Jose Rivas", "Samuel Rodríguez", "Adam Salhi", "Adam Tisghit", "Mathias Vasquez", "Safouane Wahab"]
  },
  {
    "name": "Infantil B", "category": "2ª Regional Infantil - Gr 7",
    "staff": [{"name": "Juan Pablo Garcia", "role": "Entrenador"}, {"name": "Martin Alarcia", "role": "Delegado"}, {"name": "Yonai Culiáñez", "role": "Delegado"}],
    "players": ["Soufian Barda", "Senen Brotons", "Thiago Camacho", "Naofal El Harti", "Ayoub El Koulali", "Marcos Escribano", "Mario Garcia", "Pablo Garcia", "Izan Garcia", "Alvaro Hernandez", "Mohammed Maamar", "Mario Maciá", "Biel Martin", "Ricardo Martinez", "Gustavo Paredes", "Mario Pastor", "Jose Peñafiel", "Unai Ruiz"]
  },
  {
    "name": "Juvenil A", "category": "3ª FFCV Juvenil - Gr 26",
    "staff": [{"name": "Borja Moreno", "role": "Entrenador"}, {"name": "Vicente Serna", "role": "Delegado"}],
    "players": ["Juanma Andreu", "Zakarya Belghiti", "Omar El Allam", "Mohamed Amin El Orf", "Ismail El Orf", "Jose Luis Fernandez", "Fidel Galant", "Martin Garcia", "Mohammed Khaef Allah", "Mohammed Amine Laasiri", "Younes Lafkiar", "Yousef Louzani", "Mohammed Mahdad", "Morad Mahdad", "Mario Mula", "Manuel Narejos", "Tomas Parres", "Francisco Rafael Rebollo", "Adrian Josue Rivas", "Badre Sami"]
  },
  {
    "name": "Juvenil B", "category": "3ª FFCV Juvenil - Gr 25",
    "staff": [{"name": "Alejandro Fructuoso", "role": "Entrenador"}, {"name": "Mateo Agustin Gomez", "role": "Delegado"}, {"name": "Cristian Montero", "role": "Delegado"}],
    "players": ["Adem Aderdour", "Ayoub Allaoui", "Leo Berenguer", "Adam Bouqetyb", "Mario Cañizares", "Morad El Harti", "Mohammed Essahal", "Pedro Jose Ferrer", "Houssam Kalouki", "Adnan Lekhdassi", "Denis Lukiyanov", "Yerai Montero", "Hugo Perez", "Merouane Qotbi", "Ilias Rahhou", "Walid Torqui", "Mohammed Tourqui Berrfai"]
  },
  {
    "name": "Senior", "category": "Segona FFCV - Gr 8",
    "staff": [{"name": "Jose Lorenzo Gil", "role": "Entrenador"}, {"name": "Dario Serna", "role": "Delegado"}, {"name": "Alberto Fernández", "role": "Ayudante Sanitario"}],
    "players": ["Guillermo Ballester", "Aaron Cuneo", "El Mahdi El Orf", "Youssef Elorf", "Manuel Espinosa", "Fernando Fabregat", "Oscar Girona", "Mateo Agustin Gomez", "Angel Antonio Griñan", "Manuel Guirao", "Anass Jebbouri", "Salah Eddine Lekhdassi", "Sofian Lekhdassi", "Cristian Montero", "Jose A Morell", "Francisco J Murcia", "Pablo Ortiz", "Justiniano Agustin Perez", "Miguel Angel Rueda", "Alejandro Trigueros"]
  }
]

export async function importSportingSaladarData(clubId: string) {
  const supabase = await createClient()

  // 1. Get current admin profile ID to assign as team's coach_id for backwards compatibility
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  let importedTeams = 0

  for (const teamData of SPORTING_SALADAR_DATA) {
    // A. Insert Team
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        category: teamData.category,
        club_id: clubId,
        coach_id: user.id // Set creator as primary coach to satisfy existing logic
      })
      .select('id')
      .single()

    if (teamError) {
      console.error("Error creating team:", teamError)
      return { success: false, error: "Error creando equipo: " + teamError.message }
    }

    // B. Handle Staff (team_coaches)
    for (const member of teamData.staff) {
      // 1. Create a dummy profile for the staff member
      // Since profiles is tied to auth.users, we can't easily insert into profiles without creating an auth user.
      // Wait, profiles is tied to auth.users via foreign key.
      // We must insert a fake auth.users row OR create a separate table.
      // Actually, if we just want them to appear, maybe we can just create an auth user via admin api? 
      // This is a known Supabase limitation. We can't insert into `profiles` if `id` must reference `auth.users(id)`.
      
      // Let's create an auth user using a dummy email for the staff member
      const dummyEmail = `${member.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${Math.random().toString(36).substring(2, 8)}@sportingsaladar.temp`
      const dummyPassword = "TempPassword123!"
      
      const adminSupabase = createAdminClient()
      
      // We use admin.createUser to avoid overwriting the current user's session
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: dummyEmail,
        password: dummyPassword,
        email_confirm: true,
        user_metadata: {
          first_name: member.name,
          last_name: "Staff",
          role: "coach",
          club_id: clubId
        }
      })

      let profileId = authData.user?.id
      
      // If error (e.g. email exists), we can fetch the existing profile by first_name
      if (authError || !profileId) {
        const { data: existingProfiles, error: fetchErr } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('first_name', member.name)
          .eq('club_id', clubId)
          .limit(1)
        
        if (existingProfiles && existingProfiles.length > 0) {
          profileId = existingProfiles[0].id
        } else {
           return { success: false, error: `Auth Error: ${authError?.message}. Al intentar recuperar el perfil existente, falló: ${fetchErr?.message || 'No encontrado'}` }
        }
      }

      if (profileId) {
        // Insert into team_coaches
        const { error: coachError } = await supabase
          .from('team_coaches')
          .insert({
            team_id: newTeam.id,
            profile_id: profileId,
            role: member.role,
            club_id: clubId
          })
        if (coachError) {
          console.error("Error creating team_coaches:", coachError)
          return { success: false, error: "Error insertando staff (" + member.name + "): " + coachError.message }
        }
      } else {
        return { success: false, error: `No se pudo crear auth user para el staff: ${member.name}. Motivo: ${authError?.message || "Desconocido"}` }
      }
    }

    // C. Handle Players
    const playersToInsert = teamData.players.map(playerName => {
      const parts = playerName.split(' ')
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ') || "Sin apellido"
      return {
        first_name: firstName,
        last_name: lastName,
        birth_date: "2010-01-01", // Default birth date
        team_id: newTeam.id,
        club_id: clubId,
        parent_contact: "Pendiente"
      }
    })

    const { error: playersError } = await supabase
      .from('players')
      .insert(playersToInsert)

    if (playersError) {
      console.error("Error creating players for team:", newTeam.id, playersError)
      return { success: false, error: "Error insertando jugadores: " + playersError.message }
    }

    importedTeams++
  }

  revalidatePath('/dashboard/equipos')
  return { success: true, count: importedTeams }
}
