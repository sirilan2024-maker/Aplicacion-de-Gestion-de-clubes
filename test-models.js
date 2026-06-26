const fs = require('fs');
const Groq = require('groq-sdk');
const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let key = '';
for (const line of envLines) {
  if (line.startsWith('GROQ_API_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}
const groq = new Groq({ apiKey: key });
async function check() {
  const models = await groq.models.list();
  console.log(models.data.map(m => m.id));
}
check();
