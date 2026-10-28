// Telephony providers for staff click-to-call: the provider rings the AGENT's phone first, then bridges to the CUSTOMER,
// showing the brand's DID as caller ID. Settings are entered in the app (Settings > Telephony) and saved server-side (Upstash);
// Vercel environment variables are only a fallback. Secrets are never sent back to the browser.
import { toE164 } from './twilio.js';
import { cmd, storeReady } from './store.js';

const e = (k) => (process.env[k] || '').trim();
const envCfg = () => {
  const provider = (e('TEL_PROVIDER') || (e('VOBIZ_AUTH_ID') ? 'vobiz' : e('EXOTEL_SID') ? 'exotel' : e('OZONETEL_API_KEY') ? 'ozonetel' : '')).toLowerCase();
  return { provider, callerId: e('TEL_CALLER_ID') || e('VOBIZ_CALLER_ID') || e('EXOTEL_CALLER_ID'), dids: e('TEL_DIDS').split(',').map((x) => x.trim()).filter(Boolean),
    vobiz: { id: e('VOBIZ_AUTH_ID'), token: e('VOBIZ_AUTH_TOKEN'), base: e('VOBIZ_BASE') }, exotel: { sid: e('EXOTEL_SID'), key: e('EXOTEL_API_KEY'), token: e('EXOTEL_API_TOKEN'), sub: e('EXOTEL_SUBDOMAIN') },
    ozonetel: { key: e('OZONETEL_API_KEY'), user: e('OZONETEL_USERNAME'), campaign: e('OZONETEL_CAMPAIGN'), agentId: e('OZONETEL_AGENT_ID'), base: e('OZONETEL_BASE') } };
};
export async function loadCfg() {
  const base = envCfg();
  if (!storeReady()) return { ...base, saved: false };
  try { const raw = await cmd(['GET', 'tel:config']); if (raw) { const s = JSON.parse(raw); return { ...base, ...s, saved: true }; } } catch { /* fall back to env */ }
  return { ...base, saved: false };
}
export async function saveCfg(patch) {
  if (!storeReady()) throw new Error('Saving needs the Upstash Redis storage connected in Vercel (Storage tab).');
  const cur = await loadCfg();
  const next = { provider: patch.provider || cur.provider, callerId: patch.callerId ?? cur.callerId, dids: patch.dids ?? cur.dids,
    vobiz: { ...cur.vobiz, ...(patch.vobiz || {}) }, exotel: { ...cur.exotel, ...(patch.exotel || {}) }, ozonetel: { ...cur.ozonetel, ...(patch.ozonetel || {}) } };
  await cmd(['SET', 'tel:config', JSON.stringify(next)]);
  return next;
}
export const clearCfg = async () => { if (storeReady()) await cmd(['DEL', 'tel:config']); };

const NEEDS = { vobiz: (c) => [!c.vobiz.id && 'Auth ID', !c.vobiz.token && 'Auth Secret'], exotel: (c) => [!c.exotel.sid && 'Account SID', !c.exotel.key && 'API key', !c.exotel.token && 'API token'], ozonetel: (c) => [!c.ozonetel.key && 'API key', !c.ozonetel.user && 'Username', !c.ozonetel.campaign && 'Campaign'] };
export function telConfig(c) {
  const p = c.provider; const cid = toE164(c.callerId || c.dids?.[0]);
  const missing = p && NEEDS[p] ? NEEDS[p](c).filter(Boolean) : ['Provider'];
  if (p && p !== 'ozonetel' && !cid) missing.push('Caller ID number');
  return { provider: p || 'none', ready: !!p && !!NEEDS[p] && !missing.length, missing, callerId: cid || null, dids: c.dids || [], saved: !!c.saved,
    authIdHint: p === 'vobiz' && c.vobiz.id ? `${c.vobiz.id.slice(0, 4)}…${c.vobiz.id.slice(-3)}` : p === 'exotel' && c.exotel.sid ? c.exotel.sid : p === 'ozonetel' ? c.ozonetel.user : '' };
}

const ended = ['completed', 'failed', 'busy', 'no-answer', 'canceled'];
const norm = (s) => { s = String(s || '').toLowerCase().replace(/_/g, '-'); return s === 'answered' ? 'in-progress' : s === 'noanswer' || s === 'timeout' || s === 'no-response' ? 'no-answer' : s === 'cancelled' ? 'canceled' : s || 'unknown'; };
async function j(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t.slice(0, 300) }; } }
const fail = (r, d) => ({ ok: false, error: d?.error || d?.message || d?.Message || d?.raw || `${r.status} from provider`, status: r.status });
const cidOf = (c) => toE164(c.callerId || c.dids?.[0]);

