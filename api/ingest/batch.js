// POST /api/ingest/batch  — { "conversations": [ ... up to 50 ... ] }, same auth and rules as the single endpoint.
import { validate, normalise } from '../_lib/ingest.js';
import { saveConversation, durable } from '../_lib/store.js';
import { authOk } from './conversation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.INGEST_API_KEY) return res.status(503).json({ error: 'ingest_not_configured' });
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const list = req.body?.conversations;
  if (!Array.isArray(list) || !list.length || list.length > 50) return res.status(422).json({ error: 'conversations must be an array of 1-50 items' });
  const results = [];
  for (const item of list) {
    const errors = validate(item);
    if (errors.length) { results.push({ conversation_id: item?.conversation_id, ok: false, details: errors }); continue; }
    const conv = normalise(item);
    const { duplicate } = await saveConversation(conv);
    results.push({ conversation_id: conv.conversation_id, ok: true, duplicate, tags: conv.tags });
  }
  return res.status(200).json({ ok: results.every((r) => r.ok), durable: durable(), results });
}
