process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { NaturalLanguageQueryParser } from "../src/lib/methodology/intelligentSearch/naturalLanguageQueryParser";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";
import { getPrincipleTaxonomyKey } from "../src/lib/methodology/tacticalEngine/tacticalAffinityEngine";

const prompts = [
  "Sesión de posesión y circulación para Infantil, 75 minutos.",
  "1v1 para Senior, 75 minutos.",
  "Sesión de finalización y remate para Senior, 75 minutos."
];

for (const p of prompts) {
  const nlp = NaturalLanguageQueryParser.parse(p);
  const session = SessionRequestParser.parse(p);
  console.log(`\n--- "${p}" ---`);
  console.log(`  NLP extractedObjectives: [${(nlp.extractedObjectives || []).join(", ")}]`);
  console.log(`  SessionParser primaryObjective: "${session.primaryObjective}"`);
  console.log(`  getPrincipleTaxonomyKey("${nlp.extractedObjectives?.[0]}"): "${getPrincipleTaxonomyKey(nlp.extractedObjectives?.[0] || "")}"`);
}
