// Free-trial friendly "click to call": Twilio rings the customer's phone first; when they pick up,
// the call is connected to the agent's browser (identity), which answers automatically.
import { allowed, env, phoneReady, toE164, twilioRest, xmlEscape, friendlyTwilioError } from './_lib/twilio.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  if (!phoneReady()) return res.status(503).json({ error: 'Twilio is not set up yet (see TWILIO_SETUP.md).' });
  const { to, identity, end, sid } = req.body || {};
  if (end) {
    if (!/^CA[0-9a-f]{32}$/.test(String(sid))) return res.status(400).json({ error: 'bad call id' });
    const r = await twilioRest('POST', `Calls/${sid}.json`, { Status: 'completed' });
    return res.status(200).json({ ok: r.ok });
  }
  const number = toE164(to);
  if (!number) return res.status(400).json({ error: 'That phone number does not look right.' });
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(String(identity || ''))) return res.status(400).json({ error: 'bad agent id' });
  const twiml = `<Response><Dial answerOnBridge="true" timeout="25"><Client>${xmlEscape(identity)}</Client></Dial></Response>`;
  const r = await twilioRest('POST', 'Calls.json', { To: number, From: env().number, Timeout: '35', Twiml: twiml });
  if (!r.ok) return res.status(502).json(friendlyTwilioError(r.data));
  return res.status(200).json({ sid: r.data.sid });
}
