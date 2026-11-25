// Optional tiny store for the live AI-call transcript (Upstash Redis over REST; Vercel adds the variables
// automatically when you connect "Upstash for Redis" from the Vercel Marketplace).
// Without it the AI call still works end to end; only the live transcript on the agent screen is missing.
import type { RedisArg, CallEvent, Conversation, ConvMemory, SaveResult } from './types.js';

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const tok = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const storeReady = () => !!(url() && tok());

export async function cmd<T = unknown>(args: RedisArg[]): Promise<T | undefined> {
  const r = await fetch(url() as string, { method: 'POST', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const d = (await r.json().catch(() => ({}))) as { result?: T };
  return d.result;
}

export async function pushEvent(sid: string | null | undefined, ev: CallEvent) {
  if (!storeReady() || !sid) return;
  try { await cmd(['RPUSH', `call:${sid}`, JSON.stringify(ev)]); await cmd(['EXPIRE', `call:${sid}`, '7200']); } catch { /* best effort */ }
}

export async function readEvents(sid: string | null | undefined, from = 0): Promise<CallEvent[]> {
  if (!storeReady() || !sid) return [];
  try {
    const rows = await cmd<string[]>(['LRANGE', `call:${sid}`, String(from), '-1']);
    return (rows || []).map((x): CallEvent | null => { try { return JSON.parse(x); } catch { return null; } }).filter((x): x is CallEvent => !!x);
  } catch { return []; }
}

// ---- Conversation store (durable on Upstash Redis; in-memory fallback so the API still answers in a demo) ----
const mem = (): ConvMemory => {
  const g = globalThis as typeof globalThis & { __ogConv?: ConvMemory };
  return (g.__ogConv ||= { items: new Map(), order: [] });
};
export const durable = () => storeReady();

export async function saveConversation(conv: Conversation): Promise<SaveResult> {
  const id = conv.conversation_id;
  const json = JSON.stringify(conv);
  if (storeReady()) {
    const existed = await cmd(['EXISTS', `conv:${id}`]);
    await cmd(['SET', `conv:${id}`, json]);
    if (!existed) { await cmd(['LPUSH', 'convs', id]); await cmd(['LTRIM', 'convs', '0', '999']); }
    return { duplicate: !!existed };
  }
  const m = mem(); const existed = m.items.has(id);
  m.items.set(id, conv); if (!existed) { m.order.unshift(id); m.order.length = Math.min(m.order.length, 300); }
  return { duplicate: existed };
}

export async function listConversations(limit = 100): Promise<Conversation[]> {
  if (storeReady()) {
    const ids = (await cmd<string[]>(['LRANGE', 'convs', '0', String(limit - 1)])) || [];
    if (!ids.length) return [];
    const rows = (await cmd<(string | null)[]>(['MGET', ...ids.map((i) => `conv:${i}`)])) || [];
    return rows.map((x): Conversation | null => { try { return JSON.parse(x as string); } catch { return null; } }).filter((x): x is Conversation => !!x);
  }
  const m = mem();
  return m.order.slice(0, limit).map((i) => m.items.get(i)).filter((x): x is Conversation => !!x);
}
