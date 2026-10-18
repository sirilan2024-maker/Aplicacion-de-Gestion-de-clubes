process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ffcvAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function getToken() {
  return new Promise((resolve) => {
    https.get('https://ffcv.es/competiciones/', { agent: ffcvAgent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
        const m = html.match(/<meta\s+name=["']ffcv-pt["']\s+content=["']([^"']+)["']/i);
        const token = m ? m[1] : null;
        resolve({ token, cookies });
      });
    });
  });
}

async function getMatchDetails(matchId) {
  const { token, cookies } = await getToken();
  console.log('Got token:', Boolean(token), 'cookies:', Boolean(cookies));
  return new Promise((resolve, reject) => {
    const url = 'https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=' + matchId;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json, text/plain, */*'
    };
    if (token) headers['X-FFCV-Page-Token'] = token;
    if (cookies) headers['Cookie'] = cookies;
    https.get(url, { agent: ffcvAgent, headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Status ' + res.statusCode + ': ' + data.slice(0, 200)));
        }
      });
    });
  });
}

async function test() {
  try {
    const details = await getMatchDetails('26532793');
    console.log('Acta cerrada:', details.acta_cerrada);
    console.log('Local:', details.equipo_local, 'Goles:', details.goles_local);
    console.log('Visitante:', details.equipo_visitante, 'Goles:', details.goles_visitante);
    console.log('Visitante players count:', details.jugadores_equipo_visitante?.length);
    console.log('Local goals:', details.goles_equipo_local);
    console.log('Visitante goals:', details.goles_equipo_visitante);
    console.log('Visitante cards:', details.tarjetas_equipo_visitante);

    // Now test finding the internal match
    const { data: partido } = await supabase
      .from('partidos')
      .select('id, equipo_id, rival_nombre, season_id, acta_oficial_url, fecha_hora, lugar')
      .eq('season_id', '663ed6ef-1dab-4350-9489-ed50f9e9ac15')
      .or('acta_oficial_url.ilike.%CodPartido=26532793%,acta_oficial_url.ilike.%26532793%');
    console.log('Found internal partido in 26/27:', partido);

    // Now check players in Infantil A
    const { data: players } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id')
      .eq('team_id', '7d07d46f-51e4-44f6-891c-b966a86b9cae');
    console.log('Infantil A players count in DB:', players?.length);
  } catch (err) {
    console.error('Test error:', err);
  }
}
test();
