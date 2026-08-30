process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as fs from 'fs';
import * as path from 'path';

async function runConfigSecurityTests() {
  console.log('--- STARTING P07 CONFIG & SECRETS SECURITY TESTS ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failCount++;
    }
  }

  // 1. Secrets: SUPABASE_SERVICE_ROLE_KEY must NOT be exposed under NEXT_PUBLIC_
  const envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  const hasPublicServiceRole = envLocal.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') || 
                               envLocal.includes('NEXT_PUBLIC_SERVICE_ROLE');
  assert(!hasPublicServiceRole, 'SUPABASE_SERVICE_ROLE_KEY is never exposed with NEXT_PUBLIC_ prefix');

  // 2. Secrets: Private API keys must not have NEXT_PUBLIC_ prefix
  const hasPublicGroq = envLocal.includes('NEXT_PUBLIC_GROQ_API_KEY');
  const hasPublicGemini = envLocal.includes('NEXT_PUBLIC_GEMINI_API_KEY');
  assert(!hasPublicGroq && !hasPublicGemini, 'Private AI API keys do not use NEXT_PUBLIC_ prefix');

  // 3. Secrets: No hardcoded JWT service_role keys in root .js files
  const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.js'));
  let hardcodedKeyFound = false;
  for (const rf of rootFiles) {
    const content = fs.readFileSync(rf, 'utf8');
    if (content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ')) {
      hardcodedKeyFound = true;
      break;
    }
  }
  assert(!hardcodedKeyFound, 'No hardcoded service_role JWTs in root scripts');

  // 4. Client/Server Isolation: No client component imports createAdminClient
  function scanDir(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !full.includes('node_modules') && !full.includes('.next')) {
        results = results.concat(scanDir(full));
      } else if (/\.(tsx|jsx)$/.test(f)) {
        results.push(full);
      }
    }
    return results;
  }

  const tsxFiles = scanDir('src');
  let clientImportingAdmin = false;
  for (const f of tsxFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const isClient = content.includes('"use client"') || content.includes("'use client'");
    const importsAdmin = content.includes('createAdminClient');
    if (isClient && importsAdmin) {
      clientImportingAdmin = true;
      console.error(`Leaked in: ${f}`);
      break;
    }
  }
  assert(!clientImportingAdmin, 'No "use client" components import createAdminClient');

  // 5. Next.js Config: poweredByHeader is explicitly false
  const nextConfigContent = fs.readFileSync('next.config.ts', 'utf8');
  assert(nextConfigContent.includes('poweredByHeader: false'), 'Next.js poweredByHeader is set to false');

  // 6. Next.js Config: Security headers are configured
  const hasXContentType = nextConfigContent.includes('X-Content-Type-Options') && nextConfigContent.includes('nosniff');
  const hasXFrame = nextConfigContent.includes('X-Frame-Options');
  const hasReferrer = nextConfigContent.includes('Referrer-Policy');
  const hasHSTS = nextConfigContent.includes('Strict-Transport-Security');
  assert(hasXContentType && hasXFrame && hasReferrer && hasHSTS, 'Security headers configured in next.config.ts (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS)');

  // 7. Dev Endpoints: seed-formative is blocked in production
  const seedContent = fs.readFileSync('src/app/api/seed-formative/route.ts', 'utf8');
  const hasProdGuard = seedContent.includes("process.env.NODE_ENV === 'production'") && 
                       seedContent.includes('Endpoint de desarrollo no disponible en producción');
  assert(hasProdGuard, 'Development seed endpoint (/api/seed-formative) is disabled in production');

  // 8. .gitignore: .env files are properly gitignored
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert(gitignore.includes('.env*') || gitignore.includes('.env.local'), '.env and credentials files are properly excluded in .gitignore');

  console.log('----------------------------------------------------');
  console.log(`P07 CONFIG SECURITY RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runConfigSecurityTests();
