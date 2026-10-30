// REAL phone calls, the way a call centre works: the customer is reached on their normal phone number.
//  - 'phone'   (human → phone):  the agent's browser calls the number through Twilio (WebRTC to Twilio, then the phone network).
//  - 'aiphone' (AI → phone):     our server asks Twilio to ring the number; Avani (Gemini + Twilio speech) talks to the customer.
// Secrets (Twilio keys, Gemini key) live only on the server (api/*.js, Vercel environment variables).
import { Device } from '@twilio/voice-sdk';
import { startCaptions } from './liveCall.js';

const PASS_KEY = 'og_app_passcode';
const getPass = () => { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch { return ''; } };
const setPass = (v) => { try { sessionStorage.setItem(PASS_KEY, v); } catch { /* ignore */ } };

/** fetch our own /api with the optional passcode; asks for it once if the server wants one. */
export async function api(path, opts = {}, retried = false) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-app-passcode': getPass(), ...(opts.headers || {}) } });
  if (r.status === 401 && !retried) {
    const p = window.prompt('Enter the call-centre passcode');
    if (p) { setPass(p); return api(path, opts, true); }
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error === 'passcode' ? 'Wrong passcode.' : data.error || `Server error (${r.status})`);
  return data;
}

/** Which real-calling features are switched on for this deployment. */
export async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error('no api');
    return { reachable: true, ...(await r.json()) };
  } catch { return { reachable: false, phone: false, aiPhone: false, transcripts: false, gemini: false }; }
}

/** "98765 43210" -> "+919876543210" (same rule as the server). */
export function normalizePhone(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) s = `+${s.slice(1).replace(/\+/g, '')}`;
  else if (s.startsWith('00')) s = `+${s.slice(2)}`;
  else if (s.length === 11 && s.startsWith('0')) s = `+91${s.slice(1)}`;
  else if (s.length === 10) s = `+91${s}`;
  else if (s.length === 12 && s.startsWith('91')) s = `+${s}`;
  else s = `+${s}`;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

let cur = null; // the call in progress

/** Human → phone. Resolves when the customer picks up. handlers: { onEnd(reason) }
 *  'direct' mode: the browser dials out through Twilio (needs a TwiML App).
 *  'bridge' mode (free trial): Twilio rings the customer first, then connects them to this browser. */
export async function startPhoneCall({ phone, handlers }) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const { token, identity, mode } = await api('/api/voice-token');
  const device = new Device(token, { codecPreferences: ['opus', 'pcmu'], logLevel: 'error' });
  const s = { kind: 'phone', device, call: null, captions: null, ended: false, sid: null, timer: null };
  cur = s;
  return new Promise((resolve, reject) => {
    let answered = false;
    const fail = (m) => { if (!answered) { teardown(); reject(new Error(m)); } };
    const attach = (call) => {
      s.call = call;
      call.on('accept', () => { answered = true; clearTimeout(s.timer); resolve(); });
      call.on('disconnect', () => { if (!s.ended) { if (answered) { handlers.onEnd('The call ended.'); teardown(); } else fail('The customer did not pick up (or the call was rejected).'); } });
      call.on('cancel', () => fail('The call was cancelled.'));
      call.on('reject', () => fail('The call was rejected.'));
      call.on('error', (e) => { const m = `Call problem (${e.code || 'error'}). ${e.message || ''}`; if (answered) { handlers.onEnd(m); teardown(); } else fail(m); });
    };
    device.on('error', (e) => {
      const m = e.code === 31208 || e.code === 31201 ? 'Microphone permission is needed for a voice call.'
        : e.code === 31205 || e.code === 20104 ? 'Call token expired — try again.' : `Call problem (${e.code || 'error'}). ${e.message || ''}`;
      if (answered) { handlers.onEnd(m); teardown(); } else fail(m);
    });

    if (mode === 'direct') {
      device.connect({ params: { To: to } }).then(attach).catch((e) => fail(e.message || 'Could not start the call.'));
      return;
    }
    // bridge mode: wait until this browser is registered, then ask the server to ring the customer
    device.on('incoming', (call) => { attach(call); call.accept(); });
    device.on('registered', async () => {
      try {
        const r = await api('/api/click-call', { method: 'POST', body: JSON.stringify({ to, identity }) });
        s.sid = r.sid;
        const started = Date.now();
        const poll = async () => {
          if (s.ended || answered) return;
          try {
            const d = await api(`/api/ai-call-status?sid=${s.sid}&from=0`);
            if (['busy', 'no-answer', 'canceled', 'failed'].includes(d.status)) return fail(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call could not be completed.');
          } catch { /* keep trying */ }
          if (Date.now() - started > 70000) return fail('No answer after 70 seconds.');
          s.timer = setTimeout(poll, 2000);
        };
        s.timer = setTimeout(poll, 3000);
      } catch (e) { fail(e.message || 'Could not start the call.'); }
    });
    device.register().catch((e) => fail(e.message || 'Could not connect to Twilio.'));
  });
}

