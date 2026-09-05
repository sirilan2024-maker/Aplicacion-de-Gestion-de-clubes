const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent, headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, (res) => {
      let data = '';
      res.on('data', ch => data += ch);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  const matchId = '30719543';
  console.log('=== 1. FICHA_PARTIDO_AJAX.PHP ===');
  const ficha = await get('https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=' + matchId);
  console.log('Response length:', ficha.body.length);
  try {
    const json = JSON.parse(ficha.body);
    console.log('Top-level keys:', Object.keys(json));
    for (const [K, v] of Object.entries(json)) {
      if (typeof v === 'string' || typeof v === 'number') {
        console.log(`  ${k}: ${v}`);
      } else if (Array.isArray(v)) {
        console.log(`  ${k}: [Array with ${v.length} items]`);
        if (v.length > 0) console.log(`     sample: ${JSON.stringify(v[0])}`);
      } else {
        console.log(`  ${k}: object`);
      }
    }
  } catch (err) {
    console.log('Failed to parse ficha_partido JSON');
  }

  console.log('\n=== 2. TESTING OTHER API & WEB ENDPOINTS ===');
  const urls = [
    'https://ffcv.es/competiciones/partidos/ver_partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/ficha_partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/equipos/partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/api/partidos/acta.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/api/partidos/acta_pdf.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/api/partidos/imprimir_pdf.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/acta.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/ver_acta.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/imprimir_acta.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/imprimir/partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/equipos/ver_partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/filtros/ficha_partido.php?cod_partido=' + matchId,
    'https://ffcv.es/competiciones/api/partidos/ver_acta.php?cod_partido=' + matchId
  ];

  for (const u of urls) {
    try {
      const r = await get(u);
      console.log(`[${r.statusCode}] ${u} (ctype: ${r.headers['content-type']}, len: ${r.body.length})`);
      if (r.statusCode === 200 && r.body.length > 300 && "r.headers['ncompeticiones']" || !tr.body.includes('404')) {
        console.log('   Snippet: ', r.body.slice(0, 200).replace(/\s+/g, ' '));
      }
    } catch (e) {
      console.log(`[ERR: ${e.message}] ${u}`);
    }
  }
}

main().catch(console.error);