const { 
  scoreExercise, 
  recommendExercises, 
  calculateSessionMetrics 
} = require('./src/lib/methodology/recommendationEngine.js');

const mockExercises = [
  {
    id: "ex-act-1",
    nombre: "Rondo de Activación 4v1",
    tipo: "rondo",
    familia: "TÁCTICA OFENSIVA",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "calentamiento",
    objetivo_tactico: ["apoyo", "pase"],
    objetivo_tecnico: ["pase", "control orientado"],
    carga_fisica: 2,
    carga_cognitiva: 2,
    oposicion: 2,
    representatividad: 2,
    duracion_recomendada: 15,
    min_players: 5,
    max_players: 8,
    criterios_exito: ["Perfilación corporal", "Pase tenso"]
  },
  {
    id: "ex-p1-1",
    nombre: "Juego de Posición 6v4 + 2 Comodines",
    tipo: "juego_medio",
    familia: "TRANSICIONES",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "principal",
    objetivo_tactico: ["presión tras pérdida", "tercer hombre", "superioridad"],
    objetivo_tecnico: ["interceptación", "pase"],
    carga_fisica: 3,
    carga_cognitiva: 3,
    oposicion: 3,
    representatividad: 3,
    duracion_recomendada: 20,
    min_players: 12,
    max_players: 16,
    criterios_exito: ["Acoso en 3 segundos"]
  },
  {
    id: "ex-p2-1",
    nombre: "SSG 4v4 + 3 con Transición Rápida a Miniporterías",
    tipo: "SSG",
    familia: "TRANSICIONES",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "principal",
    objetivo_tactico: ["presión tras pérdida", "contraataque"],
    objetivo_tecnico: ["regate", "finalización"],
    carga_fisica: 4,
    carga_cognitiva: 4,
    oposicion: 4,
    representatividad: 4,
    duracion_recomendada: 25,
    min_players: 11,
    max_players: 16,
    criterios_exito: ["Finalizar en menos de 8 segundos"]
  },
  {
    id: "ex-glob-1",
    nombre: "Juego Global 8v8 con Foco en Presión Alta",
    tipo: "juego_global",
    familia: "TÁCTICA DEFENSIVA",
    age_category: "infantil",
    categoria_edad: ["infantil"],
    bloque_sesion: "global",
    objetivo_tactico: ["presión", "bloque", "defensa del área"],
    objetivo_tecnico: ["pase", "despeje"],
    carga_fisica: 4,
    carga_cognitiva: 3,
    oposicion: 4,
    representatividad: 4,
    duracion_recomendada: 20,
    min_players: 16,
    max_players: 18,
    criterios_exito: ["Líneas compactas"]
  }
];

const sessionContext = {
  category: "infantil",
  objective: "Presión tras pérdida",
  secondaryObjectives: ["Transición defensiva", "Superioridad"],
  numPlayers: 16,
  durationMinutes: 90,
  microcycleDay: "MD-3",
  intensityLoad: 4,
  availableSpace: "Medio campo",
  recentExerciseIds: []
};

console.log("--- ACTIVACION SCORES ---");
mockExercises.forEach(ex => {
  const sc = scoreExercise(ex, { ...sessionContext, targetBlock: "activacion" });
  console.log(`${ex.id} (${ex.nombre}): ${sc.score}`, sc.breakdown);
});

console.log("\n--- PRINCIPAL 2 SCORES ---");
mockExercises.forEach(ex => {
  const sc = scoreExercise(ex, { ...sessionContext, targetBlock: "principal_2" });
  console.log(`${ex.id} (${ex.nombre}): ${sc.score}`, sc.breakdown);
});

console.log("\n--- GLOBAL SCORES ---");
mockExercises.forEach(ex => {
  const sc = scoreExercise(ex, { ...sessionContext, targetBlock: "global" });
  console.log(`${ex.id} (${ex.nombre}): ${sc.score}`, sc.breakdown);
});
