// REAL phone calls, the way a call centre works: the customer is reached on their normal phone number.
//  - 'phone'   (human → phone):  the agent's browser calls the number through Twilio (WebRTC to Twilio, then the phone network).
//  - 'aiphone' (AI → phone):     our server asks Twilio to ring the number; Avani (Gemini + Twilio speech) talks to the customer.
// Secrets (Twilio keys, Gemini key) live only on the server (api/*.js, Vercel environment variables).
import { Device } from '@twilio/voice-sdk';
import type { Call } from '@twilio/voice-sdk';
import type { ApiOptions, TelephonyConfig, WebCreds, PhoneCallOptions, AiPhoneCallOptions, VoiceTokenResponse, CallStatusResponse, TelephonyStatusResponse, VobizCtor, VobizClientLike, VobizInstanceLike, VobizCallbacks, TranscriptLine, CaptionsHandle } from '../types/services';
import { startCaptions } from './liveCall';

const PASS_KEY = 'og_app_passcode';
const getPass = (): string => { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch { return ''; } };
const setPass = (v: string): void => { try { sessionStorage.setItem(PASS_KEY, v); } catch { /* ignore */ } };

/** fetch our own /api with the optional passcode; asks for it once if the server wants one. */
export async function api<T = any>(path: string, opts: ApiOptions = {}, retried = false): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any -- server JSON shapes differ per endpoint; callers annotate
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-app-passcode': getPass(), ...(opts.headers || {}) } });
  if (r.status === 401 && !retried) {
    const p = window.prompt('Enter the call-centre passcode');
    if (p) { setPass(p); return api(path, opts, true); }
  }
  const data = await r.json().catch(() => ({})) as { error?: string };
  if (!r.ok) throw new Error(data.error === 'passcode' ? 'Wrong passcode.' : data.error || `Server error (${r.status})`);
  return data as T;
}

/** Which real-calling features are switched on for this deployment. */
export async function loadConfig(): Promise<TelephonyConfig> {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error('no api');
    return { reachable: true, ...(await r.json() as Omit<TelephonyConfig, 'reachable'>) };
  } catch { return { reachable: false, phone: false, aiPhone: false, transcripts: false, gemini: false }; }
}

