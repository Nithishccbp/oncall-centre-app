// Web test line: the customer page asks for Avani's next sentence here. (Phone AI calls use api/ai-voice.js.)
import { avaniReply } from './_lib/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { messages = [], lead = {} } = req.body || {};
  const out = await avaniReply(messages, lead);
  return res.status(200).json(out);
}