export const getAgentPhone = () => { try { return localStorage.getItem('og_agent_phone') || ''; } catch { return ''; } };
export const setAgentPhone = (v) => { try { localStorage.setItem('og_agent_phone', v); } catch { /* ignore */ } };

// ---------- Web → customer (browser calls straight out through Vobiz WebRTC) ----------
const WEB_KEY = 'og_vobiz_ep';
export const getWebCreds = () => { try { return JSON.parse(localStorage.getItem(WEB_KEY) || '{}'); } catch { return {}; } };
export const setWebCreds = (c) => { try { localStorage.setItem(WEB_KEY, JSON.stringify(c)); } catch { /* ignore */ } };
const SDK_URL = 'https://unpkg.com/vobiz-webrtc-sdk@1.0.3/dist/vobiz-webrtc-sdk.min.js';
let sdkP = null; const web = { vobiz: null, cb: null, user: '', loggedIn: false };
const loadSdk = () => (sdkP ||= new Promise((res, rej) => {
  const ready = () => { const V = window.Vobiz?.default || window.Vobiz; return typeof V === 'function' ? res(V) : rej(new Error('The browser calling kit did not start.')); };
  if (window.Vobiz) return ready();
  const s = document.createElement('script'); s.src = SDK_URL; s.onload = ready;
  s.onerror = () => { sdkP = null; rej(new Error('Could not load the browser calling kit. Check the internet connection.')); };
  document.head.appendChild(s);
}));
function webClient(V) {
  if (web.vobiz) return web.vobiz.client;
  if (!document.getElementById('remoteAudio')) { const a = document.createElement('audio'); a.id = 'remoteAudio'; a.autoplay = true; document.body.appendChild(a); }
  web.vobiz = new V({ debug: 'ERROR', permOnClick: true, closeProtection: false, enableTracking: false });
  const c = web.vobiz.client;
  ['onLogin', 'onLoginFailed', 'onLogout', 'onCallAnswered', 'onCallTerminated', 'onCallFailed', 'onPermissionDenied'].forEach((ev) => c.on(ev, (...a) => {
    if (ev === 'onLogin') web.loggedIn = true; if (ev === 'onLoginFailed' || ev === 'onLogout') web.loggedIn = false;
    web.cb?.[ev]?.(...a);
  }));
  return c;
}

/** Web → customer: the browser's microphone and speaker carry the call; Vobiz dials the customer showing the brand number. */
export async function startWebPhoneCall({ phone, handlers }) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const cr = getWebCreds();
  if (!cr.u || !cr.p) throw new Error('Enter your Vobiz endpoint username and password first (see TELEPHONY_SETUP.md).');
  const V = await loadSdk(); const c = webClient(V);
  const s = { kind: 'webphone', client: c, ended: false, captions: null, timer: null };
  cur = s;
  return new Promise((resolve, reject) => {
    let answered = false;
    const fail = (m) => { if (answered) { handlers.onEnd(m); teardown(); } else { teardown(); reject(new Error(m)); } };
    const why = (x) => (typeof x === 'string' ? x : x?.reason || x?.cause || x?.description || x?.message || '');
    web.cb = {
      onLoginFailed: (x) => { if (!answered) fail(`Could not sign in to Vobiz. Check the endpoint username and password${why(x) ? ` (${why(x)})` : ''}.`); },
      onPermissionDenied: () => fail('Microphone permission is needed for a web call.'),
      onCallAnswered: () => { answered = true; clearTimeout(s.timer); resolve(); },
      onCallFailed: (x) => fail(answered ? 'The call ended.' : `The call could not be connected${why(x) ? ` (${why(x)})` : ''}.`),
      onCallTerminated: () => { if (!s.ended) fail(answered ? 'The call ended.' : 'The call ended before the customer answered.'); },
    };
    const place = () => { try { if (!c.call(to, { 'X-VH-Source': 'call-centre-web' })) fail('Could not start the call.'); } catch (e) { fail(e.message || 'Could not start the call.'); } };
    s.timer = setTimeout(() => fail('No answer after 75 seconds.'), 75000);
    if (web.loggedIn && web.user === cr.u) return place();
    const lt = setTimeout(() => { if (!web.loggedIn) fail('Could not connect to Vobiz in 15 seconds. Check the endpoint username and password, and the internet connection.'); }, 15000);
    web.cb.onLogin = () => { clearTimeout(lt); web.user = cr.u; place(); };
    try { c.login(cr.u, cr.p); } catch (e) { fail(e.message || 'Could not sign in to Vobiz.'); }
  });
}

/** Staff phone → customer through the telephony provider (Vobiz / Exotel / Ozonetel).
 *  The provider rings the AGENT's phone first, then bridges to the customer showing the brand's DID. */
