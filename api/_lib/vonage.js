// Small Vonage Voice API helpers (no SDK needed): environment, RS256 JWT, REST calls, status mapping.
// Secrets live ONLY in Vercel environment variables:
//   VONAGE_APPLICATION_ID  - the Application id (a UUID)
//   VONAGE_PRIVATE_KEY     - the full text of the private.key file (or the same text base64-encoded)
//   VONAGE_FROM            - optional caller id; defaults to Vonage's trial test caller id
import crypto from 'node:crypto';

export const venv = () => ({
  appId: (process.env.VONAGE_APPLICATION_ID || '').trim(),
  key: process.env.VONAGE_PRIVATE_KEY || '',
  from: String(process.env.VONAGE_FROM || process.env.VONAGE_NUMBER || '123456789').replace(/\D/g, ''),
});

/** Accepts the PEM as pasted (real line breaks), with literal "\n", or base64-encoded. */
export function privateKey() {
  let k = (venv().key || '').trim().replace(/^"|"$/g, '');
  if (!k) return '';
  if (!k.includes('BEGIN')) { try { k = Buffer.from(k, 'base64').toString('utf8'); } catch { /* ignore */ } }
  return k.replace(/\\n/g, '\n').trim();
}

export const vonageReady = () => !!(venv().appId && privateKey().includes('BEGIN'));

const b64u = (b) => Buffer.from(b).toString('base64url');

/** A short-lived JWT proving to Vonage that this server owns the application. */
export function vonageJwt(ttl = 600) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ application_id: venv().appId, iat: now, nbf: now - 5, exp: now + ttl, jti: crypto.randomUUID() }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${body}`).sign(privateKey());
  return `${head}.${body}.${b64u(sig)}`;
}

export async function vonageRest(method, path, json) {
  const r = await fetch(`https://api.nexmo.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${vonageJwt()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await r.text();
  let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, data };
}

/** Vonage "1555..." digits only, from any phone format ("+91 79958 07656" -> "917995807656"). */
export const toVonageNumber = (e164) => String(e164 || '').replace(/\D/g, '');

/** Maps Vonage call states onto the words our agent screen already understands (the Twilio ones). */
export function mapStatus(s) {
  const v = String(s || '').toLowerCase();
  if (['started', 'ringing'].includes(v)) return 'ringing';
  if (['answered', 'machine'].includes(v)) return 'in-progress';
  if (v === 'completed') return 'completed';
  if (v === 'busy') return 'busy';
  if (['unanswered', 'timeout'].includes(v)) return 'no-answer';
  if (['cancelled', 'canceled'].includes(v)) return 'canceled';
  if (['failed', 'rejected'].includes(v)) return 'failed';
  return v || 'unknown';
}

export const isVonageId = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

/** Turns Vonage's raw error into one sentence that says what to fix. */
export function friendlyVonageError(r = {}) {
  const d = r.data || {};
  const raw = d.title || d.detail || d.error_title || d.message || d.raw || 'Vonage refused the call.';
  const text = `${raw} ${d.detail || ''}`.toLowerCase();
  let error = String(raw);
  if (r.status === 401) error = 'Vonage rejected the key. Check VONAGE_APPLICATION_ID and VONAGE_PRIVATE_KEY in Vercel (paste the whole private.key text), then redeploy.';
  else if (/whitelist|not allowed|demo|trial|restricted|destination/.test(text)) error = 'Vonage trial accounts can only call the phone number you signed up with. Use that number, or add credit to your Vonage account.';
  else if (/caller|from/.test(text) && r.status === 422) error = 'Vonage did not accept the caller id. Set VONAGE_FROM in Vercel (your Vonage number, digits only) or leave it empty to use the trial test caller id.';
  else if (r.status === 402 || /balance|credit|funds/.test(text)) error = 'Your Vonage account has no credit left.';
  return { error, code: r.status, detail: raw === error ? undefined : String(raw) };
}
