# Documentación de Base de Datos y Contexto del Proyecto: ClubManager Pro

## Visión General del Proyecto
**ClubManager Pro** es una plataforma SaaS (Software as a Service) profesional diseñada para la gestión integral de un club deportivo infantil/juvenil (fútbol, baloncesto, etc.). 

El objetivo principal de la aplicación es digitalizar y centralizar la gestión deportiva, permitiendo a los administradores del club y a los entrenadores llevar un control exhaustivo de:
- Equipos y categorías.
- Jugadores y contactos de padres/tutores.
- Programación de sesiones de entrenamiento.
- Control de asistencia a entrenamientos y partidos.

## Stack Tecnológico
- **Frontend / Framework:** Next.js 15 (App Router), React.
- **Estilos:** Tailwind CSS (diseño premium inspirado en plataformas modernas como Linear y Stripe).
- **Backend / Base de Datos:** Supabase (PostgreSQL).
- **Autenticación:** Supabase Auth.
- **Lenguaje Principal:** TypeScript.

---

## Esquema de la Base de Datos (PostgreSQL)

La base de datos está diseñada de manera relacional. A continuación se detalla cada tabla, sus columnas, tipos de datos y las relaciones entre ellas.

### 1. Tabla `profiles` (Perfiles de Usuario)
Esta tabla almacena la información extendida de los usuarios (Administradores y Entrenadores). Se enlaza directamente con el sistema de autenticación (`auth.users` de Supabase).

- **id**: `UUID` (Primary Key, Foreign Key -> `auth.users(id)` con `ON DELETE CASCADE`).
- **first_name**: `TEXT` (No Nulo).
- **last_name**: `TEXT` (No Nulo).
- **role**: `TEXT` (No Nulo, Restricción: solo admite los valores `'admin'` o `'coach'`).
- **created_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).
- **updated_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).

*Nota: Existe un Trigger en la base de datos (`handle_new_user()`) que inserta automáticamente una fila en esta tabla cada vez que un usuario nuevo se registra en el sistema de autenticación.*

### 2. Tabla `teams` (Equipos)
Almacena los equipos del club. Cada equipo puede tener un entrenador asignado.

- **id**: `UUID` (Primary Key, generada automáticamente).
- **name**: `TEXT` (No Nulo).
- **category**: `TEXT` (No Nulo, Restricción: 'Prebenjamín', 'Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil').
- **coach_id**: `UUID` (Foreign Key -> `profiles(id)` con `ON DELETE SET NULL`). Si se elimina el entrenador, el equipo queda sin entrenador pero no se borra.
- **color**: `TEXT` (Por defecto `#1E40AF` - usado para UI).
- **created_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).

### 3. Tabla `players` (Jugadores)
Contiene la ficha de los deportistas, asignados a un equipo en concreto.

- **id**: `UUID` (Primary Key, generada automáticamente).
- **first_name**: `TEXT` (No Nulo).
- **last_name**: `TEXT` (No Nulo).
- **birth_date**: `DATE` (No Nulo).
- **team_id**: `UUID` (Foreign Key -> `teams(id)` con `ON DELETE SET NULL`).
- **parent_contact**: `TEXT` (No Nulo, información de contacto del tutor legal).
- **created_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).

### 4. Tabla `training_sessions` (Sesiones de Entrenamiento)
Define las fechas y ubicaciones de los entrenamientos para un equipo.

- **id**: `UUID` (Primary Key, generada automáticamente).
- **team_id**: `UUID` (No Nulo, Foreign Key -> `teams(id)` con `ON DELETE CASCADE`). Si se borra el equipo, se borran sus sesiones.
- **date_time**: `TIMESTAMP WITH TIME ZONE` (No Nulo).
- **duration_minutes**: `INTEGER` (No Nulo, por defecto `90`).
- **location**: `TEXT` (No Nulo).
- **created_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).

### 5. Tabla `attendance` (Control de Asistencia)
Cruza a los jugadores con las sesiones de entrenamiento para registrar quién ha faltado o asistido.

- **id**: `UUID` (Primary Key, generada automáticamente).
- **session_id**: `UUID` (No Nulo, Foreign Key -> `training_sessions(id)` con `ON DELETE CASCADE`).
- **player_id**: `UUID` (No Nulo, Foreign Key -> `players(id)` con `ON DELETE CASCADE`).
- **status**: `TEXT` (No Nulo, Restricción: `'present'` (presente), `'absent'` (ausente), `'excused'` (justificado)).
- **created_at**: `TIMESTAMP WITH TIME ZONE` (Por defecto `now()`).

*Nota: Posee una restricción `UNIQUE(session_id, player_id)` para asegurar que un jugador no pueda tener dos registros de asistencia en la misma sesión.*

---

## Reglas de Seguridad (Row Level Security - RLS)

Supabase implementa seguridad a nivel de base de datos (RLS) para prevenir accesos no autorizados a la información. El proyecto cuenta con las siguientes políticas:

1. **Lectura (SELECT):** Todos los usuarios autenticados pueden ver la información de perfiles, equipos, jugadores, entrenamientos y asistencias.
2. **Escritura y Edición en Perfiles:** Un usuario solo puede actualizar su *propio* perfil.
3. **Escritura en Equipos:** Solo los administradores (`role = 'admin'`) pueden crear nuevos equipos.
4. **Modificación de Equipos/Jugadores/Sesiones/Asistencia:** Estas entidades pueden ser modificadas por administradores, O BIEN por el entrenador en cuestión (verificando que el `coach_id` del equipo coincida con el ID del usuario autenticado).
