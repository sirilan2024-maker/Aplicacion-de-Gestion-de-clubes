-- ==========================================
-- Módulo 3: Banco de Ejercicios y Planificación de Sesiones
-- ==========================================

-- 1. Crear la tabla banco_ejercicios
CREATE TABLE IF NOT EXISTS public.banco_ejercicios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  objetivo_tecnico TEXT[] DEFAULT '{}',
  objetivo_tactico TEXT[] DEFAULT '{}',
  categoria_edad TEXT[] DEFAULT '{}',
  duracion_recomendada INTEGER,
  material TEXT[] DEFAULT '{}',
  descripcion TEXT,
  variantes TEXT[] DEFAULT '{}',
  puntos_entrenamiento TEXT,
  imagen_url TEXT,
  video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  dificultad INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.banco_ejercicios ENABLE ROW LEVEL SECURITY;

-- RLS para banco_ejercicios
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Ejercicios visibles para el mismo club') THEN
        CREATE POLICY "Ejercicios visibles para el mismo club" 
        ON public.banco_ejercicios FOR SELECT TO authenticated 
        USING (club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins y metodologos pueden gestionar ejercicios') THEN
        CREATE POLICY "Admins y metodologos pueden gestionar ejercicios" 
        ON public.banco_ejercicios FOR ALL TO authenticated 
        USING (
          club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()) 
          AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo'))
        );
    END IF;
END $$;

-- 2. Crear la tabla intermedia sesiones_ejercicios
CREATE TABLE IF NOT EXISTS public.sesiones_ejercicios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  ejercicio_id UUID REFERENCES public.banco_ejercicios(id) ON DELETE CASCADE NOT NULL,
  orden INTEGER NOT NULL,
  duracion_bloque INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sesiones_ejercicios ENABLE ROW LEVEL SECURITY;

-- RLS para sesiones_ejercicios
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sesiones ejercicios visibles para autenticados') THEN
        CREATE POLICY "Sesiones ejercicios visibles para autenticados" 
        ON public.sesiones_ejercicios FOR SELECT TO authenticated 
        USING (true); -- Asumimos que si ven la sesión, ven sus ejercicios
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins, entrenadores y metodologos pueden gestionar sesiones_ejercicios') THEN
        CREATE POLICY "Admins, entrenadores y metodologos pueden gestionar sesiones_ejercicios" 
        ON public.sesiones_ejercicios FOR ALL TO authenticated 
        USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coach'))
        );
    END IF;
END $$;

-- 3. Inserción de Datos Semilla (JSON de 10 ejercicios)
DO $$
DECLARE
  default_club_id UUID;
