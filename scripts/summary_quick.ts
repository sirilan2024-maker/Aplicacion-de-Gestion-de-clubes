import * as fs from "fs";
const manifest = JSON.parse(fs.readFileSync("scripts/normalization_manifest_285.json", "utf8"));
console.log("Total ejercicios:", manifest.totalEjercicios);
console.log("Total cambios propuestos:", manifest.totalCambiosPropuestos);

const byPriority: Record<string, number> = {};
manifest.cambiosPropuestos.forEach((c: any) => {
  byPriority[c.prioridad] = (byPriority[c.prioridad] || 0) + 1;
});
console.log("Desglose por prioridad:", byPriority);
