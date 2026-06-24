-- 1. Eliminar la restricción estricta antigua que obligaba a los jugadores a estar en 'equipos'
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- 2. Migrar los jugadores huérfanos a los nuevos equipos basándonos en el nombre del equipo
UPDATE public.players p
SET team_id = t.id
FROM public.equipos e
JOIN public.teams t ON lower(t.name) = lower(e.name)
WHERE p.team_id = e.id;

-- 3. Limpiar cualquier jugador de equipos que ya no existen (ej. Infantil C) poniéndolo como 'Sin equipo'
UPDATE public.players
SET team_id = NULL
WHERE team_id NOT IN (SELECT id FROM public.teams);

-- 4. Volver a activar la seguridad de la base de datos apuntando a la tabla 'teams' correcta
ALTER TABLE public.players
ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