BEGIN
  -- Intentamos obtener el primer club disponible para asignar los ejercicios semilla
  SELECT id INTO default_club_id FROM public.clubs LIMIT 1;

  IF default_club_id IS NOT NULL THEN
    INSERT INTO public.banco_ejercicios (club_id, nombre, tipo, objetivo_tecnico, objetivo_tactico, duracion_recomendada, material, descripcion, variantes, puntos_entrenamiento, categoria_edad, tags, dificultad)
    VALUES 
    (
      default_club_id, 
      'Curso de coordinación del regate', 'circuito', 
      ARRAY['técnica de tiro', 'técnica en el salto', 'control de balón', 'regates', 'fintas', 'técnicas de portero'], 
      ARRAY['comportamiento 1 contra 1'], 
      20, 
      ARRAY['12 conos de señalización', '10 postes', '3 vallas', '1 caja', 'banco', 'trampolín', '10 anillas', '6 minivallas', '1 escalera de coordinación', '1 portería', 'balones'], 
      'Circuito coordinativo y técnico de 17 estaciones...', 
      ARRAY[]::TEXT[], 
      'El siguiente jugador inicia las flexiones cuando el anterior completa la estación 2. Mantener ritmo alto con incremento de intensidad a partir de la estación 13.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['coordinación', 'regate', 'circuito', 'multiestación', 'resistencia'],
      3
    ),
    (
      default_club_id, 
      'ESTRELLA DEL ENGAÑO', 'analitico', 
      ARRAY['control de balón', 'regates', 'fintas'], 
      ARRAY['toma de decisión individual'], 
      15, 
      ARRAY['1 poste', '5 conos de colores', '1 balón'], 
      'El jugador realiza una conducción directa hacia el poste central, ejecuta un engaño o finta, se dirige hacia un cono de color específico, realiza un giro técnico alrededor de este y regresa al centro para repetir la acción hacia otro cono.', 
      ARRAY['Secuencia de colores establecida por el entrenador', 'Fintas específicas obligatorias según el color del cono', 'Libertad de elección de finta para el jugador'], 
      'Enfatizar la deceleración rápida antes del engaño, el cambio de ritmo explosivo posterior y el desplazamiento del centro de gravedad. Uso obligado de ambos pies.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil'],
      ARRAY['fintas', 'conducción', 'reacción', 'giros'],
      1
    ),
    (
      default_club_id, 
      'Pase en Triángulo', 'globalizacion', 
      ARRAY['pases cortos', 'control de balón', 'regates', 'recepción abierta'], 
      ARRAY['desmarque', 'triangulación'], 
      20, 
      ARRAY['conos', 'maniquíes', 'balones'], 
      'Circulación de balón en estructura triangular. A pasa a B (que recibe en posición abierta), B asiste a C que realiza un desmarque previo del maniquí. C recibe, inicia conducción con amago para superar el último obstáculo y rotación de posiciones.', 
      ARRAY['Incluye devolución (pared) entre A-B y B-C', 'El jugador B juega el balón directamente al espacio de carrera de C'], 
      'Pase preciso al pie delantero del compañero. Recepción dinámica en movimiento. Cambio de ritmo tras realizar el amago.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['pases', 'triangulación', 'desmarque', 'perfiles'],
      1
    ),
    (
      default_club_id, 
      'Carrera de presión', 'SSG', 
      ARRAY['pases cortos', 'paredes', 'combinaciones'], 
      ARRAY['Pressing', 'superioridad numérica', 'inferioridad numérica'], 
      20, 
      ARRAY['conos', 'balones'], 
      'Juego de posesión 5v3 o 4v2 en subcampos. El equipo en superioridad intenta mantener el balón mientras el equipo en inferioridad presiona para forzar al oponente a progresar al siguiente subcampo hasta cruzar la meta.', 
      ARRAY['Permitir regate o pase al subcampo anterior únicamente en la zona 2'], 
      'El equipo defensor debe orientar el pressing para dirigir el ataque rival hacia zonas de error o hacia el siguiente cuadro bajo control defensivo.', 
      ARRAY['infantil', 'cadete', 'juvenil'],
      ARRAY['pressing', 'posesión', 'transición', 'toma-de-decisión'],
      3
    ),
    (
      default_club_id, 
      'Calentamiento Brasileño', 'calentamiento', 
      ARRAY['coordinación motriz'], 
      ARRAY['cohesión grupal'], 
      15, 
      ARRAY['4 conos'], 
      'Tareas de coordinación rítmica en trayecto de ida: 1. Pasos laterales (2 izq / 2 der); 2. Giro de tronco con codos altos; 3. Tocar suelo alterno; 4. Empuje de codos atrás y aplauso; 5. Aplauso en muslo levantado alterno; 6. Tocar talones y aplauso; 7. Pasos laterales hacia atrás. El regreso se realiza en carrera continua normal.', 
      ARRAY['Ajustar el ritmo de ejecución según estímulos auditivos (palmadas del entrenador)'], 
      'Mantener la distancia de seguridad entre jugadores (5-7 metros). Sincronizar los movimientos con el ritmo de carrera.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['calentamiento', 'coordinación', 'movilidad', 'ritmo'],
      1
    ),
    (
      default_club_id, 
      'Calentamiento: Juego de Pilla-Pilla con Pases', 'calentamiento', 
      ARRAY['control de balón', 'regates', 'pase'], 
      ARRAY['procesamiento rápido', 'anticipación'], 
      15, 
      ARRAY['conos', 'balones'], 
      'Cazadores intentan atrapar a jugadores que NO tienen el balón. Los poseedores son inmunes. Los jugadores deben circular el balón rápidamente para proteger a los compañeros en riesgo. Los atrapados actúan como obstáculos estáticos.', 
      ARRAY['Los jugadores atrapados deben realizar una tarea técnica para reincorporarse'], 
      'Modificar la intensidad reduciendo el número de balones o el espacio de juego. Fomentar la comunicación constante.', 
      ARRAY['benjamin', 'alevin', 'infantil'],
      ARRAY['pilla-pilla', 'reacción', 'lúdico', 'cooperación'],
      1
    ),
    (
      default_club_id, 
      'Carrera en Zigzag', 'calentamiento', 
      ARRAY['conducción', 'fintas', 'pie no dominante'], 
      ARRAY['orientación espacial'], 
      15, 
      ARRAY['conos rojos', 'conos amarillos'], 
      'Dos grupos realizan zigzag simultáneo por sus colores. Ida con tareas específicas (tocar cono, carrera atrás, pasos laterales) o conducción. Regreso con ejercicios coordinativos obligatorios.', 
      ARRAY['Ejercicios de regreso: rodillas altas, talones al glúteo, zancadas, remate de cabeza'], 
      'Evitar colisiones visualizando la trayectoria del compañero. Enfatizar el uso del pie menos hábil durante el dribbling.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete'],
      ARRAY['coordinación', 'zigzag', 'conducción', 'agilidad'],
      1
    ),
    (
      default_club_id, 
      'Curso de coordinación con tiro al blanco', 'circuito', 
      ARRAY['tiro a portería', 'velocidad de movimiento'], 
      ARRAY['procesamiento rápido', 'atención'], 
      25, 
      ARRAY['conos de colores (blancos para puntería)', '6 aros', '6 barras', '2 escaleras de coordinación', '4 mini porterías'], 
      'Circuito de alta intensidad: 1. Sprint; 2. Paso por aros; 3. Slalom de barras; 4. Escalera (pasos rápidos); 5. Escalera lateral; 6. El entrenador grita un color y el jugador debe finalizar en la mini portería identificada con ese color.', 
      ARRAY['Sustituir colores por números o resolución de cálculos matemáticos para el tiro'], 
      'Ejecución al 80-90% de intensidad. Reacción inmediata al estímulo auditivo del entrenador para la finalización.', 
      ARRAY['infantil', 'cadete', 'juvenil'],
      ARRAY['velocidad', 'reacción', 'finalización', 'atención'],
      2
    ),
    (
      default_club_id, 
      'Ejercicio de la brújula en el espejo', 'circuito', 
      ARRAY['desplazamiento', 'conducción'], 
      ARRAY['procesamiento rápido', 'memoria visual'], 
      20, 
      ARRAY['14 conos de colores'], 
      'Tarea técnico-motriz por parejas. Un jugador toca una secuencia de 5 a 10 conos. El compañero debe replicar exactamente la ruta y el orden de los conos a máxima velocidad.', 
      ARRAY['Realizar el seguimiento conduciendo un balón', 'Cambiar la disposición de colores para aumentar la carga cognitiva'], 
      'Priorizar la calidad de la observación antes de iniciar el sprint. Máxima explosividad en los cambios de dirección.', 
      ARRAY['benjamin', 'alevin', 'infantil', 'cadete'],
      ARRAY['espejo', 'coordinación', 'cognitivo', 'agilidad'],
      1
    ),
    (
      default_club_id, 
      'Formato de Torneo 1 vs 1 Bundesliga-Champions League', 'SSG', 
      ARRAY['regate', 'protección de balón', 'remate'], 
      ARRAY['uno contra uno', 'competitividad'], 
      15, 
      ARRAY['conos', 'balones', 'mini porterías'], 
      'Torneo por niveles (ligas). Enfrentamientos directos de 2-3 minutos. El ganador asciende de campo (liga superior) y el perdedor desciende, fomentando la competitividad constante.', 
      ARRAY['Limitar el tiempo de posesión antes de poder realizar un tiro a portería'], 
      'Fomentar el uso de fintas para desequilibrar y el uso del cuerpo para proteger el balón ante la carga del rival.', 
      ARRAY['prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil'],
      ARRAY['1v1', 'competitividad', 'duelos', 'torneo'],
      1
    );
  END IF;
END $$;
