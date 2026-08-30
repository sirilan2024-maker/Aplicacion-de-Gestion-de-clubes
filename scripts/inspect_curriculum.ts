process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectCurriculum() {
  const { data: curricula } = await supabase.from("methodology_curriculum").select("*");
  console.log("Curricula in DB:", curricula?.map(c => ({
    code: c.category_code,
    label: c.category_label,
    philosophy: c.philosophy_text,
    objectives: c.objectives,
    priorities: c.priority_families
  })));
}

inspectCurriculum().catch(console.error);