export async function startStaffPhoneCall({ phone, handlers }) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const agentPhone = normalizePhone(getAgentPhone());
  const { id } = await api('/api/telephony/call', { method: 'POST', body: JSON.stringify({ to, agentPhone }) });
  const s = { kind: 'staffphone', sid: id, ended: false, timer: null };
  cur = s;
  return new Promise((resolve, reject) => {
    let answered = false; const started = Date.now();
    const finish = (reason) => { if (s.ended) return; if (answered) { handlers.onEnd(reason); teardown(); } else { teardown(); reject(new Error(reason)); } };
    const poll = async () => {
      if (s.ended) return;
      try {
        const d = await api(`/api/telephony/status?id=${encodeURIComponent(id)}`);
        if (d.status === 'in-progress' && !answered) { answered = true; resolve(); }
        if (d.detail) s.last = d.detail;
        const early = !answered && Date.now() - started < 8000; // the provider may not list a brand-new call yet
        if (['completed', 'failed'].includes(d.status) && !early) return finish(answered ? `The call ended.${s.last ? ` (${s.last})` : ''}` : `Your phone was not answered, or the provider could not connect the call.${s.last ? ` (${s.last})` : ''}`);
        if (['busy', 'no-answer', 'canceled'].includes(d.status)) return finish(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call was cancelled.');
        if (!answered && Date.now() - started > 75000) return finish(`Nobody picked up after 75 seconds (your phone first, then the customer).${s.last ? ` (${s.last})` : ''}`);
      } catch (e) { if (!answered && Date.now() - started > 15000) return finish(e.message); }
      s.timer = setTimeout(poll, 2000);
    };
    s.timer = setTimeout(poll, 2500);
  });
}

/** AI → phone. Resolves when the customer picks up. handlers: { onLine, onConsent(yes|no), onEnd } */
export async function startAiPhoneCall({ phone, lead, handlers }) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const { sid } = await api('/api/ai-call', { method: 'POST', body: JSON.stringify({ to, lead: { name: lead?.name, product: lead?.product, price: lead?.price } }) });
  const s = { kind: 'aiphone', sid, ended: false, timer: null, from: 0 };
  cur = s;
  return new Promise((resolve, reject) => {
    let answered = false;
    const started = Date.now();
    const finish = (reason) => {
      if (s.ended) return;
      if (answered) { handlers.onEnd(reason); teardown(); } else { teardown(); reject(new Error(reason)); }
    };
    const poll = async () => {
      if (s.ended) return;
      try {
        const d = await api(`/api/ai-call-status?sid=${sid}&from=${s.from}`);
        s.from = d.next;
        if (d.status === 'in-progress' && !answered) { answered = true; resolve(); }
        d.events.forEach((e) => {
          if (e.t === 'consent') handlers.onConsent(e.v);
          if (e.t === 'line') handlers.onLine({ who: e.who === 'ai' ? 'agent' : 'cust', ai: e.who === 'ai', text: e.text });
        });
        if (['completed', 'failed'].includes(d.status)) return finish(answered ? 'The call finished.' : `The call could not be completed.${d.detail ? ` (${d.detail})` : ''}`);
        if (['busy', 'no-answer', 'canceled'].includes(d.status)) return finish(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call was cancelled.');
        if (!answered && Date.now() - started > 60000) return finish('No answer after 60 seconds.');
      } catch (e) { if (!answered && Date.now() - started > 15000) return finish(e.message); }
      s.timer = setTimeout(poll, 1500);
    };
    poll();
  });
}

/** Agent's own live captions on a phone call (only used while recording consent is ON). */
export function setPhoneCaptions(on, onLine) {
  if (!cur || (cur.kind !== 'phone' && cur.kind !== 'webphone')) return;
  if (!on) { cur.captions?.stop(); cur.captions = null; return; }
  if (!cur.captions) cur.captions = startCaptions((text) => onLine({ who: 'agent', text }));
}

export const setPhoneMuted = (muted) => { try { if (cur?.kind === 'webphone') { if (muted) cur.client.mute(); else cur.client.unmute(); } else cur?.call?.mute(muted); } catch { /* ignore */ } };

function teardown() {
  const s = cur;
  if (!s || s.ended) return;
  s.ended = true; cur = null;
  clearTimeout(s.timer);
  s.captions?.stop();
  if (s.kind === 'phone') {
    try { s.call?.disconnect(); } catch { /* ignore */ }
    if (s.sid && !s.call) api('/api/click-call', { method: 'POST', body: JSON.stringify({ end: true, sid: s.sid }) }).catch(() => {});
    setTimeout(() => { try { s.device.destroy(); } catch { /* ignore */ } }, 300);
  }
  if (s.kind === 'webphone') { web.cb = null; try { s.client.hangup(); } catch { /* ignore */ } }
  if (s.kind === 'staffphone') api('/api/telephony/hangup', { method: 'POST', body: JSON.stringify({ id: s.sid }) }).catch(() => {});
  if (s.kind === 'aiphone') api('/api/ai-call', { method: 'POST', body: JSON.stringify({ end: true, sid: s.sid }) }).catch(() => {});
}

export const stopPhoneCall = teardown;
export const isPhoneLive = () => !!cur;
