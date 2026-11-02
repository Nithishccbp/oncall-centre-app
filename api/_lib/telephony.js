// Telephony providers for staff click-to-call: the provider rings the AGENT's phone first, then bridges to the CUSTOMER,
// showing the brand's DID as caller ID. Settings are entered in the app (Settings > Telephony) and saved server-side (Upstash);
// Vercel environment variables are only a fallback. Secrets are never sent back to the browser.
import { toE164 } from './twilio.js';
import { cmd, storeReady, pushEvent, readEvents } from './store.js';

export const PROVIDER_IDS = ['vobiz', 'plivo', 'twilio', 'exotel', 'ozonetel', 'knowlarity', 'tata', 'custom'];
const e = (k) => (process.env[k] || '').trim();
const envCfg = () => {
  const provider = (e('TEL_PROVIDER') || (e('VOBIZ_AUTH_ID') ? 'vobiz' : e('EXOTEL_SID') ? 'exotel' : e('OZONETEL_API_KEY') ? 'ozonetel' : '')).toLowerCase();
  return { provider, callerId: e('TEL_CALLER_ID') || e('VOBIZ_CALLER_ID') || e('EXOTEL_CALLER_ID'), dids: e('TEL_DIDS').split(',').map((x) => x.trim()).filter(Boolean),
    vobiz: { id: e('VOBIZ_AUTH_ID'), token: e('VOBIZ_AUTH_TOKEN'), base: e('VOBIZ_BASE') }, exotel: { sid: e('EXOTEL_SID'), key: e('EXOTEL_API_KEY'), token: e('EXOTEL_API_TOKEN'), sub: e('EXOTEL_SUBDOMAIN') },
    ozonetel: { key: e('OZONETEL_API_KEY'), user: e('OZONETEL_USERNAME'), campaign: e('OZONETEL_CAMPAIGN'), agentId: e('OZONETEL_AGENT_ID'), base: e('OZONETEL_BASE') },
    plivo: {}, twilio: {}, knowlarity: {}, tata: {}, custom: {} };
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
    ...Object.fromEntries(PROVIDER_IDS.map((k) => [k, { ...(cur[k] || {}), ...(patch[k] || {}) }])) };
  await cmd(['SET', 'tel:config', JSON.stringify(next)]);
  return next;
}
export const clearCfg = async () => { if (storeReady()) await cmd(['DEL', 'tel:config']); };

