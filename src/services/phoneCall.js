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
        if (['completed', 'failed'].includes(d.status)) return finish(answered ? 'The call finished.' : `The call could not be completed.${d.detail ? ` (${d.detail})` : ''}`);
        if (['busy', 'no-answer', 'canceled'].includes(d.status)) return finish(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call was cancelled.');
        if (!answered && Date.now() - started > 75000) return finish('Nobody picked up after 75 seconds (your phone first, then the customer).');
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
  if (!cur || cur.kind !== 'phone') return;
  if (!on) { cur.captions?.stop(); cur.captions = null; return; }
  if (!cur.captions) cur.captions = startCaptions((text) => onLine({ who: 'agent', text }));
}

export const setPhoneMuted = (muted) => { try { cur?.call?.mute(muted); } catch { /* ignore */ } };

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
  if (s.kind === 'staffphone') api('/api/telephony/hangup', { method: 'POST', body: JSON.stringify({ id: s.sid }) }).catch(() => {});
  if (s.kind === 'aiphone') api('/api/ai-call', { method: 'POST', body: JSON.stringify({ end: true, sid: s.sid }) }).catch(() => {});
}

export const stopPhoneCall = teardown;
export const isPhoneLive = () => !!cur;
