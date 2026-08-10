process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const statements = [
    `ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS acta_oficial_url TEXT DEFAULT NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_partidos_acta_url ON public.partidos (acta_oficial_url);`,
    `COMMENT ON COLUMN public.partidos.acta_oficial_url IS 'Ruta de almacenamiento privado del acta oficial PDF';`,
    `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
     VALUES ('actas-partidos', 'actas-partidos', false, 5242880, '{"application/pdf"}')
     ON CONFLICT (id) DO NOTHING;`,
    `CREATE OR REPLACE FUNCTION public.reconcile_match_and_close(
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
    $$;`
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    const { data, error } = await supabase.rpc('execute_sql_query', { query_text: stmt });
    if (error) {
      console.error(`Error in statement ${i + 1}:`, error.message);
    } else {
      console.log(`Statement ${i + 1} succeeded.`);
    }
  }

  console.log("\nVerificando columna 'acta_oficial_url' en partidos...");
  const { data: partido, error: partidosError } = await supabase
    .from('partidos')
    .select('id, acta_oficial_url')
    .limit(1);

  if (partidosError) {
    console.error("-> Error al consultar partidos:", partidosError.message);
  } else {
    console.log("-> ¡ÉXITO TOTAL! Columna 'acta_oficial_url' verificada exitosamente:", partido);
  }
}

runMigration().catch(console.error);
