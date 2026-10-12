// Gives the agent's browser a short-lived Twilio token so it can place a real phone call.
import crypto from 'node:crypto';
import { accessToken, allowed, phoneMode, phoneReady } from './_lib/twilio.js';

export default function handler(req, res) {
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  if (!phoneReady()) return res.status(503).json({ error: 'Twilio is not set up yet (see TWILIO_SETUP.md).' });
  const identity = `agent-${crypto.randomBytes(4).toString('hex')}`;
  return res.status(200).json({ token: accessToken(identity), identity, mode: phoneMode() });
}
