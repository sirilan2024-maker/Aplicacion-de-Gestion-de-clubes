process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectDb() {
  console.log("=== INSPECCIÓN DE TABLAS METODOLÓGICAS ===");

  // 1. Curricula
  const { data: curricula, error: currErr } = await supabase
    .from("methodology_curriculum")
    .select("id, club_id, category_code, category_label");
  console.log("\n1. methodology_curriculum (total:", curricula?.length, ")");
  curricula?.forEach(c => console.log(`  - [${c.category_code}] ID: ${c.id}, Label: ${c.category_label}, club: ${c.club_id}`));

  // 2. Principles
  const { data: principles, error: princErr } = await supabase
    .from("methodology_principles")
    .select("id, club_id, curriculum_id, name, game_phase, sort_order");
  console.log("\n2. methodology_principles (total:", principles?.length, ")");
  principles?.forEach(p => console.log(`  - ID: ${p.id} | Phase: '${p.game_phase}' | Name: '${p.name}' | CurrID: ${p.curriculum_id}`));

  // 3. Subprinciples
  const { data: subprinciples, error: subErr } = await supabase
    .from("methodology_subprinciples")
    .select("id, principle_id, name");
  console.log("\n3. methodology_subprinciples (total:", subprinciples?.length, ")");
  subprinciples?.forEach(s => console.log(`  - Sub: '${s.name}' (Principle ID: ${s.principle_id})`));

  // 4. Behaviours
  const { data: behaviours, error: behErr } = await supabase
    .from("methodology_behaviours")
    .select("id, subprinciple_id, description, age_categories, performance_indicators");
  console.log("\n4. methodology_behaviours (total:", behaviours?.length, ")");
  behaviours?.forEach(b => console.log(`  - Beh: '${b.description}' | SubID: ${b.subprinciple_id} | Ages: ${b.age_categories?.join(',')}`));

  // 5. Test nested query as done in client
  console.log("\n5. Nested query test:");
  const { data: nested, error: nestErr } = await supabase
    .from("methodology_principles")
    .select(`
      id,
      curriculum_id,
      name,
      game_phase,
      description,
      methodology_subprinciples (
        id,
        name,
        description,
        methodology_behaviours (
          id,
          description,
          age_categories,
          performance_indicators
        )
      )
    `)
    .order("sort_order", { ascending: true });

  if (nestErr) {
    console.error("Nested query ERROR:", nestErr);
  } else {
    console.log("Nested query returned principles count:", nested?.length);
    nested?.forEach(p => {
      console.log(`\nPrinciple: '${p.name}' [Phase: '${p.game_phase}'] (CurrID: ${p.curriculum_id})`);
      p.methodology_subprinciples?.forEach((s: any) => {
        console.log(`   -> Sub: '${s.name}' (Behaviours: ${s.methodology_behaviours?.length})`);
      });
    });
  }
}

inspectDb().catch(console.error);
