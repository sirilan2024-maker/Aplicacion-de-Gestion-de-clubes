require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function getApparel() {
  return new Promise((resolve) => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/player_apparel?select=player_id,item_name,size');
    const options = {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.end();
  });
}

async function updateApparel(playerId, itemName, newSize) {
  return new Promise((resolve) => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + `/rest/v1/player_apparel?player_id=eq.${playerId}&item_name=eq.${encodeURIComponent(itemName)}`);
    const options = {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      rejectUnauthorized: false
    };
    const req = https.request(url, options, (res) => resolve(res.statusCode));
    req.write(JSON.stringify({ size: newSize }));
    req.end();
  });
}

async function run() {
  const data = await getApparel();
  let count = 0;
  for (const row of data) {
    if (['116', '128', '140', '152', '164', '176'].includes(row.size)) {
      await updateApparel(row.player_id, row.item_name, 'Talla ' + row.size);
      count++;
    }
  }
  console.log(`Updated ${count} apparel items.`);
}
run();
