import * as fs from 'fs';

interface TableInfo {
  tablename: string;
  rowsecurity: boolean;
}

interface PolicyInfo {
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

interface FunctionInfo {
  proname: string;
  prosecdef: boolean;
  provolatile: string;
}

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
}

const raw = fs.readFileSync('scripts/p06_db_inventory.json', 'utf8');
const data = JSON.parse(raw);

const tables: TableInfo[] = data.tables;
const policies: PolicyInfo[] = data.policies;
const functions: FunctionInfo[] = data.functions;
const buckets: BucketInfo[] = data.buckets;
const storagePolicies: PolicyInfo[] = data.storagePolicies;

console.log("=== 1. TABLES WITHOUT RLS (rowsecurity = false) ===");
const noRls = tables.filter(t => !t.rowsecurity);
noRls.forEach(t => console.log(`  - ${t.tablename}`));

console.log("\n=== 2. OVERLY PERMISSIVE POLICIES (qual = 'true' or with_check = 'true') ===");
const permissive = policies.filter(p => p.qual === 'true' || p.with_check === 'true');
permissive.forEach(p => {
  console.log(`  - [${p.tablename}] "${p.policyname}" (${p.cmd}) roles: ${JSON.stringify(p.roles)} | qual: ${p.qual} | with_check: ${p.with_check}`);
});

console.log("\n=== 3. SENSITIVE TABLES AUDIT ===");
const sensitiveTables = [
  'profiles', 'clubs', 'players', 'families', 'registrations', 'fees', 
  'fee_payments', 'official_receipts', 'staff_invitations', 'player_documents', 
  'player_apparel', 'apparel_stock', 'partidos', 'convocatorias', 'attendance', 
  'team_events', 'teams', 'team_coaches'
];

sensitiveTables.forEach(st => {
  const t = tables.find(x => x.tablename === st);
  const pols = policies.filter(x => x.tablename === st);
  console.log(`\nTable [${st}] (RLS: ${t?.rowsecurity ? 'ENABLED' : 'DISABLED'}): ${pols.length} policies`);
  pols.forEach(p => {
    console.log(`   * ${p.cmd} "${p.policyname}" -> USING: ${p.qual || 'N/A'} | WITH CHECK: ${p.with_check || 'N/A'}`);
  });
});

console.log("\n=== 4. SECURITY DEFINER FUNCTIONS ===");
const secDefFuncs = functions.filter(f => f.prosecdef);
secDefFuncs.forEach(f => console.log(`  - ${f.proname} (volatile: ${f.provolatile})`));

console.log("\n=== 5. STORAGE BUCKETS ===");
buckets.forEach(b => console.log(`  - Bucket: ${b.id} (public: ${b.public})`));

console.log("\n=== 6. STORAGE POLICIES ===");
storagePolicies.forEach(sp => {
  console.log(`  - [${sp.tablename}] "${sp.policyname}" (${sp.cmd}) -> USING: ${sp.qual} | WITH CHECK: ${sp.with_check}`);
});