const miss = (c, k, list) => list.filter(([f]) => !(c[k] || {})[f]).map(([, label]) => label);
const NEEDS = {
  vobiz: (c) => miss(c, 'vobiz', [['id', 'Auth ID'], ['token', 'Auth Secret']]),
  plivo: (c) => miss(c, 'plivo', [['id', 'Auth ID'], ['token', 'Auth Token']]),
  twilio: (c) => miss(c, 'twilio', [['sid', 'Account SID'], ['token', 'Auth Token']]),
  exotel: (c) => miss(c, 'exotel', [['sid', 'Account SID'], ['key', 'API key'], ['token', 'API token']]),
  ozonetel: (c) => miss(c, 'ozonetel', [['key', 'API key'], ['user', 'Username'], ['campaign', 'Campaign']]),
  knowlarity: (c) => miss(c, 'knowlarity', [['key', 'API key'], ['auth', 'Authorization key'], ['number', 'Knowlarity (SR) number']]),
  tata: (c) => miss(c, 'tata', [['token', 'API token']]),
  custom: (c) => miss(c, 'custom', [['url', 'Call API URL'], ['body', 'Request body']]),
};
const HINT = { vobiz: (c) => c.vobiz.id, plivo: (c) => c.plivo.id, twilio: (c) => c.twilio.sid, exotel: (c) => c.exotel.sid, ozonetel: (c) => c.ozonetel.user, knowlarity: (c) => c.knowlarity.number, tata: () => '', custom: (c) => (c.custom.url || '').replace(/^https?:\/\//, '').slice(0, 28) };
const mask = (v) => (v && v.length > 9 ? `${v.slice(0, 4)}…${v.slice(-3)}` : v || '');
export function telConfig(c) {
  const p = c.provider; const cid = toE164(c.callerId || c.dids?.[0]);
  const missing = p && NEEDS[p] ? NEEDS[p](c) : ['Provider'];
  if (p && p !== 'ozonetel' && !cid) missing.push('Caller ID number');
  return { provider: p || 'none', ready: !!p && !!NEEDS[p] && !missing.length, missing, callerId: cid || null, dids: c.dids || [], saved: !!c.saved,
    authIdHint: p && HINT[p] ? mask(HINT[p](c) || '') : '' };
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
    // Vobiz trial accounts only allow a few parameters. Try the full request first, then drop the optional ones until it is accepted.
    const base = { from: cidOf(c), to: agentPhone, answer_url: urls.answer, answer_method: 'POST' };
    const tiers = [
      { ...base, ring_url: urls.ring, ring_method: 'POST', hangup_url: urls.hangup, hangup_method: 'POST', time_limit: 3600 },
      { ...base, ring_url: urls.ring, ring_method: 'POST', hangup_url: urls.hangup, hangup_method: 'POST' },
      { ...base, hangup_url: urls.hangup, hangup_method: 'POST' },
      base,
      { from: base.from, to: base.to, answer_url: base.answer_url },
      { to: base.to, answer_url: base.answer_url }, // no caller ID: lets the account use its own default
    ];
    let r; let d; let id; let tried = 0;
    for (const body of tiers) {
      tried += 1;
      r = await fetch(`${v.base}/api/v1/Account/${v.id}/Call/`, { method: 'POST', headers: v.h, body: JSON.stringify(body) });
      d = await j(r); id = d.request_uuid || d.call_uuid;
      if (r.ok && id) break;
      if (!/trial|disallow|limited|invalid.*param/i.test(`${d?.error || ''} ${d?.message || ''} ${d?.raw || ''}`)) break;
    }
    if (!(r.ok && id)) { const f = fail(r, d); return { ...f, error: `${f.error} (Vobiz refused all ${tried} request styles for ${agentPhone ? 'the staff phone' : 'this number'}. Caller ID used: ${base.from || 'none'})` }; }
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


// ---------- Plivo (same style as Vobiz: REST call, answer URL returns XML) ----------
const pl = (c) => ({ base: 'https://api.plivo.com', id: c.plivo.id, h: { Authorization: `Basic ${Buffer.from(`${c.plivo.id}:${c.plivo.token}`).toString('base64')}`, 'Content-Type': 'application/json' } });
const plivo = {
  async verify(c) { const v = pl(c); const r = await fetch(`${v.base}/v1/Account/${v.id}/`, { headers: v.h }); return r.status === 401 || r.status === 403 ? 'Plivo rejected the Auth ID / Auth Token.' : ''; },
  async start(c, { agentPhone, urls, ref }) {
    const v = pl(c);
    const r = await fetch(`${v.base}/v1/Account/${v.id}/Call/`, { method: 'POST', headers: v.h, body: JSON.stringify({ from: cidOf(c), to: agentPhone, answer_url: urls.answer, answer_method: 'POST', hangup_url: urls.hangup, hangup_method: 'POST' }) });
    const d = await j(r); const id = d.request_uuid;
    if (!(r.ok && id)) return fail(r, d);
    await cmd(['SET', `tel:uuid:${ref}`, id, 'EX', '7200']).catch(() => {});
    return { ok: true, id: ref };
  },
  status: (c, ref) => vobiz.status(c, ref),
  async hangup(c, ref) { const v = pl(c); const id = await cmd(['GET', `tel:uuid:${ref}`]).catch(() => ''); if (id) await fetch(`${v.base}/v1/Account/${v.id}/Request/${encodeURIComponent(id)}/`, { method: 'DELETE', headers: v.h }); },
  answerXml: (to, cid, base, ref) => vobiz.answerXml(to, cid, base, ref),
};

// ---------- Twilio (REST call to the agent, TwiML dials the customer) ----------
const tw = (c) => ({ url: `https://api.twilio.com/2010-04-01/Accounts/${c.twilio.sid}`, auth: `Basic ${Buffer.from(`${c.twilio.sid}:${c.twilio.token}`).toString('base64')}` });
const twilio = {
  async verify(c) { const t = tw(c); const r = await fetch(`${t.url}.json`, { headers: { Authorization: t.auth } }); return r.status === 401 || r.status === 403 ? 'Twilio rejected the Account SID / Auth Token.' : ''; },
  async start(c, { agentPhone, urls, ref }) {
    const t = tw(c);
    const r = await fetch(`${t.url}/Calls.json`, { method: 'POST', headers: { Authorization: t.auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: agentPhone, From: cidOf(c), Url: urls.answer, Method: 'POST', StatusCallback: urls.hangup, StatusCallbackMethod: 'POST' }).toString() });
    const d = await j(r);
    if (!(r.ok && d.sid)) return fail(r, d);
    await cmd(['SET', `tel:uuid:${ref}`, d.sid, 'EX', '7200']).catch(() => {});
    return { ok: true, id: d.sid };
  },
  async status(c, id) { const t = tw(c); const r = await fetch(`${t.url}/Calls/${encodeURIComponent(id)}.json`, { headers: { Authorization: t.auth } }); const d = await j(r); const s = norm(d.status); return { status: s === 'queued' || s === 'initiated' ? 'ringing' : s, detail: d.status }; },
  async hangup(c, id) { const t = tw(c); if (id) await fetch(`${t.url}/Calls/${encodeURIComponent(id)}.json`, { method: 'POST', headers: { Authorization: t.auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'Status=completed' }); },
  answerXml: (to, cid, base, ref) => `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${cid}" timeout="40" action="${base}/api/telephony/hook/${ref}/dialresult" method="POST"><Number>${to}</Number></Dial></Response>`,
};

// ---------- Knowlarity SuperReceptionist (click to call) ----------
const knowlarity = {
  async verify() { return ''; },
  async start(c, { agentPhone, to }) {
    const k = c.knowlarity;
    const r = await fetch('https://kpi.knowlarity.com/Basic/v1/account/call/makecall', { method: 'POST', headers: { 'x-api-key': k.key, Authorization: k.auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ k_number: k.number, agent_number: agentPhone, customer_number: to, caller_id: cidOf(c) || k.number }) });
    const d = await j(r); const id = d.success?.call_id || d.call_id || d.callId;
    return r.ok && (id || d.success) ? { ok: true, id: String(id || Date.now()) } : fail(r, d.error || d);
  },
  async status() { return { status: 'in-progress' }; },
  async hangup() {},
};

// ---------- Tata Tele Smartflo / Servetel (click to call) ----------
const tata = {
  async verify() { return ''; },
  async start(c, { agentPhone, to }) {
    const t = c.tata; const base = (t.base || 'https://api-smartflo.tatateleservices.com').replace(/\/$/, '');
    const r = await fetch(`${base}/v1/click_to_call`, { method: 'POST', headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_number: agentPhone, destination_number: to, caller_id: cidOf(c), async: 1 }) });
    const d = await j(r); const id = d.call_id || d.data?.call_id || d.ref_id || d.data?.ref_id;
    return r.ok && d.success !== false ? { ok: true, id: String(id || Date.now()) } : fail(r, d);
  },
  async status() { return { status: 'in-progress' }; },
  async hangup() {},
};

