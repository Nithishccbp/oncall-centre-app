// Starts (or ends) a REAL phone call from the AI agent, Avani, to a customer's phone number.
// Twilio rings the number; when the customer picks up, Twilio asks api/ai-voice.js what to say.
import { aiPhoneReady, allowed, baseUrl, toE164, twilioRest, env, friendlyTwilioError } from './_lib/twilio.js';

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  if (!aiPhoneReady()) return res.status(503).json({ error: 'Twilio is not set up yet (see README, step "Real phone calls").' });
  const { to, lead = {}, end, sid } = req.body || {};

  if (end) {
    if (!/^CA[0-9a-f]{32}$/.test(String(sid))) return res.status(400).json({ error: 'bad call id' });
    const r = await twilioRest('POST', `Calls/${sid}.json`, { Status: 'completed' });
    return res.status(200).json({ ok: r.ok });
  }

  const number = toE164(to);
  if (!number) return res.status(400).json({ error: 'That phone number does not look right. Use the 10-digit mobile number or +country code.' });
  const state = { p: 'intro', n: 0, sil: 0, c: 0, h: [], l: { name: String(lead.name || '').slice(0, 40), product: String(lead.product || '').slice(0, 60), price: Number(lead.price) || 0 } };
  const r = await twilioRest('POST', 'Calls.json', {
    To: number, From: env().number, Timeout: '35',
    Url: `${baseUrl(req)}/api/ai-voice?s=${b64u(state)}`, Method: 'POST',
  });
  if (!r.ok) return res.status(502).json(friendlyTwilioError(r.data));
  return res.status(200).json({ sid: r.data.sid });
}
