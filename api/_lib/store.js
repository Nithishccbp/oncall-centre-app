// Optional tiny store for the live AI-call transcript (Upstash Redis over REST; Vercel adds the variables
// automatically when you connect "Upstash for Redis" from the Vercel Marketplace).
// Without it the AI call still works end to end; only the live transcript on the agent screen is missing.
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const tok = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const storeReady = () => !!(url() && tok());

async function cmd(args) {
  const r = await fetch(url(), { method: 'POST', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const d = await r.json().catch(() => ({}));
  return d.result;
}

export async function pushEvent(sid, ev) {
  if (!storeReady() || !sid) return;
  try { await cmd(['RPUSH', `call:${sid}`, JSON.stringify(ev)]); await cmd(['EXPIRE', `call:${sid}`, '7200']); } catch { /* best effort */ }
}

export async function readEvents(sid, from = 0) {
  if (!storeReady() || !sid) return [];
  try {
    const rows = await cmd(['LRANGE', `call:${sid}`, String(from), '-1']);
    return (rows || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
