process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(key + '='));
  if (!line) return null;
  return line.substring(key.length + 1).trim().replace(/^["']|["']$/g, '');
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const customFetch = (fetchUrl, options = {}) => {
  return new Promise((resolve, reject) => {
    const u = new URL(fetchUrl);
    const headers = {};
    if (options.headers) {
      if (typeof options.headers.forEach === 'function') {
        options.headers.forEach((v, k) => { headers[k] = v; });
      } else if (typeof options.headers.entries === 'function') {
        for (const [k, v] of options.headers.entries()) {
          headers[k] = v;
        }
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.assign(headers, options.headers);
      }
    }
    if (!headers['apikey']) headers['apikey'] = key;
    if (!headers['Authorization'] && !headers['authorization']) headers['Authorization'] = `Bearer ${key}`;

    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: headers,
      agent: httpsAgent,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: async () => JSON.parse(body),
          text: async () => body,
          headers: {
            get: (h) => res.headers[h.toLowerCase()]
          }
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: customFetch }
});

const ffcvAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function fetchMatchDetails(matchId) {
  return new Promise((resolve, reject) => {
    const reqUrl = `https://ffcv.es/competiciones/api/partidos/ficha_partido_ajax.php?cod_partido=${matchId}`;
    https.get(reqUrl, { agent: ffcvAgent, headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getCategoryDuration(teamCategory, teamName) {
  const norm = (teamName + ' ' + (teamCategory || '')).toLowerCase();
  if (norm.includes('infantil')) return 70;
  if (norm.includes('cadete')) return 80;
  if (norm.includes('alevin') || norm.includes('benjamin') || norm.includes('prebenjamin')) return 60;
  return 90; // Senior, Juvenil
}

async function main() {
  console.log('=== TABLAS EXISTENTES EN BD ===\n');

  const { data: tables } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  });

  console.log('Tablas en base de datos:');
  console.log(tables ? tables.map(r => r.table_name) : 'No rpc available');
}

main().catch(console.error);
