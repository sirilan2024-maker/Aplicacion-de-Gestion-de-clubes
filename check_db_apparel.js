require('dotenv').config({ path: '.env.local' });
const https = require('https');

function getRecentPlayersAndApparel() {
  return new Promise((resolve) => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/players?select=id,first_name,last_name,player_apparel(item_name,size)&order=created_at.desc&limit=5');
    
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
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: responseData }));
    });

    req.end();
  });
}

async function run() {
  const res = await getRecentPlayersAndApparel();
  console.log('Recent players:', JSON.stringify(JSON.parse(res.data), null, 2));
}
run();
