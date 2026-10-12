// The agent screen polls this during an AI phone call: is it ringing / answered / finished, and what was said (if consented).
import { allowed, twilioRest } from './_lib/twilio.js';
import { readEvents } from './_lib/store.js';

export default async function handler(req, res) {
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  const sid = String(req.query.sid || '');
  if (!/^CA[0-9a-f]{32}$/.test(sid)) return res.status(400).json({ error: 'bad call id' });
  const from = Math.max(0, Number(req.query.from) || 0);
  const [r, events] = await Promise.all([twilioRest('GET', `Calls/${sid}.json`), readEvents(sid, from)]);
  return res.status(200).json({ status: r.data?.status || 'unknown', events, next: from + events.length });
}