/** "98765 43210" -> "+919876543210" (same rule as the server). */
export function normalizePhone(raw: unknown): string | null {
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

interface PhoneSession {
  kind: 'phone' | 'webphone' | 'staffphone' | 'aiphone';
  ended: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  captions?: CaptionsHandle | null;
  device?: Device;
  call?: Call | null;
  sid?: string | null;
  client?: VobizClientLike;
  last?: string;
  from?: number;
}
let cur: PhoneSession | null = null; // the call in progress

/** Human → phone. Resolves when the customer picks up. handlers: { onEnd(reason) }
 *  'direct' mode: the browser dials out through Twilio (needs a TwiML App).
 *  'bridge' mode (free trial): Twilio rings the customer first, then connects them to this browser. */
export async function startPhoneCall({ phone, handlers }: PhoneCallOptions): Promise<void> {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const { token, identity, mode }: VoiceTokenResponse = await api('/api/voice-token');
  const device = new Device(token, { codecPreferences: ['opus', 'pcmu'] as unknown as Call.Codec[], logLevel: 'error' });
  const s: PhoneSession = { kind: 'phone', device, call: null, captions: null, ended: false, sid: null, timer: null };
  cur = s;
  return new Promise<void>((resolve, reject) => {
    let answered = false;
    const fail = (m: string) => { if (!answered) { teardown(); reject(new Error(m)); } };
    const attach = (call: Call) => {
      s.call = call;
      call.on('accept', () => { answered = true; clearTimeout(s.timer ?? undefined); resolve(); });
      call.on('disconnect', () => { if (!s.ended) { if (answered) { handlers.onEnd('The call ended.'); teardown(); } else fail('The customer did not pick up (or the call was rejected).'); } });
      call.on('cancel', () => fail('The call was cancelled.'));
      call.on('reject', () => fail('The call was rejected.'));
      call.on('error', (e: { code?: number; message?: string }) => { const m = `Call problem (${e.code || 'error'}). ${e.message || ''}`; if (answered) { handlers.onEnd(m); teardown(); } else fail(m); });
    };
    device.on('error', (e: { code?: number; message?: string }) => {
      const m = e.code === 31208 || e.code === 31201 ? 'Microphone permission is needed for a voice call.'
        : e.code === 31205 || e.code === 20104 ? 'Call token expired — try again.' : `Call problem (${e.code || 'error'}). ${e.message || ''}`;
      if (answered) { handlers.onEnd(m); teardown(); } else fail(m);
    });

    if (mode === 'direct') {
      device.connect({ params: { To: to } }).then(attach).catch((e: Error) => fail(e.message || 'Could not start the call.'));
      return;
    }
    // bridge mode: wait until this browser is registered, then ask the server to ring the customer
    device.on('incoming', (call: Call) => { attach(call); call.accept(); });
    device.on('registered', async () => {
      try {
        const r: { sid: string } = await api('/api/click-call', { method: 'POST', body: JSON.stringify({ to, identity }) });
        s.sid = r.sid;
        const started = Date.now();
        const poll = async () => {
          if (s.ended || answered) return;
          try {
            const d: CallStatusResponse = await api(`/api/ai-call-status?sid=${s.sid}&from=0`);
            if (['busy', 'no-answer', 'canceled', 'failed'].includes(d.status as string)) return fail(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call could not be completed.');
          } catch { /* keep trying */ }
          if (Date.now() - started > 70000) return fail('No answer after 70 seconds.');
          s.timer = setTimeout(poll, 2000);
        };
        s.timer = setTimeout(poll, 3000);
      } catch (e: any) { fail((e as Error).message || 'Could not start the call.'); }
    });
    device.register().catch((e: Error) => fail(e.message || 'Could not connect to Twilio.'));
  });
}

export const getAgentPhone = (): string => { try { return localStorage.getItem('og_agent_phone') || ''; } catch { return ''; } };
export const setAgentPhone = (v: string): void => { try { localStorage.setItem('og_agent_phone', v); } catch { /* ignore */ } };

// ---------- Web → customer (browser calls straight out through Vobiz WebRTC) ----------
const WEB_KEY = 'og_vobiz_ep';
export const getWebCreds = (): WebCreds => { try { return JSON.parse(localStorage.getItem(WEB_KEY) || '{}') as WebCreds; } catch { return {}; } };
export const setWebCreds = (c: WebCreds): void => { try { localStorage.setItem(WEB_KEY, JSON.stringify(c)); } catch { /* ignore */ } };
const SDK_URL = 'https://unpkg.com/vobiz-webrtc-sdk@1.0.3/dist/vobiz-webrtc-sdk.min.js';
let sdkP: Promise<VobizCtor> | null = null;
const web: { vobiz: VobizInstanceLike | null; cb: VobizCallbacks | null; user: string; loggedIn: boolean } = { vobiz: null, cb: null, user: '', loggedIn: false };
// The calling kit is bundled into the app (loaded only when a web call starts); the public CDN is only a fallback.
const loadSdk = (): Promise<VobizCtor> => (sdkP ||= (async (): Promise<VobizCtor> => {
  try { const m = await import(/* @vite-ignore */ ['vobiz-webrtc-sdk'][0]) as { default?: VobizCtor & { default?: VobizCtor }; Vobiz?: VobizCtor }; const V = m.default?.default || m.default || m.Vobiz; if (typeof V === 'function') return V; } catch { /* fall back to the CDN copy */ }
  await new Promise<void>((res, rej) => { if (window.Vobiz) return res(); const s = document.createElement('script'); s.src = SDK_URL; s.onload = () => res(); s.onerror = () => rej(new Error('Could not load the browser calling kit. Check the internet connection.')); document.head.appendChild(s); });
  const V = window.Vobiz?.default || window.Vobiz;
  if (typeof V !== 'function') throw new Error('The browser calling kit did not start.');
  return V as VobizCtor;
})().catch((e: unknown) => { sdkP = null; throw e; }));
function webClient(V: VobizCtor): VobizClientLike {
  if (web.vobiz) return web.vobiz.client;
  if (!document.getElementById('remoteAudio')) { const a = document.createElement('audio'); a.id = 'remoteAudio'; a.autoplay = true; document.body.appendChild(a); }
  web.vobiz = new V({ debug: 'ERROR', permOnClick: true, closeProtection: false, enableTracking: false });
  const c = web.vobiz.client;
  (['onLogin', 'onLoginFailed', 'onLogout', 'onCallAnswered', 'onCallTerminated', 'onCallFailed', 'onPermissionDenied'] as const).forEach((ev) => c.on(ev, (...a: unknown[]) => {
    if (ev === 'onLogin') web.loggedIn = true; if (ev === 'onLoginFailed' || ev === 'onLogout') web.loggedIn = false;
    web.cb?.[ev]?.(...a);
  }));
  return c;
}

/** Web → customer: the browser's microphone and speaker carry the call; Vobiz dials the customer showing the brand number. */
export async function startWebPhoneCall({ phone, handlers }: PhoneCallOptions): Promise<void> {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const cr = getWebCreds();
  const cu = cr.u; const cp = cr.p;
  if (!cu || !cp) throw new Error('Enter your Vobiz endpoint username and password first (see TELEPHONY_SETUP.md).');
  const V = await loadSdk(); const c = webClient(V);
  const s: PhoneSession = { kind: 'webphone', client: c, ended: false, captions: null, timer: null };
  cur = s;
  return new Promise<void>((resolve, reject) => {
    let answered = false;
    const fail = (m: string) => { if (answered) { handlers.onEnd(m); teardown(); } else { teardown(); reject(new Error(m)); } };
    const why = (x: unknown): string => { if (typeof x === 'string') return x; const o = x as { reason?: string; cause?: string; description?: string; message?: string } | null | undefined; return o?.reason || o?.cause || o?.description || o?.message || ''; };
    web.cb = {
      onLoginFailed: (x) => { if (!answered) fail(`Could not sign in to Vobiz. Check the endpoint username and password${why(x) ? ` (${why(x)})` : ''}.`); },
      onPermissionDenied: () => fail('Microphone permission is needed for a web call.'),
      onCallAnswered: () => { answered = true; clearTimeout(s.timer ?? undefined); resolve(); },
      onCallFailed: (x) => fail(answered ? 'The call ended.' : `The call could not be connected${why(x) ? ` (${why(x)})` : ''}.`),
      onCallTerminated: () => { if (!s.ended) fail(answered ? 'The call ended.' : 'The call ended before the customer answered.'); },
    };
    // No extra headers: Vobiz trial accounts reject them ("Invalid or disallowed parameters").
    const place = () => { try { if (!c.call(to)) fail('Could not start the call.'); } catch (e: any) { fail((e as Error).message || 'Could not start the call.'); } };
    s.timer = setTimeout(() => fail('No answer after 75 seconds.'), 75000);
    if (web.loggedIn && web.user === cu) return place();
    const lt = setTimeout(() => { if (!web.loggedIn) fail('Could not connect to Vobiz in 15 seconds. Check the endpoint username and password, and the internet connection.'); }, 15000);
    web.cb.onLogin = () => { clearTimeout(lt); web.user = cu; place(); };
    try { c.login(cu, cp); } catch (e: any) { fail((e as Error).message || 'Could not sign in to Vobiz.'); }
  });
}

/** Staff phone → customer through the telephony provider (Vobiz / Exotel / Ozonetel).
 *  The provider rings the AGENT's phone first, then bridges to the customer showing the brand's DID. */
export async function startStaffPhoneCall({ phone, handlers }: PhoneCallOptions): Promise<void> {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const agentPhone = normalizePhone(getAgentPhone());
  const { id }: { id: string } = await api('/api/telephony/call', { method: 'POST', body: JSON.stringify({ to, agentPhone }) });
  const s: PhoneSession = { kind: 'staffphone', sid: id, ended: false, timer: null };
  cur = s;
  return new Promise<void>((resolve, reject) => {
    let answered = false; const started = Date.now();
    const finish = (reason: string) => { if (s.ended) return; if (answered) { handlers.onEnd(reason); teardown(); } else { teardown(); reject(new Error(reason)); } };
    const poll = async () => {
      if (s.ended) return;
      try {
        const d: TelephonyStatusResponse = await api(`/api/telephony/status?id=${encodeURIComponent(id)}`);
        if (d.status === 'in-progress' && !answered) { answered = true; resolve(); }
        if (d.detail) s.last = d.detail;
        const early = !answered && Date.now() - started < 8000; // the provider may not list a brand-new call yet
        if (['completed', 'failed'].includes(d.status as string) && !early) return finish(answered ? `The call ended.${s.last ? ` (${s.last})` : ''}` : `Your phone was not answered, or the provider could not connect the call.${s.last ? ` (${s.last})` : ''}`);
        if (['busy', 'no-answer', 'canceled'].includes(d.status as string)) return finish(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call was cancelled.');
        if (!answered && Date.now() - started > 75000) return finish(`Nobody picked up after 75 seconds (your phone first, then the customer).${s.last ? ` (${s.last})` : ''}`);
      } catch (e: any) { if (!answered && Date.now() - started > 15000) return finish((e as Error).message); }
      s.timer = setTimeout(poll, 2000);
    };
    s.timer = setTimeout(poll, 2500);
  });
}

/** AI → phone. Resolves when the customer picks up. handlers: { onLine, onConsent(yes|no), onEnd } */
export async function startAiPhoneCall({ phone, lead, handlers }: AiPhoneCallOptions): Promise<void> {
  const to = normalizePhone(phone);
  if (!to) throw new Error('That phone number does not look right.');
  const { sid }: { sid: string } = await api('/api/ai-call', { method: 'POST', body: JSON.stringify({ to, lead: { name: lead?.name, product: lead?.product, price: lead?.price } }) });
  const s: PhoneSession = { kind: 'aiphone', sid, ended: false, timer: null, from: 0 };
  cur = s;
  return new Promise<void>((resolve, reject) => {
    let answered = false;
    const started = Date.now();
    const finish = (reason: string) => {
      if (s.ended) return;
      if (answered) { handlers.onEnd(reason); teardown(); } else { teardown(); reject(new Error(reason)); }
    };
    const poll = async () => {
      if (s.ended) return;
      try {
        const d: CallStatusResponse = await api(`/api/ai-call-status?sid=${sid}&from=${s.from}`);
        s.from = d.next;
        if (d.status === 'in-progress' && !answered) { answered = true; resolve(); }
        d.events.forEach((e) => {
          if (e.t === 'consent') handlers.onConsent?.(e.v as string);
          if (e.t === 'line') handlers.onLine?.({ who: e.who === 'ai' ? 'agent' : 'cust', ai: e.who === 'ai', text: e.text as string });
        });
        if (['completed', 'failed'].includes(d.status as string)) return finish(answered ? 'The call finished.' : `The call could not be completed.${d.detail ? ` (${d.detail})` : ''}`);
        if (['busy', 'no-answer', 'canceled'].includes(d.status as string)) return finish(d.status === 'busy' ? 'The number was busy.' : d.status === 'no-answer' ? 'No answer.' : 'The call was cancelled.');
        if (!answered && Date.now() - started > 60000) return finish('No answer after 60 seconds.');
      } catch (e: any) { if (!answered && Date.now() - started > 15000) return finish((e as Error).message); }
      s.timer = setTimeout(poll, 1500);
    };
    poll();
  });
}

/** Agent's own live captions on a phone call (only used while recording consent is ON). */
export function setPhoneCaptions(on: boolean, onLine: (line: TranscriptLine) => void): void {
  if (!cur || (cur.kind !== 'phone' && cur.kind !== 'webphone')) return;
  if (!on) { cur.captions?.stop(); cur.captions = null; return; }
  if (!cur.captions) cur.captions = startCaptions((text) => onLine({ who: 'agent', text }));
}

export const setPhoneMuted = (muted: boolean): void => { try { if (cur?.kind === 'webphone') { if (muted) cur.client?.mute(); else cur.client?.unmute(); } else cur?.call?.mute(muted); } catch { /* ignore */ } };

function teardown(): void {
  const s = cur;
  if (!s || s.ended) return;
  s.ended = true; cur = null;
  clearTimeout(s.timer ?? undefined);
  s.captions?.stop();
  if (s.kind === 'phone') {
    try { s.call?.disconnect(); } catch { /* ignore */ }
    if (s.sid && !s.call) api('/api/click-call', { method: 'POST', body: JSON.stringify({ end: true, sid: s.sid }) }).catch(() => {});
    setTimeout(() => { try { s.device?.destroy(); } catch { /* ignore */ } }, 300);
  }
  if (s.kind === 'webphone') { web.cb = null; try { s.client?.hangup(); } catch { /* ignore */ } }
  if (s.kind === 'staffphone') api('/api/telephony/hangup', { method: 'POST', body: JSON.stringify({ id: s.sid }) }).catch(() => {});
  if (s.kind === 'aiphone') api('/api/ai-call', { method: 'POST', body: JSON.stringify({ end: true, sid: s.sid }) }).catch(() => {});
}

export const stopPhoneCall: () => void = teardown;
export const isPhoneLive = (): boolean => !!cur;
