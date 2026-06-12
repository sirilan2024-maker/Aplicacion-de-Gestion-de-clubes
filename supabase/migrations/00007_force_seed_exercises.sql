-- ==========================================
-- FORZAR INSERCIÓN DE EJERCICIOS (REINTENTO)
-- ==========================================

DO $$
DECLARE
  default_club_id UUID;
BEGIN
  -- 1. Buscamos el club al que pertenece el PRIMER perfil de administrador
  -- (Para asegurarnos al 100% de que el club coincida con tu usuario)
  SELECT club_id INTO default_club_id FROM public.profiles LIMIT 1;

  IF default_club_id IS NOT NULL THEN
    
    -- 2. Limpiamos cualquier ejercicio previo por si acaso se insertaron mal
    DELETE FROM public.banco_ejercicios;

    -- 3. Insertamos los 10 ejercicios forzando el club_id correcto
    INSERT INTO public.banco_ejercicios (club_id, nombre, tipo, objetivo_tecnico, objetivo_tactico, duracion_recomendada, material, descripcion, variantes, puntos_entrenamiento, categoria_edad, tags, dificultad)
    VALUES 
    (
      default_club_id, 
      'Curso de coordinación del regate', 'circuito', 
      ARRAY['técnica de tiro', 'técnica en el salto', 'control de balón', 'regates', 'fintas', 'técnicas de portero'], 
      ARRAY['comportamiento 1 contra 1'], 
      20, 
      ARRAY['12 conos de señalización', '10 postes', '3 vallas', '1 caja', 'banco', 'trampolín', '10 anillas', '6 minivallas', '1 escalera de coordinación', '1 portería', 'balones'], 
      'Circuito coordinativo y técnico de 17 estaciones: 1. 5 flexiones; 2. Conducción hacia atrás... 17. Sprint final.', 
      ARRAY[]::TEXT[], 
      'El siguiente jugador inicia las flexiones cuando el anterior completa la estación 2.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['coordinación', 'regate', 'circuito'],
      3
    ),
    (
      default_club_id, 
      'ESTRELLA DEL ENGAÑO', 'analitico', 
      ARRAY['control de balón', 'regates', 'fintas'], 
      ARRAY['toma de decisión individual'], 
      15, 
      ARRAY['1 poste', '5 conos de colores', '1 balón'], 
      'El jugador realiza una conducción directa hacia el poste central, ejecuta un engaño o finta...', 
      ARRAY['Secuencia de colores establecida por el entrenador'], 
      'Enfatizar la deceleración rápida antes del engaño.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil'],
      ARRAY['fintas', 'conducción', 'reacción'],
      1
    ),
    (
      default_club_id, 
      'Pase en Triángulo', 'globalizacion', 
      ARRAY['pases cortos', 'control de balón', 'regates'], 
      ARRAY['desmarque', 'triangulación'], 
      20, 
      ARRAY['conos', 'maniquíes', 'balones'], 
      'Circulación de balón en estructura triangular. A pasa a B...', 
      ARRAY['Incluye devolución (pared) entre A-B y B-C'], 
      'Pase preciso al pie delantero del compañero.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['pases', 'triangulación', 'desmarque'],
      1
    ),
    (
      default_club_id, 
      'Carrera de presión', 'SSG', 
      ARRAY['pases cortos', 'paredes', 'combinaciones'], 
      ARRAY['Pressing', 'superioridad numérica'], 
      20, 
      ARRAY['conos', 'balones'], 
      'Juego de posesión 5v3 o 4v2 en subcampos...', 
      ARRAY['Permitir regate o pase al subcampo anterior únicamente en la zona 2'], 
      'El equipo defensor debe orientar el pressing...', 
      ARRAY['infantil', 'cadete', 'juvenil'],
      ARRAY['pressing', 'posesión', 'transición'],
      3
    ),
    (
      default_club_id, 
      'Calentamiento Brasileño', 'calentamiento', 
      ARRAY['coordinación motriz'], 
      ARRAY['cohesión grupal'], 
      15, 
      ARRAY['4 conos'], 
      'Tareas de coordinación rítmica en trayecto de ida...', 
      ARRAY['Ajustar el ritmo de ejecución según estímulos auditivos'], 
      'Mantener la distancia de seguridad entre jugadores.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['calentamiento', 'coordinación'],
      1
    ),
    (
      default_club_id, 
      'Juego de Pilla-Pilla con Pases', 'calentamiento', 
      ARRAY['control de balón', 'regates', 'pase'], 
      ARRAY['procesamiento rápido', 'anticipación'], 
      15, 
      ARRAY['conos', 'balones'], 
      'Cazadores intentan atrapar a jugadores que NO tienen el balón...', 
      ARRAY['Los jugadores atrapados deben realizar una tarea técnica'], 
      'Modificar la intensidad reduciendo el número de balones.', 
      ARRAY['benjamin', 'alevin', 'infantil'],
      ARRAY['pilla-pilla', 'reacción', 'lúdico'],
      1
    ),
    (
      default_club_id, 
      'Carrera en Zigzag', 'calentamiento', 
      ARRAY['conducción', 'fintas'], 
      ARRAY['orientación espacial'], 
      15, 
      ARRAY['conos rojos', 'conos amarillos'], 
      'Dos grupos realizan zigzag simultáneo por sus colores...', 
      ARRAY['Ejercicios de regreso: rodillas altas, talones al glúteo'], 
      'Evitar colisiones visualizando la trayectoria del compañero.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete'],
      ARRAY['coordinación', 'zigzag', 'conducción'],
      1
    ),
    (
      default_club_id, 
      'Coordinación con tiro al blanco', 'circuito', 
      ARRAY['tiro a portería', 'velocidad de movimiento'], 
      ARRAY['procesamiento rápido', 'atención'], 
      25, 
      ARRAY['conos', '6 aros', '4 mini porterías'], 
      'Circuito de alta intensidad: 1. Sprint; 2. Paso por aros...', 
      ARRAY['Sustituir colores por números'], 
      'Ejecución al 80-90% de intensidad.', 
      ARRAY['infantil', 'cadete', 'juvenil'],
      ARRAY['velocidad', 'reacción', 'finalización'],
      2
    ),
    (
      default_club_id, 
      'Ejercicio de la brújula en el espejo', 'circuito', 
      ARRAY['desplazamiento', 'conducción'], 
      ARRAY['procesamiento rápido', 'memoria visual'], 
      20, 
      ARRAY['14 conos de colores'], 
      'Tarea técnico-motriz por parejas. Un jugador toca una secuencia...', 
      ARRAY['Realizar el seguimiento conduciendo un balón'], 
      'Priorizar la calidad de la observación antes de iniciar el sprint.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete'],
      ARRAY['espejo', 'coordinación', 'cognitivo'],
      1
    ),
    (
      default_club_id, 
      'Torneo 1 vs 1', 'SSG', 
      ARRAY['regate', 'protección de balón', 'remate'], 
      ARRAY['uno contra uno', 'competitividad'], 
      15, 
      ARRAY['conos', 'balones', 'mini porterías'], 
      'Torneo por niveles (ligas). Enfrentamientos directos de 2-3 minutos.', 
      ARRAY['Limitar el tiempo de posesión'], 
      'Fomentar el uso de fintas para desequilibrar.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['1v1', 'competitividad', 'duelos'],
      1
    );
  END IF;
END $$;
