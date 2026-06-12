import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
// Deno can import npm packages directly
import pdfParse from "npm:pdf-parse@1.1.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Unauthorized")

    // 2. Check if user is admin (security)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') throw new Error("Forbidden: Admin only")

    // 3. Extract PDF file from FormData
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error("No PDF file provided")

    // 4. Read PDF using pdf-parse
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    const pdfData = await pdfParse(buffer)

    const extractedText = pdfData.text

    // --- LOGIC TO PARSE FFCV CALENDAR ---
    // Example: split by lines, find "Jornada X", extract Date, Teams, etc.
    // This is a skeleton logic wrapper.
    const jornadas = [] // Array to store parsed matches

    // ... (parsing logic goes here) ...

    // 5. Insert parsed matches into the database
    if (jornadas.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('partidos')
        .insert(jornadas)
      
      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ message: "Calendario procesado correctamente", matchesFound: jornadas.length, textPreview: extractedText.substring(0, 200) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
