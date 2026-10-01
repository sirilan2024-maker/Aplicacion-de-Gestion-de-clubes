-- =========================================================================
-- ESQUEMA Y VISTAS PARA EL PANEL DE COORDINADOR DEPORTIVO
-- Sporting Saladar - Temporada Activa 26/27 (Reglas FFCV)
-- =========================================================================

-- 1. Tabla / Vista: Equipos del club
-- Mapea directamente con la tabla existente 'teams'
CREATE OR REPLACE VIEW v_coordinator_teams AS
SELECT 
    t.id,
    t.name AS nombre,
    t.category AS categoria,
    t.color,
    t.season_id,
    t.ffcv_competition_id,
    t.ffcv_group_id,
    t.coach_id,
    p.first_name || ' ' || COALESCE(p.last_name, '') AS entrenador_nombre
FROM teams t
LEFT JOIN profiles p ON t.coach_id = p.id
WHERE t.season_id != '584f508a-fc1a-4339-b5b2-4296ffde2f4c'; -- Excluye temp 25/26 archivada

-- 2. Tabla / Vista: Jugadores del club
-- Mapea con 'players'
CREATE OR REPLACE VIEW v_coordinator_players AS
SELECT 
    pl.id,
    pl.team_id,
    pl.first_name AS nombre,
    pl.last_name AS apellidos,
    pl.dorsal,
    pl.status AS estado_jugador,
    pl.health_status AS estado_salud,
    pl.injury_details AS detalles_lesion
FROM players pl
WHERE pl.status != 'inactive';

-- 3. Tabla / Estructura para Tarjetas de Partidos y Disciplina FFCV
-- En la base de datos real, las tarjetas se auditan en 'convocatorias' y 'ffcv_matches'
-- Esta estructura formaliza la acumulación según la normativa FFCV
CREATE TABLE IF NOT EXISTS tarjetas_partidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partido_id UUID REFERENCES partidos(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES players(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    jornada INTEGER,
    tipo_tarjeta VARCHAR(20) CHECK (tipo_tarjeta IN ('amarilla', 'doble_amarilla', 'roja_directa')),
    minuto INTEGER,
    motivo TEXT,
    cuenta_para_ciclo BOOLEAN DEFAULT TRUE, -- FALSE para doble amarilla
    sancion_cumplida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Estructura de Asistencia a Entrenamientos
CREATE TABLE IF NOT EXISTS asistencia_entrenamientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    session_id UUID,
    fecha DATE NOT NULL,
    total_convocados INTEGER DEFAULT 0,
    asistentes INTEGER DEFAULT 0,
    ausentes INTEGER DEFAULT 0,
    justificados INTEGER DEFAULT 0,
    porcentaje_asistencia NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_convocados > 0 THEN ROUND((asistentes::numeric / total_convocados::numeric) * 100, 2) ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Agenda de Entrenamientos y Distribución de Campos
CREATE TABLE IF NOT EXISTS entrenamientos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    campo VARCHAR(100) NOT NULL, -- 'Campo 1 (F11)', 'Campo 2 (F8 A)', etc.
    dia_semana INTEGER CHECK (dia_semana BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    entrenador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices recomendados para optimización del Panel de Coordinador
CREATE INDEX IF NOT EXISTS idx_partidos_equipo_season ON partidos(equipo_id, season_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_team_events_date_location ON team_events(date, location, start_time);
CREATE INDEX IF NOT EXISTS idx_convocatorias_cards ON convocatorias(player_id, yellow_cards, red_cards);
