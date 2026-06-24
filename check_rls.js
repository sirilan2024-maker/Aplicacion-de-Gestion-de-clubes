const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
for(const line of lines) {
  if(line.includes('DATABASE_URL')) {
     const url = line.split('=')[1].trim().replace(/['"]/g, '');
     const { Client } = require('pg');
     const c = new Client({ connectionString: url });
     c.connect().then(() => {
       c.query("SELECT tablename, policyname, qual FROM pg_policies WHERE qual LIKE '%equipos%'").then(res => {
         console.log('POLICIES WITH EQUIPOS:', res.rows);
         c.end();
       }).catch(console.error);
     }).catch(console.error);
     break;
  }
}
