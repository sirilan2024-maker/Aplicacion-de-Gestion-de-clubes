import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

function get(url: string, headers: Record<string, string> = {}) {
  return new Promise<any>((resolve, reject) => {
    https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      }
    }, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', ch => data = Buffer.concat([data, ch]));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          contentType: res.headers['content-type'],
          length: data.length,
          buffer: data,
          text: data.toString('utf8')
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  const matchId = '26331658'; // Sporting Saladar vs C.D. Cox (Senior J7)
  const group = '29509178';
  const comp = '29509171';
  const season = '21';

  console.log(`=== TESTING DOCUMENT / PDF / WEB ENDPOINTS FOR MATCH ${matchId} ===`);

  console.log('\n=== HEADERS OF https://ffcv.es/competiciones/partidos/partido.php?cod_partido=26331658 ===');
  const partidoPage = await get('https://ffcv.es/competiciones/partidos/partido.php?cod_partido=26331658');
  console.log('Headers:', partidoPage.headers);
  console.log('X-Frame-Options:', partidoPage.headers['x-frame-options']);
  console.log('Content-Security-Policy:', partidoPage.headers['content-security-policy']);
  
  // Also test other matches: Cadete A (30719699), Cadete B (30719543), Senior (26331658)
  const matchesToTest = ['30719699', '30719543', '26331658'];
  for (const mid of matchesToTest) {
    const url = `https://ffcv.es/competiciones/partidos/partido.php?cod_partido=${mid}`;
    const p = await get(url);
    console.log(`Match ${mid}: Status ${p.status}, length ${p.length}, Title: ${p.text.match(/<title>([^<]+)<\/title>/i)?.[1]}`);
  }
}

run().catch(console.error);