const fs = require('fs');

async function check() {
  const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
  let key = '';
  for (const line of envLines) {
    if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [{ role: 'user', content: 'test json formatting' }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

check();
