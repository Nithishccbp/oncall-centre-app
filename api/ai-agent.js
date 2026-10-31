// Web test line: the customer page asks for Avani's next sentence here. (Phone AI calls use api/ai-voice.js.)
import { avaniReply, customerReply } from './_lib/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { messages = [], lead = {}, role, persona } = req.body || {};
  if (role === 'customer') return res.status(200).json(await customerReply(Array.isArray(messages) ? messages : [], persona || {})); // call practice: the AI plays the customer
  const out = await avaniReply(messages, lead);
  return res.status(200).json(out);
}