// ---------- Vobiz ----------
const vb = (c) => ({ base: (c.vobiz.base || 'https://api.vobiz.ai').replace(/\/$/, ''), id: c.vobiz.id, h: { 'X-Auth-ID': c.vobiz.id, 'X-Auth-Token': c.vobiz.token, 'Content-Type': 'application/json' } });
const vobiz = {
  async verify(c) { const v = vb(c); const r = await fetch(`${v.base}/api/v1/Account/${v.id}/`, { headers: v.h }); return r.status === 401 || r.status === 403 ? 'Vobiz rejected the Auth ID / Secret.' : ''; },
  async start(c, { agentPhone, answerUrl }) {
    const v = vb(c);
    const r = await fetch(`${v.base}/api/v1/Account/${v.id}/Call/`, { method: 'POST', headers: v.h, body: JSON.stringify({ from: cidOf(c), to: agentPhone, answer_url: answerUrl, answer_method: 'POST' }) });
    const d = await j(r); const id = d.call_uuid || d.request_uuid;
    return r.ok && id ? { ok: true, id } : fail(r, d);
  },
  async status(c, id) {
    const v = vb(c);
    const r = await fetch(`${v.base}/api/v1/Account/${v.id}/Call/${encodeURIComponent(id)}`, { headers: v.h });
    if (r.status === 404) return { status: 'completed' };
    const d = await j(r); const x = d.data || d.call || d;
    const raw = x.call_status || x.CallStatus || x.status || x.call_state || x.state || x.Status || '';
    const st = norm(raw);
    // only call it connected when the provider says so (never guess): an answer time or an explicit in-progress state
    const answered = st === 'in-progress' || !!(x.answer_time || x.AnswerTime || x.answered_at);
    return { status: answered ? 'in-progress' : (['ringing', 'queued', 'initiated', 'early-media'].includes(st) ? 'ringing' : st === 'unknown' || !st ? 'ringing' : st), detail: x.hangup_cause || x.HangupCause || (raw ? '' : JSON.stringify(d).slice(0, 160)) };
  },
  async hangup(c, id) { const v = vb(c); await fetch(`${v.base}/api/v1/Account/${v.id}/Call/${encodeURIComponent(id)}`, { method: 'DELETE', headers: v.h }); },
  answerXml: (to, cid) => `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${cid}" timeout="30"><Number>${to}</Number></Dial></Response>`,
};

// ---------- Exotel (connect two numbers) ----------
const ex = (c) => ({ url: `https://${c.exotel.sub || 'api.exotel.com'}/v1/Accounts/${c.exotel.sid}`, auth: `Basic ${Buffer.from(`${c.exotel.key}:${c.exotel.token}`).toString('base64')}` });
const exotel = {
  async verify(c) { const x = ex(c); const r = await fetch(`${x.url}.json`, { headers: { Authorization: x.auth } }); return r.status === 401 || r.status === 403 ? 'Exotel rejected the SID / API key / token.' : ''; },
  async start(c, { agentPhone, to }) {
    const x = ex(c);
    const r = await fetch(`${x.url}/Calls/connect.json`, { method: 'POST', headers: { Authorization: x.auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ From: agentPhone, To: to, CallerId: cidOf(c) }).toString() });
    const d = await j(r); const id = d.Call?.Sid;
    return r.ok && id ? { ok: true, id } : fail(r, d.RestException || d);
  },
  async status(c, id) { const x = ex(c); const r = await fetch(`${x.url}/Calls/${encodeURIComponent(id)}.json`, { headers: { Authorization: x.auth } }); const d = await j(r); return { status: norm(d.Call?.Status), detail: d.Call?.Status }; },
  async hangup() {},
};

// ---------- Ozonetel CloudAgent (agent logged in to CloudAgent; manual dial) ----------
const ozonetel = {
  async verify() { return ''; },
  async start(c, { agentId, to }) {
    const o = c.ozonetel; const base = (o.base || 'https://in1-ccaas-api.ozonetel.com').replace(/\/$/, '');
    const q = new URLSearchParams({ api_key: o.key, username: o.user, agentID: agentId || o.agentId, campaignName: o.campaign, customerNumber: to.replace(/^\+91/, ''), UCID: 'true' });
    const r = await fetch(`${base}/CAServices/AgentManualDial.php?${q}`);
    const d = await j(r); const id = d.ucid || d.UCID || d.message?.match?.(/\d{10,}/)?.[0];
    return r.ok && id && !/error|fail/i.test(d.status || '') ? { ok: true, id } : fail(r, d);
  },
  async status() { return { status: 'in-progress' }; },
  async hangup() {},
};

const P = { vobiz, exotel, ozonetel };
export const adapterFor = (c) => P[c.provider];
export const answerXml = (to, cid) => vobiz.answerXml(to, cid);
export { toE164, cidOf, ended };
