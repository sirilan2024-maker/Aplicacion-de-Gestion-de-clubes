const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'goal_audit_deep_results.json'), 'utf8'));

console.log('TOTAL MATCHES WITH GOAL DIFFERENCE:', data.goalDiscrepancies.length);
console.log('====================================================\n');

data.goalDiscrepancies.forEach((d, i) => {
  console.log(`[${i + 1}] ${d.team} | Jornada ${d.matchday} | Fecha: ${d.date} | Codacta: ${d.codacta}`);
  console.log(`    Partido: ${d.homeTeam} vs ${d.awayTeam}`);
  console.log(`    Marcador Oficial: Saladar ${d.myOfficialGoals} - Rival ${d.rivalOfficialGoals}`);
  console.log(`    Goles Saladar en Acta (${d.ourGoalsCountInActa}):`);
  d.ourGoalsEvents.forEach(g => console.log(`      - Minuto ${g.minuto}': ${g.nombre_jugador} (codjugador: ${g.codjugador}, tipo: ${g.tipo_gol})`));
  console.log(`    Goles Rival en Acta (${d.rivalGoalsCountInActa}):`);
  d.rivalGoalsEvents.forEach(g => console.log(`      - Minuto ${g.minuto}': ${g.nombre_jugador} (codjugador: ${g.codjugador}, tipo: ${g.tipo_gol})`));
  console.log(`    Diferencia Saladar (Marcador - Acta): ${d.diff}`);
  console.log('----------------------------------------------------');
});

console.log('\nPROPIAS PUERTAS ENCONTRADAS:');
console.log(JSON.stringify(data.ownGoalEvents, null, 2));
