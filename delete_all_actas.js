import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan variables de entorno SUPABASE");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllActas() {
  console.log("Limpiando URLs de actas en la tabla partidos...");
  
  const { data: updatedPartidos, error: updateError } = await supabase
    .from('partidos')
    .update({ acta_oficial_url: null })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');

  if (updateError) {
    console.error("Error reseteando acta_oficial_url:", updateError);
  } else {
    console.log(`✅ URLs de actas limpiadas en ${updatedPartidos?.length || 0} partidos.`);
  }

  console.log("Vaciando bucket 'actas-partidos'...");
  try {
    const { data: files, error: listError } = await supabase.storage.from('actas-partidos').list('');
    if (!listError && files && files.length > 0) {
      const filePaths = files.map(f => f.name);
      const { error: removeError } = await supabase.storage.from('actas-partidos').remove(filePaths);
      if (removeError) {
        console.error("Error eliminando archivos de actas-partidos:", removeError);
      } else {
        console.log(`✅ Eliminados ${filePaths.length} archivos de actas del bucket.`);
      }
    } else {
      console.log("El bucket 'actas-partidos' ya estaba vacío o sin archivos.");
    }
  } catch (e) {
    console.error("Error accediendo al bucket actas-partidos:", e);
  }

  console.log("\n¡Borrado de actas completado exitosamente!");
}

deleteAllActas();
