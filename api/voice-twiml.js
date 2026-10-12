// Twilio calls this when the browser starts a call. We answer with TwiML: "dial this real phone number".
import { env, toE164, xmlEscape } from './_lib/twilio.js';

export default function handler(req, res) {
  const body = req.body || {};
  const to = toE164(body.To || req.query.To);
  res.setHeader('Content-Type', 'text/xml');
  if (!to) return res.status(200).send('<Response><Say>That phone number is not valid.</Say><Hangup/></Response>');
  return res.status(200).send(
    `<Response><Dial callerId="${xmlEscape(env().number)}" answerOnBridge="true" timeout="40"><Number>${xmlEscape(to)}</Number></Dial></Response>`,
  );
}
