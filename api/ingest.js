// One function for the whole ingest feature (Vercel Hobby allows 12 functions). vercel.json maps the public paths:
//   POST /api/ingest/conversation  -> one conversation        POST /api/ingest/batch -> { conversations: [...] } up to 50
//   GET  /api/conversations        -> list for the web app    GET  /api/ingest/conversation -> health
// Auth for POST: Authorization: Bearer <INGEST_API_KEY>. Idempotent on conversation_id.
import { validate, normalise, authOk } from './_lib/ingest.js';
import { saveConversation, listConversations, durable } from './_lib/store.js';

async function one(item) {
  const errors = validate(item);
  if (errors.length) return { ok: false, conversation_id: item?.conversation_id, details: errors };
  const conv = normalise(item);
  const { duplicate } = await saveConversation(conv);
  return { ok: true, conversation_id: conv.conversation_id, duplicate, tags: conv.tags, landed: conv.landed };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const path = String(req.url || '').split('?')[0];
    if (/ingest/.test(path)) return res.status(200).json({ ok: true, endpoint: 'POST /api/ingest/conversation', configured: !!process.env.INGEST_API_KEY, durable: durable() });
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 100));
    const full = authOk(req);
    const items = (await listConversations(limit)).map((c) => (full || c.type === 'whatsapp' ? c : { ...c, transcript: [], audio_url: undefined }));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ durable: durable(), count: items.length, conversations: items });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.INGEST_API_KEY) return res.status(503).json({ error: 'ingest_not_configured', hint: 'Set INGEST_API_KEY in Vercel and redeploy.' });
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const list = req.body?.conversations;
  if (list !== undefined) {
    if (!Array.isArray(list) || !list.length || list.length > 50) return res.status(422).json({ error: 'conversations must be an array of 1-50 items' });
    const results = [];
    for (const it of list) results.push(await one(it));
    return res.status(200).json({ ok: results.every((r) => r.ok), durable: durable(), results });
  }
  const r = await one(req.body);
  if (!r.ok) return res.status(422).json({ error: 'invalid_payload', details: r.details });
  return res.status(r.duplicate ? 200 : 202).json({ ...r, durable: durable() });
}
