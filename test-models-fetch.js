const fs = require('fs');

async function check() {
  const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
  let key = '';
  for (const line of envLines) {
    if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await res.json();
    console.log(data.data.map(m => m.id));
  } catch (e) {
    console.error(e);
  }
}

check();
