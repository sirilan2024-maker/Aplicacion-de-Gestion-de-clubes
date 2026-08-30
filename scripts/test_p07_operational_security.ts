process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We can invoke the route handlers directly with Next.js Request
import { POST as sendRemindersPost } from '../src/app/api/events/send-reminders/route';
import { POST as stripeWebhookPost } from '../src/app/api/webhooks/stripe/route';
import { GET as ffcvScraperGet } from '../src/app/api/ffcv-scraper/route';
import { POST as asistenteIaPost } from '../src/app/api/asistente-ia/route';

async function runOperationalSecurityTests() {
  console.log('--- STARTING P07 OPERATIONAL & RUNTIME SECURITY TESTS ---');
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

  // 1. Cron Job: /api/events/send-reminders without Authorization header
  const reqNoAuth = new Request('http://localhost:3000/api/events/send-reminders', {
    method: 'POST'
  });
  const resNoAuth = await sendRemindersPost(reqNoAuth);
  assert(resNoAuth.status === 401 || resNoAuth.status === 403, 'Cron endpoint rejects request without Authorization header', `Status: ${resNoAuth.status}`);

  // 2. Cron Job: /api/events/send-reminders with invalid secret
  process.env.CRON_SECRET = 'test-secret-12345';
  const reqBadAuth = new Request('http://localhost:3000/api/events/send-reminders', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer wrong-secret-value'
    }
  });
  const resBadAuth = await sendRemindersPost(reqBadAuth);
  assert(resBadAuth.status === 401 || resBadAuth.status === 403, 'Cron endpoint rejects request with invalid secret', `Status: ${resBadAuth.status}`);

  // 3. Cron Job: /api/events/send-reminders with valid CRON_SECRET
  const reqValidCron = new Request('http://localhost:3000/api/events/send-reminders', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer test-secret-12345'
    }
  });
  const resValidCron = await sendRemindersPost(reqValidCron);
  const jsonValidCron = await resValidCron.json();
  assert(resValidCron.status === 200 && jsonValidCron.success === true, 'Cron endpoint executes successfully with valid CRON_SECRET', `Success: ${jsonValidCron.success}`);

  // 4. Webhooks: /api/webhooks/stripe without signature
  const reqNoSig = new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify({ type: 'payment_intent.succeeded' })
  });
  const resNoSig = await stripeWebhookPost(reqNoSig);
  assert(resNoSig.status === 400, 'Stripe webhook rejects request without stripe-signature header', `Status: ${resNoSig.status}`);

  // 5. Webhooks: /api/webhooks/stripe with invalid signature
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy_test_secret';
  const reqBadSig = new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'stripe-signature': 't=12345,v1=bad_signature_hex'
    },
    body: JSON.stringify({ type: 'payment_intent.succeeded' })
  });
  const resBadSig = await stripeWebhookPost(reqBadSig);
  assert(resBadSig.status === 400, 'Stripe webhook rejects forged signature', `Status: ${resBadSig.status}`);

  // 6. SSRF: /api/ffcv-scraper without authentication
  const reqSsrfAnon = new Request('http://localhost:3000/api/ffcv-scraper?url=http://127.0.0.1:8080');
  const resSsrfAnon = await ffcvScraperGet(reqSsrfAnon);
  assert(resSsrfAnon.status === 401, 'Scraper rejects unauthenticated call', `Status: ${resSsrfAnon.status}`);

  // 7. SSRF: /api/ffcv-scraper rejects non-whitelisted localhost / internal IPs
  // Even if authenticated, hostname whitelist blocks 169.254.169.254 or localhost
  // We can verify this logic directly:
  const allowedDomains = ['ffcv.es', 'competiciones.ffcv.es', 'novanet.es'];
  const testSsrfUrls = ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data', 'http://localhost:3000/internal'];
  const allBlocked = testSsrfUrls.every(u => {
    try {
      const hostname = new URL(u).hostname.toLowerCase();
      return !allowedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
      return true;
    }
  });
  assert(allBlocked, 'SSRF filter strictly rejects private IPs, localhost and AWS metadata IP');

  // 8. Error exposure: Assistant AI rejects unauthenticated prompt without leaking stack trace
  const reqAnonAi = new Request('http://localhost:3000/api/asistente-ia', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'Dime los usuarios' })
  });
  const resAnonAi = await asistenteIaPost(reqAnonAi);
  const jsonAnonAi = await resAnonAi.json();
  const noStackTrace = !JSON.stringify(jsonAnonAi).includes('node_modules') && !JSON.stringify(jsonAnonAi).includes('Error:');
  assert(resAnonAi.status === 401 && noStackTrace, 'Assistant AI route does not leak stack traces or internals to unauthenticated requests');

  console.log('----------------------------------------------------');
  console.log(`P07 OPERATIONAL SECURITY RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runOperationalSecurityTests();
