// Telephony providers for staff click-to-call: the provider rings the AGENT's phone first, then bridges to the CUSTOMER,
// showing the brand's DID as caller ID. Settings are entered in the app (Settings > Telephony) and saved server-side (Upstash);
// Vercel environment variables are only a fallback. Secrets are never sent back to the browser.
import { toE164 } from './twilio.js';
import { cmd, storeReady, pushEvent, readEvents } from './store.js';

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
  async start(c, { agentPhone, urls, ref }) {
    const v = vb(c);
    const r = await fetch(`${v.base}/api/v1/Account/${v.id}/Call/`, { method: 'POST', headers: v.h, body: JSON.stringify({ from: cidOf(c), to: agentPhone, answer_url: urls.answer, answer_method: 'POST', ring_url: urls.ring, ring_method: 'POST', hangup_url: urls.hangup, hangup_method: 'POST', time_limit: 3600 }) });
    const d = await j(r); const id = d.request_uuid || d.call_uuid;
    if (!(r.ok && id)) return fail(r, d);
    await cmd(['SET', `tel:uuid:${ref}`, id, 'EX', '7200']).catch(() => {});
    return { ok: true, id: ref };
  },
  // State comes from Vobiz's own callbacks (ring / answer / hangup / dial result) that we store per call.
  async status(c, ref) {
    const ev = await readEvents(`tel-${ref}`);
    const last = (n) => [...ev].reverse().find((x) => x.ev === n);
    const text = (x) => (x ? String(x.d || '').slice(0, 200) : '');
    const dial = last('dialresult'); const hang = last('hangup');
    if (hang) return { status: last('answer') ? 'completed' : 'failed', detail: [text(dial), text(hang)].filter(Boolean).join(' | ') };
    if (dial && /busy|no-?answer|fail|cancel|reject|timeout/i.test(text(dial))) return { status: 'ringing', detail: `Customer leg: ${text(dial)}` };
    if (last('answer')) return { status: 'in-progress', detail: text(last('dial')) };
    return { status: 'ringing' };
  },
  async hangup(c, ref) { const v = vb(c); const id = await cmd(['GET', `tel:uuid:${ref}`]).catch(() => ''); if (id) await fetch(`${v.base}/api/v1/Account/${v.id}/Call/${encodeURIComponent(id)}`, { method: 'DELETE', headers: v.h }); },
  answerXml: (to, cid, base, ref) => `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${cid}" timeout="40" timeLimit="3600" action="${base}/api/telephony/hook/${ref}/dialresult" method="POST" redirect="false" callbackUrl="${base}/api/telephony/hook/${ref}/dial" callbackMethod="POST"><Number>${to}</Number></Dial></Response>`,
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
// One-click web-calling setup on the Vobiz account: find or create the application (answer URL = this app), then create a browser endpoint.
export async function vobizWebSetup(c, base, crypto) {
  const v = vb(c); const steps = []; const q = (m, path, body) => fetch(`${v.base}/api/v1/Account/${v.id}/${path}`, { method: m, headers: v.h, body: body ? JSON.stringify(body) : undefined }).then(async (r) => { const d = await j(r); steps.push({ step: `${m} ${path}`, status: r.status, body: JSON.stringify(d).slice(0, 220) }); return { ok: r.ok, d }; });
  const answer = `${base}/api/telephony/webrtc`; const hangup = `${base}/api/telephony/hook/web/hangup`; const NAME = 'Call Centre Web';
  const idOf = (d) => d.app_id || d.application_id || d.id || d.data?.app_id || d.data?.id || d.object?.app_id;
  let appId = '';
  const list = await q('GET', 'Application/');
  const found = (list.d.objects || list.d.applications || list.d.data || []).find?.((a) => (a.app_name || a.name) === NAME);
  if (found) appId = idOf(found) || found.app_id;
  if (!appId) {
    const made = await q('POST', 'Application/', { app_name: NAME, answer_url: answer, answer_method: 'POST', hangup_url: hangup, hangup_method: 'POST' });
    if (made.ok) appId = idOf(made.d);
  }
  if (!appId) return { ok: false, error: 'Vobiz did not accept the application request.', steps };
  const username = `ccweb${crypto.randomInt(100000, 999999)}`; const password = crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 14) + 'A1';
  const ep = await q('POST', 'Endpoint/', { username, password, alias: 'Call Centre Web', app_id: appId, application_id: appId });
  if (!ep.ok) return { ok: false, error: 'Vobiz did not accept the endpoint request.', steps };
  return { ok: true, username, password, appId, steps };
}
export const adapterFor = (c) => P[c.provider];
export const answerXml = (to, cid, base, ref) => vobiz.answerXml(to, cid, base, ref);
export const logEvent = (ref, ev, d) => pushEvent(`tel-${ref}`, { ev, t: Date.now(), d });
export const getCtx = async (ref) => { try { return JSON.parse((await cmd(['GET', `tel:ctx:${ref}`])) || 'null'); } catch { return null; } };
export const setCtx = (ref, o) => cmd(['SET', `tel:ctx:${ref}`, JSON.stringify(o), 'EX', '7200']);
export { toE164, cidOf, ended };
