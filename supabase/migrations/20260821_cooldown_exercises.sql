-- 20260821_cooldown_exercises.sql
-- Inserción de tareas pedagógicas y fisiológicas de VUELTA A LA CALMA / REGENERACIÓN (Carga <= 2, Oposición <= 2)
-- Para todas las categorías: U6 a Senior

INSERT INTO public.banco_ejercicios (
    club_id,
    nombre, tipo, familia, fuente, descripcion,
    objetivo_tecnico, objetivo_tactico,
    categoria_edad, age_category,
    dificultad, duracion_recomendada,
    min_players, max_players,
    material, variantes, tags,
    bloque_sesion, carga_fisica, carga_cognitiva, oposicion, representatividad,
    intensity_level, game_phase, drill_structure,
    espacio, criterios_exito,
    source, source_url, author, license, is_verified
) VALUES 
-- 1. U6 / Querubín
(
    (SELECT id FROM public.clubs LIMIT 1),
    'El Jardín de las Estatuas Relajantes',
    'Analítico', 'PSICOSOCIAL', 'Metodología Sporting Saladar',
    'Caminar suavemente por el espacio botando el balón con las manos y pies. A la señal del entrenador, convertirse en estatua respirando profundamente y estirando brazos y piernas.',
    ARRAY['control suave', 'equilibrio'],
    ARRAY['percepción corporal', 'vuelta a la calma'],
    ARRAY['querubin'], 'querubin',
    1, 8, 4, 16,
    ARRAY['balones', 'conos'],
    ARRAY['Estiramiento imitando animales altos (jirafas)'],
    ARRAY['u6', 'vuelta_calma', 'respiracion', 'regenerativo'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'individual_technical',
    '15x15m', ARRAY['Bajar pulsaciones', 'Respiración diafragmática pausada'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 2. U8 / Prebenjamín
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Rueda de Pases Suaves y Respiración Consciente',
    'Analítico', 'TÉCNICA', 'Metodología Sporting Saladar',
    'En círculo amplio de 12 jugadores, pase rodado suave a ras de suelo diciendo el nombre del compañero. Tras dar el pase, realizar estiramiento dinámico de tren inferior.',
    ARRAY['pase suave', 'control amortiguado'],
    ARRAY['cohesión', 'bajada de frecuencia cardíaca'],
    ARRAY['prebenjamin'], 'prebenjamin',
    1, 10, 6, 16,
    ARRAY['balones', 'conos'],
    ARRAY['Pase con pierna no dominante'],
    ARRAY['u8', 'vuelta_calma', 'estiramientos', 'técnica_suave'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'passing_pattern',
    'Círculo central', ARRAY['Pase medido al pie', 'Disminución progresiva del ritmo respiratorio'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 3. U10 / Benjamín
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Circulación Lenta en Cuadrante y Flexibilidad Asistida',
    'Analítico', 'FÍSICO', 'Metodología Sporting Saladar',
    'Trote regenerativo suave combinando pases a dos toques en parejas a lo ancho del campo, seguido de bloque de 5 minutos de estiramientos estáticos de isquiotibiales, cuádriceps y gemelos.',
    ARRAY['pase de descarga'],
    ARRAY['comunicación post-sesión', 'recuperación activa'],
    ARRAY['benjamin'], 'benjamin',
    1, 10, 8, 18,
    ARRAY['balones', 'picas'],
    ARRAY['Movilidad de cadera y aductores'],
    ARRAY['u10', 'vuelta_calma', 'flexibilidad', 'regenerativo'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'passing_pattern',
    'Medio campo', ARRAY['Control del rango articular', 'Retorno a FC basal'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 4. U12 / Alevín
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Rondo Regenerativo 6v1 a Ritmo Pausado y Movilidad',
    'Rondo', 'TÉCNICA', 'Metodología Sporting Saladar',
    'Rondo amplio de 15x15m con 1 solo defensor pasivo. Se busca circulación lenta sin aceleraciones bruscas, favoreciendo la recuperación de lactato y feedback verbal de la sesión.',
    ARRAY['pase de seguridad', 'control orientado suave'],
    ARRAY['conservación a bajo ritmo'],
    ARRAY['alevin'], 'alevin',
    1, 10, 7, 14,
    ARRAY['petos', 'balones'],
    ARRAY['Máximo 3 toques para pausar el juego'],
    ARRAY['u12', 'vuelta_calma', 'rondo_regenerativo', 'feedback'],
    'vuelta_calma', 1, 2, 1, 2,
    1, 'general', 'rondo',
    '15x15m', ARRAY['Cero aceleraciones de alta intensidad', 'Pases precisos sin impacto articular'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 5. U14 / Infantil
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Secuencia de Movilidad Miofascial y Rutina Regenerativa',
    'Analítico', 'FÍSICO', 'Metodología Sporting Saladar',
    'Protocolo guiado de trote regenerativo en zig-zag suave + rutina de estiramientos activos globales (cadena posterior, psoas, glúteo y aductores) complementada con hidratación y charla de cierre.',
    ARRAY['coordinación básica'],
    ARRAY['conciencia postural', 'higiene deportiva'],
    ARRAY['infantil'], 'infantil',
    1, 10, 10, 22,
    ARRAY['conos', 'esterillas (opcional)'],
    ARRAY['Ejercicios de descompresión lumbar'],
    ARRAY['u14', 'vuelta_calma', 'movilidad', 'regeneracion_fisica'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'circuit',
    'Medio campo', ARRAY['Postura correcta en estiramientos', 'Bajar pulsaciones por debajo de 110 ppm'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 6. U16 / Cadete
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Protocolo de Flexibilidad Dinámica Post-Tensión y Descompresión',
    'Analítico', 'FÍSICO', 'Metodología Sporting Saladar',
    'Especialmente diseñado para días de alta exigencia neuromuscular (MD-3/MD-4). Trote decreciente, ejercicios de movilidad coxofemoral y estiramientos mantenidos de 20s para optimizar el retorno venoso.',
    ARRAY['descarga muscular'],
    ARRAY['asimilación del trabajo', 'revisión del microciclo'],
    ARRAY['cadete'], 'cadete',
    1, 10, 10, 22,
    ARRAY['conos', 'balones medicinales suaves (opcional)'],
    ARRAY['Trabajo por parejas con estiramientos asistidos PNF suaves'],
    ARRAY['cadete', 'vuelta_calma', 'descarga_neuromuscular', 'regenerativo'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'individual_technical',
    'Medio campo', ARRAY['Relajación muscular progresiva', 'Recuperación de FC basal'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 7. U19 / Juvenil
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Carrera Continua Regenerativa y Descarga Articular',
    'Analítico', 'FÍSICO', 'Metodología Sporting Saladar',
    '5 minutos de trote regenerativo a 60% FCmax en sentido alterno, seguidos de rutina de estiramientos estáticos y ejercicios de movilidad de tobillo, cadera y columna torácica.',
    ARRAY['técnica de carrera regenerativa'],
    ARRAY['prevención lesional', 'vuelta a la calma'],
    ARRAY['juvenil'], 'juvenil',
    1, 10, 12, 22,
    ARRAY['conos'],
    ARRAY['Automasaje y estiramientos por tríadas'],
    ARRAY['juvenil', 'vuelta_calma', 'prevencion', 'descarga'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'circuit',
    'Campo entero', ARRAY['Reducción de tono muscular', 'Recuperación respiratoria'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
),
-- 8. Senior
(
    (SELECT id FROM public.clubs LIMIT 1),
    'Protocolo Élite de Vuelta a la Calma y Feedback Táctico',
    'Analítico', 'FÍSICO', 'Metodología Sporting Saladar',
    'Trote aeróbico regenerativo suave alrededor del terreno de juego + estiramientos guiados con feedback táctico grupal del cuerpo técnico respecto a los objetivos de la sesión.',
    ARRAY['descarga miofascial'],
    ARRAY['evaluación cualitativa inmediata'],
    ARRAY['senior'], 'senior',
    1, 10, 14, 25,
    ARRAY['conos', 'pizarra'],
    ARRAY['Rutina individualizada por minutos jugados o carga GPS'],
    ARRAY['senior', 'vuelta_calma', 'feedback_entrenador', 'recuperacion'],
    'vuelta_calma', 1, 1, 1, 1,
    1, 'general', 'circuit',
    'Campo entero', ARRAY['Disminución de FC por debajo de 100 ppm', 'Feedback constructivo asimilado'],
    'internal', null, 'Sporting Saladar', 'Club Proprietary', true
)
ON CONFLICT DO NOTHING;
