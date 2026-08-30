import * as fs from 'fs';
const data = JSON.parse(fs.readFileSync('scripts/p06_db_inventory.json', 'utf8'));
console.log('FUNCTIONS in public:');
data.functions.forEach((f: any) => console.log(`- ${f.proname} (secdef: ${f.prosecdef})`));
