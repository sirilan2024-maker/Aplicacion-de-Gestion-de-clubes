process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { createClient } from "@supabase/supabase-js";
import { NaturalLanguageQueryParser } from "../src/lib/methodology/intelligentSearch/naturalLanguageQueryParser";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { SessionPlannerService } from "../src/lib/methodology/sessionGenerator/sessionPlannerService";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runParserVerification() {
  console.log("================================================================================");
  console.log("TESTS DE REGRESIÓN: PARSER DE PETICIONES Y GENERACIÓN CANÓNICA");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exit(1);
    }
  }

  // --- 1. TESTS OBLIGATORIOS DEL PARSER ---
  console.log("--- 1. PARSER DE LENGUAJE NATURAL Y TAXONOMÍA CANÓNICA ---");

  // Caso 1: Posesión y circulación
  const p1 = SessionRequestParser.parse("Sesión de posesión y circulación para Infantil, 75 minutos.");
  assert(p1.primaryObjective === "circulacion" || p1.primaryObjective === "posesion", "Posesión y circulación -> 'circulacion' / 'posesion'");
  assert(p1.ageCategory === "infantil", "Categoría infantil detectada");
  assert(p1.durationMinutes === 75, "Duración 75 min detectada");
  assert(p1.players === undefined, "Jugadores no definidos (correcto)");

  // Caso 2: Finalización y remate
  const p2 = SessionRequestParser.parse("Sesión de finalización y remate para Senior, 75 minutos.");
  assert(p2.primaryObjective === "finalizacion", "Finalización y remate -> 'finalizacion'");
  assert(p2.ageCategory === "senior", "Categoría senior detectada");
  assert(p2.durationMinutes === 75, "Duración 75 min detectada");
  assert(p2.players === undefined, "Jugadores no definidos (correcto)");

  // Caso 3: Presión alta
  const p3 = SessionRequestParser.parse("Sesión de presión alta para Senior, 75 minutos.");
  assert(p3.primaryObjective === "presion alta", "Presión alta -> 'presion alta'");
  assert(p3.ageCategory === "senior", "Categoría senior detectada");
  assert(p3.durationMinutes === 75, "Duración 75 min detectada");
  assert(p3.players === undefined, "Jugadores no definidos (correcto)");

  // Caso 4: Presión tras pérdida
  const p4 = SessionRequestParser.parse("Sesión de presión tras pérdida para Senior, 75 minutos.");
  assert(p4.primaryObjective === "transicion defensiva", "Presión tras pérdida -> 'transicion defensiva'");
  assert(p4.ageCategory === "senior", "Categoría senior detectada");
  assert(p4.durationMinutes === 75, "Duración 75 min detectada");
  assert(p4.players === undefined, "Jugadores no definidos (correcto)");

  // Caso 5: Progresión y duelos 1v1
  const p5 = SessionRequestParser.parse("Sesión de progresión y duelos 1v1 para Senior, 75 minutos.");
  assert(p5.primaryObjective === "progresion", "Progresión y duelos 1v1 -> 'progresion'");
  assert(p5.ageCategory === "senior", "Categoría senior detectada");
  assert(p5.durationMinutes === 75, "Duración 75 min detectada");
  assert(p5.players === undefined, "Jugadores no definidos (1v1 NO activa players)");

  // Caso 6: 1v1 puro
  const p6 = SessionRequestParser.parse("1v1 para Senior, 75 minutos.");
  assert(p6.primaryObjective === "progresion", "1v1 puro -> 'progresion'");
  assert(p6.ageCategory === "senior", "Categoría senior detectada");
  assert(p6.durationMinutes === 75, "Duración 75 min detectada");
  assert(p6.players === undefined, "1v1 NO genera players: 2");
  assert(p6.primaryObjective !== "para", "El objetivo NUNCA es 'para'");
  assert(p6.primaryObjective !== "para .", "El objetivo NUNCA es 'para .'");

  // --- 2. EXTRACCIÓN EXPLÍCITA DE JUGADORES VS DUELOS ---
  console.log("\n--- 2. EXTRACCIÓN DE JUGADORES (SQUAD VS DUELS) ---");
  const pDuelo3v2 = SessionRequestParser.parse("Sesión de finalización 3v2 para Cadete");
  assert(pDuelo3v2.players === undefined, "3v2 no activa players");

  const pDuelo5v5 = SessionRequestParser.parse("Partido 5v5 de posesión");
  assert(pDuelo5v5.players === undefined, "5v5 no activa players");

  const pDuelo6v6 = SessionRequestParser.parse("SSG 6v6+2 de salida de balón");
  assert(pDuelo6v6.players === undefined, "6v6+2 no activa players");

  const pExplicit1 = SessionRequestParser.parse("Sesión para 2 jugadores de finalización");
  assert(pExplicit1.players === 2, "Expresión 'para 2 jugadores' extrae players: 2");

  const pExplicit2 = SessionRequestParser.parse("Sesión de posesión con plantilla de 18 jugadores para Juvenil");
  assert(pExplicit2.players === 18, "Expresión 'plantilla de 18 jugadores' extrae players: 18");

  // --- 3. PRUEBA E2E DE GENERACIÓN CON CATÁLOGO ---
  console.log("\n--- 3. PRUEBA E2E: GENERACIÓN 5/5 Y 75/75 PARA LAS 6 FRASES ---");
  const { data: catalog, error } = await supabase.from("banco_ejercicios").select("*");
  if (error || !catalog) {
    console.error("Error loading catalog:", error);
    process.exit(1);
  }

  const planner = SessionPlannerService.getInstance();
  const testPhrases = [
    "Sesión de posesión y circulación para Infantil, 75 minutos.",
    "Sesión de finalización y remate para Senior, 75 minutos.",
    "Sesión de presión alta para Senior, 75 minutos.",
    "Sesión de presión tras pérdida para Senior, 75 minutos.",
    "Sesión de progresión y duelos 1v1 para Senior, 75 minutos.",
    "1v1 para Senior, 75 minutos."
  ];

  for (const phrase of testPhrases) {
    const res = await planner.generateSession(phrase, catalog);
    assert(res.success === true, `Generación exitosa para: "${phrase}"`);
    assert(res.session !== undefined, `Sesión generada no nula para: "${phrase}"`);
    assert(res.session?.drills.length === 5, `5/5 bloques generados para: "${phrase}"`);
    assert(res.session?.calculatedDurationMinutes === 75, `Suma exacta 75/75 min para: "${phrase}"`);
    assert(res.session?.pedagogicalChainValid === true, `Cadena pedagógica B1-B5 válida para: "${phrase}"`);
    assert(res.session?.coherenceScore === 100, `Coherencia metodológica 100% para: "${phrase}"`);
  }

  // --- 4. PRUEBA DE LOS 9 PRINCIPIOS CANÓNICOS A 75 MIN ---
  console.log("\n--- 4. PRUEBA DE LOS 9 PRINCIPIOS CANÓNICOS (75 MIN / 5 BLOQUES) ---");
  const ninePrinciples = [
    "Circulación de balón y posesión",
    "Organización defensiva y basculación",
    "Presión alta",
    "Transición defensiva",
    "Transición ofensiva",
    "Salida de balón",
    "Balón parado",
    "Finalización y remate",
    "Progresión y duelos 1v1"
  ];

  for (const principle of ninePrinciples) {
    const prompt = `Sesión de ${principle} para Cadete, 75 minutos.`;
    const res = await planner.generateSession(prompt, catalog);
    assert(res.success === true, `Principio [${principle}]: éxito`);
    assert(res.session?.drills.length === 5, `Principio [${principle}]: 5/5 bloques`);
    assert(res.session?.calculatedDurationMinutes === 75, `Principio [${principle}]: 75/75 min`);
  }

  console.log("\n================================================================================");
  console.log(`RESULTADO DE TESTS DE PARSER Y GENERACIÓN: ${passed} / ${total} TESTS PASADOS (100% PASS)`);
  console.log("================================================================================");
}

runParserVerification();
