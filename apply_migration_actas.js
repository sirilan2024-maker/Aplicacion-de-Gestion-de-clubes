process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("1. Creando / Verificando bucket 'actas-partidos'...");
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('actas-partidos', {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['application/pdf']
  });

  if (bucketError) {
    if (bucketError.message.includes('already exists') || bucketError.statusCode === '409' || bucketError.message.includes('Duplicate')) {
      console.log("-> Bucket 'actas-partidos' ya existe.");
    } else {
      console.error("-> Error al crear el bucket:", bucketError.message);
    }
  } else {
    console.log("-> Bucket 'actas-partidos' creado exitosamente.");
  }

  console.log("\n2. Verificando columna 'acta_oficial_url' en la tabla partidos...");
  const { data: partido, error: partidosError } = await supabase
    .from('partidos')
    .select('id, acta_oficial_url')
    .limit(1);

  if (partidosError) {
    console.error("-> Error al consultar partidos:", partidosError.message);
  } else {
    console.log("-> Columna 'acta_oficial_url' accesible en la tabla partidos. Ejemplo de datos:", partido);
  }
}

main().catch(console.error);
