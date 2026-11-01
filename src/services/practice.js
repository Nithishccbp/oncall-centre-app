// Practise a call: an AI "customer" rings the agent, the agent talks (browser speech recognition), the AI answers out loud.
// Nothing is recorded or saved except the on-screen transcript. Needs Chrome or Edge and a microphone.
import { moodPlan, moodOpener } from '../data/practice.js';
let S = null;
const MOOD_STYLE = { angry: 'angry, sharp and frustrated, a little loud', confused: 'unsure and hesitant, speaking slowly', impatient: 'rushed and curt', worried: 'anxious and soft-spoken', friendly: 'warm and friendly' };
/** The mood right now. In a mixed call it changes every two agent turns. */
const effMood = (s) => {
  if (s.mood !== 'mixed') return s.mood;
  const t = s.history.filter((m) => m.role === 'agent').length;
  return s.plan[Math.min(s.plan.length - 1, Math.floor(Math.max(t - 1, 0) / 2))];
};
let ring = null;

export const practiceSupported = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Phone-style ring tone while the practice call "rings". */
export function startRing() {
  stopRing();
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = () => [0, 0.45].forEach((d) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 440; g.gain.value = 0.1; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.32);
    });
    beep();
    ring = { ctx, t: setInterval(beep, 2400) };
  } catch { /* no audio */ }
}
export function stopRing() { if (ring) { clearInterval(ring.t); try { ring.ctx.close(); } catch { /* ignore */ } ring = null; } }

// Natural voice from the server (Gemini speech). Falls back to the best voice the browser has.
let ctx = null; let cur = null; let ttsOk = true;
const audioCtx = () => { if (!ctx || ctx.state === 'closed') ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
async function fetchVoice(text, persona, mood) {
  if (!ttsOk) return null;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'tts', text, voice: persona?.voice || 'Kore', style: [MOOD_STYLE[mood], persona?.trait].filter(Boolean).join('; ') }) });
    const d = await r.json();
    if (!d?.audio) { if (d?.source === 'no-key') ttsOk = false; return null; }
    return d;
  } catch { return null; } finally { clearTimeout(t); }
}
function playPcm(d) {
  return new Promise((resolve) => {
    try {
      const bin = atob(d.audio); const n = bin.length >> 1;
      const c = audioCtx(); const buf = c.createBuffer(1, n, d.rate || 24000); const ch = buf.getChannelData(0);
      for (let i = 0; i < n; i += 1) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); ch[i] = (v > 32767 ? v - 65536 : v) / 32768; }
      const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination);
      src.onended = () => { cur = null; resolve(); };
      cur = src; src.start();
    } catch { resolve(); }
  });
}
const bestVoice = () => {
  const vs = window.speechSynthesis.getVoices();
  const rank = (v) => (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/en[-_]IN/i.test(v.lang) ? 3 : /^en/i.test(v.lang) ? 1 : 0);
  return [...vs].sort((x, y) => rank(y) - rank(x))[0];
};
const browserSpeak = (text, persona) => new Promise((resolve) => {
  const synth = window.speechSynthesis;
  if (!synth) { resolve(); return; }
  const done = () => resolve();
  try { // a failure to speak must never freeze the call
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.pitch = persona?.pitch || 1; u.rate = 0.97;
    const v = bestVoice();
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    synth.cancel(); synth.speak(u);
  } catch { done(); return; }
  setTimeout(done, 5000 + text.length * 90);
});
const speak = async (text, persona, mood) => {
  const d = await fetchVoice(text, persona, mood);
  if (d) { await playPcm(d); return; }
  await browserSpeak(text, persona);
};

/** Offline customer, used when the AI service is not reachable: walks through the persona's concerns. */
function localCustomer(history, persona, mood = 'friendly') {
  const turns = history.filter((m) => m.role === 'agent').length;
  const last = (history.filter((m) => m.role === 'agent').pop()?.text || '').toLowerCase();
  if (/bye|goodbye|thank you for your time/.test(last)) return 'Okay, thank you. Bye. [END]';
  const pre = { angry: 'This is not acceptable. ', confused: 'Sorry, I did not understand that. ', impatient: 'Please be quick. ', worried: 'Hmm, I am a bit worried. ' }[mood] || '';
  const c = persona.concerns || [];
  if (turns <= c.length) return pre + (turns === 1 ? `I am looking at ${persona.product}, my budget is around ${persona.budget}. I am worried about ${c[0]}.` : `Okay. Another thing, ${c[turns - 1]}. What can you tell me?`);
  if (turns === c.length + 1) return 'That makes sense. Can you send me the details on WhatsApp, and a cost sheet?';
  return 'Alright, I will go through it and get back to you. Thank you. Bye. [END]';
}

async function customerTurn(s) {
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'customer', messages: s.history, persona: s.persona, mood: effMood(s) }) });
    const d = await r.json();
    if (d?.reply) return d.reply;
  } catch { /* offline */ }
  return localCustomer(s.history, s.persona, effMood(s));
}

export function startPractice({ persona, mood = 'mixed', onLine, onEnd, onError }) {
  stopPractice();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError?.('Practise a call needs Chrome or Edge with a microphone.'); return false; }
  const s = { persona, mood, plan: moodPlan(), history: [], busy: true, muted: false, alive: true, endAfter: false, rec: null, spokeAt: 0 };
  S = s;

  const say = async (raw) => {
    const end = /\[END\]/i.test(raw);
    const text = raw.replace(/\[END\]/gi, '').trim();
    s.history.push({ role: 'cust', text }); onLine({ who: 'cust', text });
    await speak(text, persona, effMood(s));
    s.spokeAt = Date.now(); s.busy = false;
    if (end && s.alive) setTimeout(() => { if (s.alive) { stopPractice(); onEnd('The customer ended the call.'); } }, 700);
  };
  const hear = async (text) => {
    s.busy = true;
    s.history.push({ role: 'agent', text }); onLine({ who: 'agent', text });
    await say(await customerTurn(s));
  };

  const rec = new SR();
  rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      if (!e.results[i].isFinal) continue;
      const t = e.results[i][0].transcript.trim();
      if (t && s.alive && !s.busy && !s.muted && Date.now() - s.spokeAt > 600) hear(t);
    }
  };
  rec.onend = () => { if (s.alive) { try { rec.start(); } catch { /* already running */ } } };
  rec.onerror = (e) => { if (e?.error && !['no-speech', 'aborted'].includes(e.error)) onError?.(e.error === 'not-allowed' ? 'Allow the microphone for this site to practise.' : `Speech input problem (${e.error}).`); };
  s.rec = rec;
  try { rec.start(); } catch { /* ignore */ }
  setTimeout(() => { if (s.alive) say(moodOpener(mood, persona)); }, 900);
  return true;
}

export const practiceMute = (m) => { if (S) S.muted = !!m; };

export function stopPractice() {
  stopRing();
  const s = S; if (!s) return;
  s.alive = false; S = null;
  try { s.rec?.stop(); } catch { /* ignore */ }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  try { cur?.stop(); } catch { /* ignore */ }
  cur = null;
}
