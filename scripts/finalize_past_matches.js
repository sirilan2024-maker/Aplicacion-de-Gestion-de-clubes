import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const today = new Date().toISOString();
  
  // Mark all past matches as Finalizado if they are Programado
  const { data, error } = await supabase
    .from('partidos')
    .update({ estado: 'Finalizado' })
    .lt('fecha_hora', today)
    .eq('estado', 'Programado');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Past matches finalized.');
  }
}

run();
