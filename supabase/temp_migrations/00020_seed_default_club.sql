-- ==========================================
-- CREACIÓN DEL CLUB POR DEFECTO
-- ==========================================

DO $$ 
DECLARE
  nuevo_club_id UUID;
BEGIN
  -- 1. Insertamos un club por defecto (Sporting Saladar) y guardamos su ID
  -- Añadido el campo 'slug' que es obligatorio
  INSERT INTO public.clubs (name, slug) 
  VALUES ('Sporting Saladar', 'sporting-saladar') 
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO nuevo_club_id;

  -- 2. Le asignamos este nuevo club a todos los usuarios que no tengan ninguno
  UPDATE public.profiles 
  SET club_id = nuevo_club_id 
  WHERE club_id IS NULL;

  -- (Opcional) Si hay jugadores huérfanos sin club, también se lo asignamos
  UPDATE public.players 
  SET club_id = nuevo_club_id 
  WHERE club_id IS NULL;
  
  -- (Opcional) Si hay equipos huérfanos sin club, se lo asignamos
  UPDATE public.teams 
  SET club_id = nuevo_club_id 
  WHERE club_id IS NULL;
END $$;
