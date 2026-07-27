require('dotenv').config({ path: '.env.local' });
const https = require('https');

function insertApparel() {
  return new Promise((resolve) => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/player_apparel');
    const data = JSON.stringify({
      player_id: '00000000-0000-0000-0000-000000000000', // invalid player, but let's see if there's a constraint error or FK error
      item_name: 'Camiseta de Juego',
      size: 'M',
      delivered: false
    });

    const options = {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      rejectUnauthorized: false
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: responseData }));
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  const res = await insertApparel();
  console.log('Result:', res);
}
run();
