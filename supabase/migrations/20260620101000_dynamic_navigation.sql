-- ============================================================
-- MÓDULO: SISTEMA DE NAVEGACIÓN DINÁMICA
-- ============================================================

-- 1. Tabla de ítems de navegación (todas las opciones posibles)
CREATE TABLE IF NOT EXISTS public.app_navigation (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 2. Tabla relacional role -> navigation
CREATE TABLE IF NOT EXISTS public.role_navigation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL,
  nav_id TEXT REFERENCES public.app_navigation(id) ON DELETE CASCADE,
  UNIQUE(role, nav_id)
);

-- Habilitar RLS
ALTER TABLE public.app_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_navigation ENABLE ROW LEVEL SECURITY;

-- Políticas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'App navigation is public') THEN
        CREATE POLICY "App navigation is public" ON public.app_navigation FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Role navigation is public') THEN
        CREATE POLICY "Role navigation is public" ON public.role_navigation FOR SELECT TO authenticated USING (true);
    END IF;
    -- Solo admin puede modificar (se hará a través del panel en un futuro, o requiere RLS para admins)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can modify role_navigation') THEN
        CREATE POLICY "Admins can modify role_navigation" ON public.role_navigation FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- 3. Inserción de datos iniciales
INSERT INTO public.app_navigation (id, label, path, icon_name, sort_order) VALUES
('inicio', 'Inicio', '/dashboard', 'Home', 1),
('club', 'Directorio', '/dashboard/club/miembros', 'Users', 2),
('equipos', 'Equipos', '/dashboard/equipos', 'Target', 3),
('partidos', 'Partidos', '/dashboard/matches', 'Swords', 4),
('eventos', 'Eventos', '/dashboard/events', 'Calendar', 5),
('estadisticas', 'Estadísticas', '/dashboard/club/estadisticas', 'BarChart3', 6),
('disciplina', 'Disciplina', '/dashboard/club/estadisticas/disciplina', 'AlertTriangle', 7),
('banco_tareas', 'Banco de Tareas', '/dashboard/entrenamientos', 'Database', 8),
('mis_equipos', 'Mis Equipos', '/dashboard/mis-equipos', 'Shield', 9),
('mi_perfil', 'Mi Perfil', '/dashboard/mi-perfil', 'User', 10)
ON CONFLICT (id) DO UPDATE SET 
  label = EXCLUDED.label, 
  path = EXCLUDED.path, 
  icon_name = EXCLUDED.icon_name, 
  sort_order = EXCLUDED.sort_order;

-- Permisos por defecto para 'admin' (ve todo menos 'mis_equipos' que es más de entrenador, aunque puede ver Equipos globales)
INSERT INTO public.role_navigation (role, nav_id) VALUES
('admin', 'inicio'), ('admin', 'club'), ('admin', 'equipos'), ('admin', 'partidos'), ('admin', 'eventos'), ('admin', 'estadisticas'), ('admin', 'disciplina'), ('admin', 'banco_tareas')
ON CONFLICT DO NOTHING;

-- Permisos solicitados para 'coordinador'
-- "Inicio, Partidos, Disciplina, Eventos, Club Directorio, Estadísticas, Equipos, Banco de Tareas"
INSERT INTO public.role_navigation (role, nav_id) VALUES
('coordinador', 'inicio'), ('coordinador', 'club'), ('coordinador', 'equipos'), ('coordinador', 'partidos'), ('coordinador', 'eventos'), ('coordinador', 'estadisticas'), ('coordinador', 'disciplina'), ('coordinador', 'banco_tareas')
ON CONFLICT DO NOTHING;

-- Permisos por defecto para 'entrenador'
INSERT INTO public.role_navigation (role, nav_id) VALUES
('entrenador', 'inicio'), ('entrenador', 'mis_equipos'), ('entrenador', 'partidos'), ('entrenador', 'eventos'), ('entrenador', 'estadisticas'), ('entrenador', 'banco_tareas')
ON CONFLICT DO NOTHING;

-- Permisos por defecto para 'jugador' y 'tutor'
INSERT INTO public.role_navigation (role, nav_id) VALUES
('jugador', 'inicio'), ('jugador', 'mi_perfil'), ('jugador', 'eventos'),
('tutor', 'inicio'), ('tutor', 'mi_perfil'), ('tutor', 'eventos')
ON CONFLICT DO NOTHING;