// ---------- Custom: any provider with a simple "start a call" REST API. The brand's own URL, headers and body, with placeholders. ----------
const fill = (t, v) => String(t || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (v[k] ?? ''));
const dig = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const custom = {
  async verify(c) { return /^https:\/\//i.test(c.custom.url || '') ? '' : 'The Call API URL must start with https://'; },
  async start(c, { agentPhone, to, urls, ref }) {
    const u = c.custom; const v = { agent: agentPhone, customer: to, callerId: cidOf(c) || '', answerUrl: urls.answer, hangupUrl: urls.hangup, ref };
    const headers = {};
    String(u.headers || '').split('\n').forEach((ln) => { const i = ln.indexOf(':'); if (i > 0) headers[ln.slice(0, i).trim()] = fill(ln.slice(i + 1).trim(), v); });
    const body = fill(u.body, v).trim();
    const json = body.startsWith('{') || body.startsWith('[');
    if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) headers['Content-Type'] = json ? 'application/json' : 'application/x-www-form-urlencoded';
    const r = await fetch(fill(u.url, v), { method: (u.method || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST', headers, body: (u.method || 'POST').toUpperCase() === 'GET' ? undefined : body });
    const d = await j(r);
    if (!r.ok) return fail(r, d);
    const id = (u.idPath && dig(d, u.idPath.trim())) || d.call_id || d.callId || d.request_uuid || d.uuid || d.sid || d.id || d.data?.call_id || d.data?.id;
    await cmd(['SET', `tel:uuid:${ref}`, String(id || ''), 'EX', '7200']).catch(() => {});
    return { ok: true, id: String(id || ref) };
  },
  async status() { return { status: 'in-progress' }; },
  async hangup() {},
};

const P = { vobiz, plivo, twilio, exotel, ozonetel, knowlarity, tata, custom };
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
  // Vobiz may add digits to the username we asked for, so read the real one from its answer (username field or the sip address).
  const txt = JSON.stringify(ep.d || {}); const o = ep.d?.data || ep.d?.object || ep.d?.endpoint || ep.d || {};
  const real = o.username || ep.d?.username || (txt.match(/sip:([A-Za-z0-9_.-]+)@/) || [])[1] || username;
  return { ok: true, username: real, asked: username, password, appId, steps };
}
export const adapterFor = (c) => P[c.provider];
export const answerXml = (provider, to, cid, base, ref) => (P[provider]?.answerXml || vobiz.answerXml)(to, cid, base, ref);
export const logEvent = (ref, ev, d) => pushEvent(`tel-${ref}`, { ev, t: Date.now(), d });
export const getCtx = async (ref) => { try { return JSON.parse((await cmd(['GET', `tel:ctx:${ref}`])) || 'null'); } catch { return null; } };
export const setCtx = (ref, o) => cmd(['SET', `tel:ctx:${ref}`, JSON.stringify(o), 'EX', '7200']);
export { toE164, cidOf, ended };
