// Starts (or ends) a REAL phone call from the AI agent, Avani, to a customer's phone number.
// Works with either provider (the one whose keys are in Vercel is used; Vonage wins if both are set):
//   Vonage: we create the call with the first words inline, then Vonage asks api/vonage-ai.js what to say next.
//   Twilio: Twilio rings the number; when the customer picks up, it asks api/ai-voice.js what to say.
import { aiPhoneReady, allowed, baseUrl, toE164, twilioRest, env, friendlyTwilioError } from './_lib/twilio.js';
import { vonageReady, venv, vonageRest, toVonageNumber, isVonageId, friendlyVonageError } from './_lib/vonage.js';

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  const useVonage = vonageReady();
  if (!useVonage && !aiPhoneReady()) return res.status(503).json({ error: 'Phone calling is not set up yet (see VONAGE_SETUP.md).' });
  const { to, lead = {}, end, sid } = req.body || {};

  if (end) {
    if (useVonage) {
      if (!isVonageId(sid)) return res.status(400).json({ error: 'bad call id' });
      const r = await vonageRest('PUT', `/v1/calls/${sid}`, { action: 'hangup' });
      return res.status(200).json({ ok: r.ok });
    }
    if (!/^CA[0-9a-f]{32}$/.test(String(sid))) return res.status(400).json({ error: 'bad call id' });
    const r = await twilioRest('POST', `Calls/${sid}.json`, { Status: 'completed' });
    return res.status(200).json({ ok: r.ok });
  }

  const number = toE164(to);
  if (!number) return res.status(400).json({ error: 'That phone number does not look right. Use the 10-digit mobile number or +country code.' });
  const state = { p: 'intro', n: 0, sil: 0, c: 0, h: [], l: { name: String(lead.name || '').slice(0, 40), product: String(lead.product || '').slice(0, 60), price: Number(lead.price) || 0 } };

  if (useVonage) {
    const name = state.l.name.split(' ')[0] || 'there';
    const hello = `Hello ${name}, this is Avani, calling from The Sleep Company. This call may be recorded and transcribed to improve our service. Is that okay with you? Please say yes or no.`;
    const next = b64u({ ...state, p: 'consent' });
    const r = await vonageRest('POST', '/v1/calls', {
      to: [{ type: 'phone', number: toVonageNumber(number) }],
      from: { type: 'phone', number: venv().from },
      ringing_timer: 35,
      event_url: [`${baseUrl(req)}/api/vonage-event`],
      ncco: [
        { action: 'talk', text: hello, language: 'en-IN', style: Number(process.env.VONAGE_VOICE_STYLE || 0) },
        { action: 'input', type: ['speech'], eventUrl: [`${baseUrl(req)}/api/vonage-ai?s=${next}`], eventMethod: 'POST', speech: { language: 'en-IN', endOnSilence: 1.2, startTimeout: 8, maxDuration: 15 } },
      ],
    });
    if (!r.ok || !r.data.uuid) return res.status(502).json(friendlyVonageError(r));
    return res.status(200).json({ sid: r.data.uuid });
  }

  const r = await twilioRest('POST', 'Calls.json', {
    To: number, From: env().number, Timeout: '35',
    Url: `${baseUrl(req)}/api/ai-voice?s=${b64u(state)}`, Method: 'POST',
  });
  if (!r.ok) return res.status(502).json(friendlyTwilioError(r.data));
  return res.status(200).json({ sid: r.data.sid });
}
