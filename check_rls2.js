const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
for(const line of lines) {
  if(line.includes('DATABASE_URL=')) {
     const url = line.split('=')[1].trim().replace(/['"]/g, '');
     const { Client } = require('pg');
     const c = new Client({ connectionString: url });
     c.connect().then(() => {
       c.query(`SELECT schemaname, tablename, policyname, qual, with_check, roles, cmd FROM pg_policies WHERE qual LIKE '%equipos_old_archive%' OR with_check LIKE '%equipos_old_archive%';`).then(res => {
         console.log(JSON.stringify(res.rows, null, 2));
         c.end();
       }).catch(console.error);
     }).catch(console.error);
     break;
  }
}
