// REAL calling, browser to browser, using WebRTC through PeerJS (free public signalling server).
//  - 'human' mode: two-way live voice between the call-centre agent and a person on the /customer page.
//  - 'ai' mode:    the AI voice agent (Avani) talks to the person on the /customer page; the agent watches the live transcript.
// No backend of our own is needed: audio flows peer to peer; only the "who is calling whom" handshake uses PeerJS cloud.
import Peer from 'peerjs';
import { startWebPhoneCall, startStaffPhoneCall, startPhoneCall, startAiPhoneCall, stopPhoneCall, setPhoneMuted, setPhoneCaptions } from './phoneCall.js';

export const LINE_PREFIX = 'ogcc-';

/** Optional self-hosted PeerJS server via env vars; otherwise the free PeerJS cloud is used. */
export const peerOptions = () => {
  const env = import.meta.env;
  return env.VITE_PEER_HOST
    ? { host: env.VITE_PEER_HOST, port: Number(env.VITE_PEER_PORT || 9000), path: env.VITE_PEER_PATH || '/', secure: env.VITE_PEER_SECURE === 'true' }
    : {};
};

export const speechSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Listens on the microphone and calls onText for every finished sentence. Returns { stop }. */
export function startCaptions(onText, lang = 'en-IN', onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { stop() {} };
  let alive = true;
  const rec = new SR();
  rec.lang = lang; rec.continuous = true; rec.interimResults = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      if (e.results[i].isFinal) { const t = e.results[i][0].transcript.trim(); if (t) onText(t); }
    }
  };
  rec.onend = () => { if (alive) { try { rec.start(); } catch { /* already started */ } } };
  rec.onerror = (e) => { if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') onError?.(e.error); };
  try { rec.start(); } catch { /* ignore */ }
  return { stop() { alive = false; try { rec.stop(); } catch { /* ignore */ } } };
}

let session = null;

/**
 * Place a real call. Resolves once the customer has answered.
 * handlers: { onLine(line), onEnd(reason) }
 */
export function startLiveCall({ mode, code, phone, lead, handlers }) {
  if (mode === 'webphone') return startWebPhoneCall({ phone, handlers });
  if (mode === 'staffphone') return startStaffPhoneCall({ phone, handlers });
  if (mode === 'phone') return startPhoneCall({ phone, handlers });
  if (mode === 'aiphone') return startAiPhoneCall({ phone, lead, handlers });
  return new Promise((resolve, reject) => {
    const target = `${LINE_PREFIX}${String(code).trim()}`;
    const peer = new Peer(undefined, peerOptions());
    const s = { peer, mode, conn: null, call: null, stream: null, audio: null, captions: null, ended: false };
    session = s;
    let settled = false;
    const fail = (msg) => { if (!settled) { settled = true; stop(); reject(new Error(msg)); } };
    const ok = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
    const timer = setTimeout(() => fail('No answer — is the customer page open and showing this code?'), 30000);

    peer.on('error', (e) => fail(e.type === 'peer-unavailable' ? 'That line code was not found. Check the code on the customer page.' : `Connection problem (${e.type}). Try again.`));
    peer.on('open', async () => {
      const conn = peer.connect(target, { reliable: true });
      s.conn = conn;
      conn.on('data', (msg) => {
        if (msg.type === 'line') handlers.onLine({ who: msg.who, text: msg.text, ai: !!msg.ai });
        if (msg.type === 'accepted' && mode === 'ai') ok();
        if (msg.type === 'declined') fail('The customer declined the call.');
        if (msg.type === 'end') { handlers.onEnd('The customer hung up.'); stop(); }
      });
      conn.on('close', () => { if (!s.ended && settled) { handlers.onEnd('The line was disconnected.'); stop(); } });
      conn.on('open', async () => {
        if (mode === 'ai') {
          conn.send({ type: 'ai-call', lead: { name: lead?.name, product: lead?.product, price: lead?.price, crossSell: lead?.crossSell } });
          return;
        }
        try {
          s.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch { fail('Microphone permission is needed for a voice call.'); return; }
        conn.send({ type: 'human-call', agent: 'Meghna (Presales)', lead: { name: lead?.name } });
        const call = peer.call(target, s.stream);
        s.call = call;
        call.on('stream', (remote) => {
          s.audio = new Audio(); s.audio.srcObject = remote; s.audio.autoplay = true; s.audio.play().catch(() => {});
          ok();
        });
        call.on('close', () => { if (!s.ended) { handlers.onEnd('The customer hung up.'); stop(); } });
      });
    });

    function stop() { stopLiveCall(); }
  });
}

/** Send a small control message to the customer page (e.g. start the AI, switch transcription on/off). */
export const signal = (msg) => { try { session?.conn?.open && session.conn.send(msg); } catch { /* ignore */ } };

export const setMuted = (muted) => { setPhoneMuted(muted); session?.stream?.getAudioTracks().forEach((t) => { t.enabled = !muted; }); };

/** Turn the agent's own live captions on/off (human mode). Lines go to onLine. */
export function setAgentCaptions(on, onLine) {
  setPhoneCaptions(on, onLine);
  if (!session) return;
  if (!on) { session.captions?.stop(); session.captions = null; return; }
  if (!session.captions) session.captions = startCaptions((text) => onLine({ who: 'agent', text }));
}

export function stopLiveCall(notifyRemote = true) {
  stopPhoneCall();
  const s = session;
  if (!s || s.ended) return;
  s.ended = true; session = null;
  try { if (notifyRemote) s.conn?.open && s.conn.send({ type: 'end' }); } catch { /* ignore */ }
  s.captions?.stop();
  s.stream?.getTracks().forEach((t) => t.stop());
  if (s.audio) { s.audio.srcObject = null; }
  try { s.call?.close(); } catch { /* ignore */ }
  setTimeout(() => { try { s.peer.destroy(); } catch { /* ignore */ } }, 300);
}

export const isLive = () => !!session;
