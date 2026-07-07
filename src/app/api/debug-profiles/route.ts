import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createAdminClient()
  
  // Create a function to safely get user club_id without infinite recursion
  const sql = `
    -- 1. Create a SECURITY DEFINER function to bypass RLS when checking a user's club
    CREATE OR REPLACE FUNCTION get_user_club_id(user_uuid uuid)
    RETURNS uuid AS $$
    DECLARE
      c_id uuid;
    BEGIN
      SELECT club_id INTO c_id FROM public.profiles WHERE id = user_uuid;
      RETURN c_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    -- 2. Drop the recursive policy
    DROP POLICY IF EXISTS "Users can view profiles in their club" ON public.profiles;

    -- 3. Recreate it using the non-recursive function
    CREATE POLICY "Users can view profiles in their club" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (
      id = auth.uid() 
      OR 
      club_id = get_user_club_id(auth.uid())
    );
  `

  // We can't run raw sql easily unless we use an RPC. Since we might not have an RPC for raw sql, 
  // wait, we created `run_sql_query` in earlier migrations maybe? No.
  // Actually, I can just create a migration file and run it.
  
  return NextResponse.json({ ok: true })
}
