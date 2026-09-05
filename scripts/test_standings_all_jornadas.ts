import { fetchGroupStandings } from '../src/lib/ffcv/client';

async function testStandings() {
  console.log('Testing standings for Cadete B (Group 29509514):');
  for (let j = 1; j <= 5; j++) {
    try {
      const res = await fetchGroupStandings({ groupId: '29509514', matchday: j });
      console.log(`Jornada ${j}: ${res.clasificacion?.length || 0} teams in standings`);
      if (res.clasificacion && res.clasificacion.length > 0) {
        const top = res.clasificacion[0];
        const saladar = res.clasificacion.find(t => t.nombre?.toLowerCase().includes('saladar'));
        console.log(`  Top 1: ${top.nombre} (${top.puntos} pts) | Saladar: Pos ${saladar?.posicion || '-'} (${saladar?.puntos || 0} pts)`);
      }
    } catch (err: any) {
      console.error(`Jornada ${j} error:`, err.message);
    }
  }
}

testStandings().catch(console.error);
