// Gives the agent's browser a short-lived Twilio token so it can place a real phone call.
import { accessToken, allowed, phoneReady } from './_lib/twilio.js';

export default function handler(req, res) {
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  if (!phoneReady()) return res.status(503).json({ error: 'Twilio is not set up yet (see README, step "Real phone calls").' });
  return res.status(200).json({ token: accessToken('agent-arvind') });
}
