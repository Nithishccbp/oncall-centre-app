// POST /api/ingest/conversation  — the recorder app sends one finished conversation here.
// Auth: Authorization: Bearer <INGEST_API_KEY>  (set INGEST_API_KEY in Vercel). Idempotent on conversation_id.
import { timingSafeEqual } from 'node:crypto';
import { validate, normalise } from '../_lib/ingest.js';
import { saveConversation, durable } from '../_lib/store.js';

export const authOk = (req) => {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.headers['x-api-key'] || '');
  const a = Buffer.from(got), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, endpoint: 'POST /api/ingest/conversation', configured: !!process.env.INGEST_API_KEY, durable: durable() });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.INGEST_API_KEY) return res.status(503).json({ error: 'ingest_not_configured', hint: 'Set INGEST_API_KEY in Vercel and redeploy.' });
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const errors = validate(req.body);
  if (errors.length) return res.status(422).json({ error: 'invalid_payload', details: errors });
  const conv = normalise(req.body);
  const { duplicate } = await saveConversation(conv);
  return res.status(duplicate ? 200 : 202).json({ ok: true, conversation_id: conv.conversation_id, duplicate, durable: durable(), tags: conv.tags, landed: conv.landed });
}
