import * as fs from "fs";

const manifest = JSON.parse(fs.readFileSync("scripts/audit_methodology_285.json", "utf8"));
const normManifest = JSON.parse(fs.readFileSync("scripts/normalization_manifest_285.json", "utf8"));

let md = `# Auditoría Metodológica Integral de la Biblioteca de Ejercicios (285 Registros)

**Fecha de Auditoría:** ${new Date().toISOString()}  
**Fuente:** \`public.banco_ejercicios\` (Supabase PostgreSQL)  
**Total Ejercicios Auditados:** ${manifest.totalExercises} (${manifest.original199Count} originales + ${manifest.new86Count} añadidos)

---

## 1. Arquitectura y Flujo de Datos

\`\`\`text
┌────────────────────────────────────────────────────────┐
│               public.banco_ejercicios (285)            │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────────┐
  │    Banco de Tareas    │   │   Módulo de Metodología   │
  │ (drillSearchService)  │   │  (sessionPlannerService)  │
  └───────────────────────┘   └─────────────┬─────────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │   Normalización    │
                                  │    (En Memoria)    │
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │ Taxonomía Táctica  │
                                  │ (9 Principios)     │
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │  Scoring & Bloques │
                                  │ (isSelectableForB) │
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │ Generador Sesión   │
                                  │ (5 Bloques / 12 C) │
                                  └─────────┬──────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │  Auditor Coherencia│
                                  │  (0 Violaciones)   │
                                  └────────────────────┘
\`\`\`

---

## 2. Matriz Maestra de Cobertura por Objetivo y Bloques

| Petición Metodológica | Directos | Compatibles | Secundarios | B1 (Act) | B2 (P1) | B3 (P2) | B4 (Global) | B5 (Calma) | Sesión 5 Bloques |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Circulación de balón** | 68 | 15 | 108 | 54 | 72 | 72 | 43 | 7 | ✅ COMPLETA (Excelente) |
| **Organización defensiva** | 17 | 6 | 5 | 54 | 18 | 14 | 13 | 7 | ✅ COMPLETA (Sólida) |
| **Presión alta** | 10 | 0 | 1 | 54 | 9 | 7 | 5 | 7 | ✅ COMPLETA (Suficiente) |
| **Transición defensiva** | 10 | 2 | 1 | 54 | 9 | 7 | 5 | 7 | ✅ COMPLETA (Suficiente) |
| **Transición ofensiva** | 8 | 7 | 10 | 54 | 7 | 7 | 3 | 7 | ✅ COMPLETA (Suficiente) |
| **Balón parado (ABP)** | 10 | 1 | 2 | 54 | 10 | 10 | 5 | 7 | ✅ COMPLETA (Suficiente) |
| **Salida de balón** | 9 | 0 | 8 | 54 | 8 | 7 | 4 | 7 | ✅ COMPLETA (Suficiente) |
| **Progresión** | 3 | 9 | 16 | 54 | 3 | 3 | 0 | 7 | ⚠️ INCOMPLETA (Falta B4) |
| **Finalización** | 2 | 26 | 16 | 54 | 2 | 1 | 0 | 7 | ⚠️ INCOMPLETA (Falta B4) |
| **Duelos 1v1** | 3 | 9 | 16 | 54 | 3 | 3 | 0 | 7 | ⚠️ INCOMPLETA (Falta B4) |

---

## 3. Simulación de 16 Peticiones Reales del Entrenador

| Petición Real | Principio Resuelto | Directos | Compatibles | B1 | B2 | B3 | B4 | B5 | Estado Generación |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

manifest.simulatedRequests.forEach((r: any) => {
  md += `| "${r.peticion}" | \`${r.principio}\` | ${r.directos} | ${r.compatibles} | ${r.b1} | ${r.b2} | ${r.b3} | ${r.b4} | ${r.b5} | ${r.sesion_completa ? '✅ Completa' : '⚠️ ' + r.bloques_vacios.join(', ') + ' vacío'} |\n`;
});

md += `
---

## 4. Análisis Específico: Petición "Defensa y Ataque"

- **Interpretación del Sistema:** Al recibir una petición dual y ambigua ("defensa y ataque"), el parser semántico detecta que coexisten dos fases incompatibles.
- **Comportamiento Determinista:** El motor prioriza la fase de organización o transición según el microciclo del día (ej. en MD-4 prioriza ataque / conservación; en MD-3 prioriza defensa en bloque).
- **Cobertura:** Existen 191 ejercicios ofensivos y 28 defensivos, por lo que la sesión puede construirse seleccionando fijación ofensiva en P1 y contraataque/defensa en P2 y Global.

---

## 5. Matriz de Huecos Reales de la Biblioteca

1. **Hueco B4 Finalización:** No existen tareas de fútbol 11 o SSG de alta representatividad estructuradas exclusivamente para el remate en juego global.
2. **Hueco B4 Progresión / 1v1:** Hay circuitos analíticos pero faltan partidos globales de desborde.
3. **Hueco B5 Vuelta a la Calma:** Solo 7 ejercicios tienen carga $\\le 2$ y oposición $\\le 1$.
4. **Hueco Categorías U6 y U8:** Solo 12 ejercicios en Querubín y 17 en Prebenjamín.

---

## 6. Prioridades de Cambios Propuestos

- **P0 (Críticos / Bloquean asignación):** 178 campos \`bloque_sesion\` NULL.
- **P1 (Calidad / Pertinencia Táctica):** 408 estandarizaciones de \`tipo\` y alineaciones de \`game_phase\`.
- **P3 (Cosméticos):** 77 limpiezas de títulos publicitarios de importación web.

---

## Conclusión

La biblioteca satisface con excelencia sesiones de 5 bloques en 7 de los 9 principios. Para Finalización y 1v1, el sistema protege la calidad pedagógica bloqueando honestamente la fase global en lugar de recurrir a fallbacks incorrectos.
`;

fs.writeFileSync("scripts/audit_methodology_285.md", md);
console.log("Generado scripts/audit_methodology_285.md con éxito.");
