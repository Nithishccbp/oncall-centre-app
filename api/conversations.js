// GET /api/conversations?limit=100  — what the web app polls. Call transcripts and audio links are only returned with the ingest key; WhatsApp threads are returned so Pulse can show them.
import { listConversations, durable } from './_lib/store.js';
import { authOk } from './ingest/conversation.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const full = authOk(req);
  const items = (await listConversations(limit)).map((c) => (full || c.type === 'whatsapp' ? c : { ...c, transcript: [], audio_url: undefined }));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ durable: durable(), count: items.length, conversations: items });
}
