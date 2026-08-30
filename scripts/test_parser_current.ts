import { NaturalLanguageQueryParser } from "../src/lib/methodology/intelligentSearch/naturalLanguageQueryParser";
import { SessionRequestParser } from "../src/lib/methodology/sessionGenerator/sessionRequestParser";

const phrases = [
  "Sesión de posesión y circulación para Infantil, 75 minutos.",
  "Sesión de finalización y remate para Senior, 75 minutos.",
  "Sesión de presión alta para Senior, 75 minutos.",
  "Sesión de presión tras pérdida para Senior, 75 minutos.",
  "Sesión de progresión y duelos 1v1 para Senior, 75 minutos.",
  "1v1 para Senior, 75 minutos."
];

console.log("=== CURRENT PARSER OUTPUT ===");
for (const p of phrases) {
  console.log(`\n--- PHRASE: "${p}" ---`);
  const nl = NaturalLanguageQueryParser.parse(p);
  console.log("NaturalLanguageQueryParser:", {
    cleanedQuery: nl.cleanedQuery,
    extractedAgeCategory: nl.extractedAgeCategory,
    extractedObjectives: nl.extractedObjectives,
    extractedPlayersMin: nl.extractedPlayersMin,
    extractedPlayersMax: nl.extractedPlayersMax,
    extractedDurationMin: nl.extractedDurationMin
  });

  const req = SessionRequestParser.parse(p);
  console.log("SessionRequestParser:", {
    primaryObjective: req.primaryObjective,
    secondaryObjectives: req.secondaryObjectives,
    ageCategory: req.ageCategory,
    players: req.players,
    durationMinutes: req.durationMinutes
  });
}
