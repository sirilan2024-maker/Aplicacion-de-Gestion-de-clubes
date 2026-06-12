-- ==========================================
-- Migración: Notificaciones y Alertas Inteligentes (IA Asistencia)
-- ==========================================

-- 1. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Si es null, es para todos los admins del club
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios ven sus notificaciones o admins ven las globales') THEN
        CREATE POLICY "Usuarios ven sus notificaciones o admins ven las globales" 
        ON public.notifications FOR SELECT TO authenticated 
        USING (
          user_id = auth.uid() OR 
          (user_id IS NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo')))
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuarios pueden marcar como leido') THEN
        CREATE POLICY "Usuarios pueden marcar como leido" 
        ON public.notifications FOR UPDATE TO authenticated 
        USING (user_id = auth.uid());
    END IF;
END $$;

-- 2. Trigger de Inteligencia (Ausencias Consecutivas)
CREATE OR REPLACE FUNCTION check_consecutive_absences()
RETURNS TRIGGER AS $$
DECLARE
  consecutive_absences INTEGER;
  player_name TEXT;
  player_club UUID;
BEGIN
  -- Solo evaluar si se acaba de registrar una ausencia
  IF NEW.status = 'absent' THEN
    
    -- Contar las últimas 3 sesiones de este jugador, ordenadas por fecha de sesión
    SELECT COUNT(*) INTO consecutive_absences
    FROM (
      SELECT a.status
      FROM public.attendance a
      JOIN public.training_sessions ts ON a.session_id = ts.id
      WHERE a.player_id = NEW.player_id
      ORDER BY ts.date DESC, ts.start_time DESC
      LIMIT 3
    ) AS last_three
    WHERE last_three.status = 'absent';

    -- Si hay 3 ausencias consecutivas, generar la alerta
    IF consecutive_absences >= 3 THEN
      -- Obtener nombre del jugador y club_id
      SELECT p.first_name || ' ' || p.last_name, e.club_id INTO player_name, player_club
      FROM public.players p
      JOIN public.equipos e ON p.team_id = e.id
      WHERE p.id = NEW.player_id;
      
      -- Insertar alerta global para los coordinadores/admins del club
      INSERT INTO public.notifications (club_id, user_id, type, title, content)
      VALUES (
        player_club, 
        NULL, -- Para todos los admins/coordinadores
        'Alerta_Asistencia', 
        '¡Alerta Crítica de Asistencia!', 
        'El jugador ' || player_name || ' ha faltado a 3 o más entrenamientos consecutivos. Se requiere intervención del coordinador o cuerpo técnico.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enganchar el trigger a la tabla de asistencia
DROP TRIGGER IF EXISTS trg_ai_check_absences ON public.attendance;
CREATE TRIGGER trg_ai_check_absences
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION check_consecutive_absences();
