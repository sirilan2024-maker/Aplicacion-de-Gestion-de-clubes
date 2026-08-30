process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSaque() {
  const { data } = await supabase.from("banco_ejercicios").select("*").ilike("nombre", "%Saque de banda%").limit(5);
  console.log(data);
}

checkSaque();
