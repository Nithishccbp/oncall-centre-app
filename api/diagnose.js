// "Is my calling set up right?" Open  /api/diagnose  (add ?p=YOURPASSCODE if you set APP_PASSCODE).
// It checks each setup step against Twilio and Gemini and says in plain English what to fix.
// It never prints a key, token or full phone number.
import { allowed, baseUrl, env, phoneMode } from './_lib/twilio.js';
import { avaniReply } from './_lib/ai.js';
import { storeReady } from './_lib/store.js';

const hide = (n) => (n ? `${String(n).slice(0, 3)}******${String(n).slice(-2)}` : '');

export default async function handler(req, res) {
  const e = env();
  if (e.passcode && !allowed(req) && String(req.query?.p || '') !== e.passcode) return res.status(401).json({ error: 'passcode' });

  const checks = [];
  const add = (name, ok, fix) => checks.push({ name, ok, ...(ok ? {} : { fix }) });
  const auth = { Authorization: `Basic ${Buffer.from(`${e.sid}:${e.token}`).toString('base64')}` };
  const get = async (url) => {
    try { const r = await fetch(url, { headers: auth }); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; } catch { return { ok: false, status: 0, data: {} }; }
  };
  const base = `https://api.twilio.com/2010-04-01/Accounts/${e.sid}`;

  // 1. variables present
  const need = { TWILIO_ACCOUNT_SID: e.sid, TWILIO_AUTH_TOKEN: e.token, TWILIO_API_KEY: e.apiKey, TWILIO_API_SECRET: e.apiSecret, TWILIO_NUMBER: e.number };
  const missing = Object.keys(need).filter((k) => !need[k]);
  add('Twilio variables in Vercel', !missing.length, `Missing: ${missing.join(', ')}. Add them in Vercel, Settings, Environment Variables, then Redeploy.`);

  let trial = false;
  if (!missing.length) {
    // 2. account login
    const acct = await get(`${base}.json`);
    add('Account SID + Auth Token work', acct.ok, acct.status === 401 ? 'Twilio rejected them. Copy the Account SID and Auth Token again from the Console home page.' : 'Could not reach Twilio. Try again in a minute.');
    trial = acct.data?.type === 'Trial';
    if (acct.ok) add('Account is active', acct.data?.status === 'active', `Account status is "${acct.data?.status}". Re-activate it in the Twilio Console.`);

    // 3. API key belongs to this account
    const key = await get(`${base}/Keys/${e.apiKey}.json`);
    add('API Key (SK...) belongs to this account', key.ok, 'That API key was not found. Create a Standard key under Account, API keys & tokens, and paste both the SK... id and the secret.');

    // 4. caller-ID number is yours
    const num = await get(`${base}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(e.number)}`);
    const ours = (num.data?.incoming_phone_numbers || []).length > 0;
    add(`TWILIO_NUMBER (${hide(e.number)}) is a number on this account`, num.ok && ours, 'Copy your Twilio number from Voice, Overview, Try Out Voice, in +1555... format.');

    // 5. who can be called (trial only)
    if (trial) {
      const ids = await get(`${base}/OutgoingCallerIds.json`);
      const list = (ids.data?.outgoing_caller_ids || []).map((x) => hide(x.phone_number));
      add('Trial: at least one verified number to call', list.length > 0, 'Add your mobile under Phone Numbers, Manage, Verified Caller IDs.');
      checks[checks.length - 1].verified = list;
    }

    // 6. India allowed
    try {
      const g = await fetch('https://voice.twilio.com/v1/DialingPermissions/Countries/IN', { headers: auth });
      const d = await g.json().catch(() => ({}));
      add('Calling India is allowed (Geo permissions)', g.ok && d.low_risk_numbers_enabled === true, 'Twilio Console, Voice, Settings, Geo permissions: tick India, then Save.');
    } catch { add('Calling India is allowed (Geo permissions)', false, 'Could not check. Open Voice, Settings, Geo permissions and tick India.'); }

    // 7. TwiML app (only if you set one)
    if (e.appSid) {
      const app = await get(`${base}/Applications/${e.appSid}.json`);
      const want = `${baseUrl(req)}/api/voice-twiml`;
      add('TwiML App points at this site', app.ok && app.data?.voice_url === want, `Set the TwiML App Voice Request URL to ${want} (HTTP POST).`);
    }
  }

  // 8. Gemini
  if (process.env.GEMINI_API_KEY) {
    const g = await avaniReply([{ role: 'cust', text: 'Hello?' }], { name: 'Test', product: 'mattress' });
    add('Gemini writes Avani\'s replies', g.source === 'gemini', 'Gemini did not answer, so Avani falls back to simple rules. Check GEMINI_API_KEY at aistudio.google.com/apikey.');
  } else add('Gemini writes Avani\'s replies', false, 'Optional. Add GEMINI_API_KEY in Vercel so Avani sounds natural.');

  add('Live AI-call transcript (Upstash Redis)', storeReady(), 'Optional. Vercel, Storage, add Upstash for Redis, then Redeploy.');

  const core = checks.filter((c) => !/Gemini|Redis/.test(c.name));
  const allCore = core.every((c) => c.ok);
  return res.status(200).json({
    summary: allCore ? 'Phone calling is ready. Try Plan, Calls to make, Place call.' : 'Fix the items marked ok:false, redeploy, and run this again.',
    phoneMode: phoneMode(), trialAccount: trial, checks,
  });
}
