// Small Twilio helpers (no SDK needed): environment, access tokens, REST calls, phone-number cleanup.
import crypto from 'node:crypto';

export const env = () => ({
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  apiKey: process.env.TWILIO_API_KEY,
  apiSecret: process.env.TWILIO_API_SECRET,
  appSid: process.env.TWILIO_TWIML_APP_SID,
  number: process.env.TWILIO_NUMBER,
  passcode: process.env.APP_PASSCODE || '',
});

// Two ways to reach a phone from the browser:
//  'direct' (needs a TwiML App): the browser dials out through Twilio.
//  'bridge' (works on a free trial, no TwiML App): Twilio rings the customer first, then connects them to the agent's browser.
export const phoneMode = () => { const e = env(); return e.appSid ? 'direct' : 'bridge'; };
export const phoneReady = () => { const e = env(); return !!(e.sid && e.apiKey && e.apiSecret && e.number && (e.appSid || e.token)); };
export const aiPhoneReady = () => { const e = env(); return !!(e.sid && e.token && e.number); };

/** "98765 43210" -> "+919876543210". Returns null if it does not look like a real number. */
export function toE164(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) s = `+${s.slice(1).replace(/\+/g, '')}`;
  else if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (s.length === 11 && s.startsWith('0')) s = `+91${s.slice(1)}`;
  else if (s.length === 10) s = `+91${s}`;
  else if (s.length === 12 && s.startsWith('91')) s = `+${s}`;
  else s = `+${s}`;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** Optional shared passcode so strangers who find the URL cannot spend your Twilio credit. */
export function allowed(req) {
  const { passcode } = env();
  if (!passcode) return true;
  return String(req.headers['x-app-passcode'] || '') === passcode;
}

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Twilio Voice access token (a signed JWT) that lets the browser place calls through our TwiML App. */
export function accessToken(identity, ttl = 3600) {
  const e = env();
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'HS256', cty: 'twilio-fpa;v=1' };
  const payload = {
    jti: `${e.apiKey}-${now}`, iss: e.apiKey, sub: e.sid, iat: now, exp: now + ttl,
    grants: { identity, voice: { incoming: { allow: true }, ...(e.appSid ? { outgoing: { application_sid: e.appSid } } : {}) } },
  };
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  const sig = crypto.createHmac('sha256', e.apiSecret).update(data).digest();
  return `${data}.${b64u(sig)}`;
}

/** Call Twilio's REST API. */
export async function twilioRest(method, path, form) {
  const e = env();
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.sid}/${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${e.sid}:${e.token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

/** The public https address of this deployment, so Twilio knows where to send its webhooks. */
export const baseUrl = (req) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
};

export const xmlEscape = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
