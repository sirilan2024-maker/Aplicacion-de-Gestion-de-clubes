process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const url = new URL(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      // We want to see relationships for fees
      const feesRelationships = parsed.definitions.fees;
      console.log('Fees definition:', JSON.stringify(feesRelationships, null, 2));
    } catch (e) {
      console.log('Error parsing OpenAPI spec');
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
