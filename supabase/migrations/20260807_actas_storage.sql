-- 1. Extensión de la tabla partidos
ALTER TABLE public.partidos 
ADD COLUMN IF NOT EXISTS acta_oficial_url TEXT DEFAULT NULL;

-- 2. Índice para optimizar búsquedas de actas asignadas
CREATE INDEX IF NOT EXISTS idx_partidos_acta_url ON public.partidos (acta_oficial_url);

-- 3. Comentario de auditoría
COMMENT ON COLUMN public.partidos.acta_oficial_url IS 'Ruta de almacenamiento privado del acta oficial PDF';

-- 4. Creación del bucket de seguridad privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('actas-partidos', 'actas-partidos', false, 5242880, '{"application/pdf"}')
ON CONFLICT (id) DO NOTHING;

-- 5. Políticas RLS para el Bucket 'actas-partidos'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Admins pueden subir actas'
  ) THEN
    CREATE POLICY "Admins pueden subir actas" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (
      bucket_id = 'actas-partidos' AND 
      (auth.jwt() ->> 'role') = 'admin'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Lectura restringida de actas'
  ) THEN
    CREATE POLICY "Lectura restringida de actas" 
    ON storage.objects FOR SELECT 
    TO authenticated 
    USING (
      bucket_id = 'actas-partidos' AND (
        (auth.jwt() ->> 'role') = 'admin' OR 
        EXISTS (
          SELECT 1 FROM public.team_coaches tc
          JOIN public.partidos p ON p.equipo_id = tc.team_id
          WHERE tc.profile_id = auth.uid() 
          AND (storage.foldername(name))[1] = p.id::text
        ) OR
        EXISTS (
          SELECT 1 FROM public.teams t
          JOIN public.partidos p ON p.equipo_id = t.id
          WHERE t.coach_id = auth.uid()
          AND (storage.foldername(name))[1] = p.id::text
        )
      )
    );
  END IF;
END $$;

-- 6. Función RPC atómica para conciliación y cierre de partido
CREATE OR REPLACE FUNCTION public.reconcile_match_and_close(
  p_partido_id UUID,
  p_stats JSONB,
  p_new_status TEXT DEFAULT 'Finalizado'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  elem JSONB;
  v_player_id UUID;
  v_conv_id UUID;
BEGIN
  FOR elem IN SELECT * FROM jsonb_array_elements(p_stats)
  LOOP
    v_player_id := (elem->>'player_id')::UUID;
    
    SELECT id INTO v_conv_id
    FROM public.convocatorias
    WHERE partido_id = p_partido_id AND player_id = v_player_id
    LIMIT 1;

    IF v_conv_id IS NOT NULL THEN
      UPDATE public.convocatorias
      SET 
        goals = COALESCE((elem->>'goals')::INT, 0),
        assists = COALESCE((elem->>'assists')::INT, 0),
        yellow_cards = COALESCE((elem->>'yellow_cards')::INT, 0),
        red_cards = COALESCE((elem->>'red_cards')::INT, 0),
        minutes_played = COALESCE((elem->>'minutes_played')::INT, 0),
        estado_asistencia = COALESCE(elem->>'estado_asistencia', 'Presente'),
        status = 'convocado'
      WHERE id = v_conv_id;
    ELSE
      INSERT INTO public.convocatorias (
        partido_id,
        player_id,
        goals,
        assists,
        yellow_cards,
        red_cards,
        minutes_played,
        estado_asistencia,
        status
      ) VALUES (
        p_partido_id,
        v_player_id,
        COALESCE((elem->>'goals')::INT, 0),
        COALESCE((elem->>'assists')::INT, 0),
        COALESCE((elem->>'yellow_cards')::INT, 0),
        COALESCE((elem->>'red_cards')::INT, 0),
        COALESCE((elem->>'minutes_played')::INT, 0),
        COALESCE(elem->>'estado_asistencia', 'Presente'),
        'convocado'
      );
    END IF;
  END LOOP;

  UPDATE public.partidos
  SET estado = p_new_status
  WHERE id = p_partido_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
