const teamsToVerify = [
  { name: 'Senior', codequipo: '18233', season: '21' },
  { name: 'Juvenil A', codequipo: '25055', season: '21' },
  { name: 'Juvenil B', codequipo: '30026461', season: '21' },
  { name: 'Cadete A', codequipo: '903700117', season: '21' },
  { name: 'Cadete B', codequipo: '30719536', season: '21' },
  { name: 'Infantil A', codequipo: '903700170', season: '21' },
  { name: 'Infantil B', codequipo: '903700206', season: '21' }
];

async function verifyAllTeams() {
  console.log('=== VERIFYING FFCV SEASON 21 TEAMS ===\n');

  for (const t of teamsToVerify) {
    try {
      const url = `https://ffcv.es/competiciones/equipos/equipo.php?cod_equipo=${t.codequipo}&temporada=${t.season}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();

      const compMatch = html.match(/cod_competicion=([0-9]+)/i);
      const groupMatch = html.match(/cod_grupo=([0-9]+)/i);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

      console.log(`Team: ${t.name.padEnd(12)} (codequipo: ${t.codequipo}, season: ${t.season})`);
      console.log(`  Page Title:      ${titleMatch ? titleMatch[1].trim() : 'N/A'}`);
      console.log(`  cod_competicion: ${compMatch ? compMatch[1] : 'NOT FOUND'}`);
      console.log(`  cod_grupo:       ${groupMatch ? groupMatch[1] : 'NOT FOUND'}`);

      if (groupMatch) {
        const apiUrl = 'https://ffcv.es/ws/run.php';
        const params = new URLSearchParams({
          v1: 'partidos_jornada_todos',
          cod_grupo: groupMatch[1],
          cod_competicion: compMatch ? compMatch[1] : '',
          temporada: t.season
        });
        
        const apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: params.toString()
        });
        
        const data = await apiRes.json() as any;
        const matchesCount = data?.partidos?.length || 0;
        console.log(`  Matches in group: ${matchesCount}`);

        const stdParams = new URLSearchParams({
          v1: 'clasificacion',
          cod_grupo: groupMatch[1],
          cod_competicion: compMatch ? compMatch[1] : '',
          temporada: t.season,
          jornada: '1'
        });
        const stdRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: stdParams.toString()
        });
        const stdData = await stdRes.json() as any;
        const stdCount = stdData?.clasificacion?.length || 0;
        console.log(`  Teams in standings: ${stdCount}`);
      }
      console.log('--------------------------------------------------');
    } catch (err: any) {
      console.error(`Error verifying ${t.name}:`, err.message);
    }
  }
}

verifyAllTeams().catch(console.error);
