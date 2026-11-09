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
const LANG_STYLE = { hi: 'speaking Hinglish, Hindi mixed with English', te: 'speaking Telugu with a few English words' };
const REC_LANG = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };
/** The language the customer speaks right now. "switch" starts in English and moves to Hindi after two agent turns. */
const effLang = (s) => (s.lang === 'switch' ? (s.history.filter((m) => m.role === 'agent').length >= 2 ? 'hi' : 'en') : (s.lang || 'en'));
const LANG_OPEN = { hi: 'Hello? Haan, maine Lakeside Towers ka ad dekha tha. Yeh sales team hai na?', te: 'Hello? Avunu, nenu Lakeside Towers ad chusanu. Idi sales team aa?' };
const START_TRUST = { friendly: 62, worried: 46, confused: 46, impatient: 40, angry: 30, mixed: 50 };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const LOSE = { en: 'Look, I do not think this is going anywhere. I will speak to someone else. Bye. [END]', hi: 'Mujhe lagta hai yeh kahin nahi ja raha. Main kisi aur se baat kar leta hoon. Bye. [END]', te: 'Idi ekkadiki podu anipistondi. Nenu inkevarithoo matladathanu. Bye. [END]' };
const WIN = { en: 'Okay, you have convinced me. Let us fix a site visit this weekend. Thank you, bye. [END]', hi: 'Theek hai, aapne mujhe convince kar diya. Is weekend site visit fix karte hain. Thank you, bye. [END]', te: 'Sare, meeru nannu convince chesaru. Ee weekend site visit fix cheddam. Thank you, bye. [END]' };
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
const FEMALE_VOICES = ['Kore', 'Aoede', 'Leda', 'Zephyr'];
const isFemale = (persona) => FEMALE_VOICES.includes(persona?.voice);
async function fetchOnce(text, persona, mood, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'tts', text, voice: persona?.voice || 'Kore', style: [MOOD_STYLE[mood], LANG_STYLE[persona?.lang], persona?.trait].filter(Boolean).join('; ') }) });
    const d = await r.json();
    if (!d?.audio) { if (d?.source === 'no-key') ttsOk = false; return null; }
    return d;
  } catch { return null; } finally { clearTimeout(t); }
}
// Try twice before giving up, so the voice does not switch part-way through a call.
async function fetchVoice(text, persona, mood) {
  if (!ttsOk) return null;
  return (await fetchOnce(text, persona, mood, 14000)) || (ttsOk ? fetchOnce(text, persona, mood, 14000) : null);
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
const MALE_RE = /ravi|prabhat|rishi|hemant|madhur|david|mark|george|james|daniel|alex|guy|ryan|male|rishabh/i;
const FEMALE_RE = /heera|kalpana|neerja|swara|zira|susan|samantha|aria|jenny|female|veena|lekha|priya|karen|moira|tessa/i;
const picked = {};
// One browser voice per customer, matching the name's gender, kept for the whole call.
const bestVoice = (persona) => {
  const key = persona?.name || 'x';
  if (picked[key]) return picked[key];
  const want = isFemale(persona) ? FEMALE_RE : MALE_RE; const avoid = isFemale(persona) ? MALE_RE : FEMALE_RE;
  const vs = window.speechSynthesis.getVoices();
  const rank = (v) => (want.test(v.name) ? 10 : 0) - (avoid.test(v.name) ? 10 : 0) + (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/en[-_]IN/i.test(v.lang) ? 3 : /^en/i.test(v.lang) ? 1 : 0);
  const v = [...vs].sort((x, y) => rank(y) - rank(x))[0];
  if (v) picked[key] = v;
  return v;
};
const browserSpeak = (text, persona) => new Promise((resolve) => {
  const synth = window.speechSynthesis;
  if (!synth) { resolve(); return; }
  const done = () => resolve();
  try { // a failure to speak must never freeze the call
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.pitch = isFemale(persona) ? Math.max(1.1, persona?.pitch || 1.1) : Math.min(0.85, persona?.pitch || 0.85); u.rate = 0.97;
    const v = bestVoice(persona);
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
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'customer', messages: s.history, persona: { ...s.persona, lang: effLang(s) }, mood: effMood(s) }) });
    const d = await r.json();
    if (d?.reply) return d.reply;
  } catch { /* offline */ }
  return localCustomer(s.history, s.persona, effMood(s));
}

/** Offline coach, used when the AI coach is not reachable. */
function localCoach(history, text, mood) {
  const t = text.toLowerCase(); const w = text.trim().split(/\s+/).length; const turns = history.filter((m) => m.role === 'agent').length;
  let d = 0; let tip = '';
  const hard = mood && !['friendly', 'mixed'].includes(mood);
  const emp = /sorry|understand|apolog|i hear|that must|samajh|kshama/.test(t);
  if (emp) d += 9;
  if (/\b(what|which|when|how|would you|do you|can i|kya|kab|enti)\b/.test(t)) d += 4;
  if (/site visit|whatsapp|cost sheet|callback|weekend|tomorrow|saturday|sunday/.test(t)) d += 9;
  if (/emi|loan|possession|rera|parking|metro|discount|warranty|price|budget/.test(t)) d += 5;
  if (w > 45) { d -= 10; tip = 'Keep it to two short sentences.'; }
  if (w < 4) d -= 4;
  if (/not possible|as i said|i told you|calm down|not my/.test(t)) d -= 15;
  if (!tip) tip = hard && !emp ? 'Acknowledge their feeling before the answer.' : turns >= 3 ? 'Offer a site visit or cost sheet now.' : 'Ask what matters most to them.';
  return { delta: Math.max(-20, Math.min(20, d)), whisper: tip };
}
async function coachFor(s, text) {
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'coach', messages: s.history, persona: s.persona, mood: effMood(s), trust: s.trust }) });
    const d = await r.json();
    if (d?.coach) return d.coach;
  } catch { /* offline */ }
  return localCoach(s.history, text, effMood(s));
}

export function startPractice({ persona, mood = 'mixed', lang = 'en', onLine, onEnd, onError, onMeter }) {
  stopPractice();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError?.('Practise a call needs Chrome or Edge with a microphone.'); return false; }
  const s = { persona, mood, lang, trust: START_TRUST[mood] ?? 50, result: null, plan: moodPlan(), history: [], busy: true, muted: false, alive: true, endAfter: false, rec: null, spokeAt: 0 };
  S = s;

  const say = async (raw) => {
    const end = /\[END\]/i.test(raw);
    const text = raw.replace(/\[END\]/gi, '').trim();
    s.history.push({ role: 'cust', text }); onLine({ who: 'cust', text });
    await speak(text, persona, effMood(s));
    s.spokeAt = Date.now(); s.busy = false;
    if (end && s.alive) setTimeout(() => { if (s.alive) { const r = s.result; stopPractice(); onEnd(r === 'won' ? 'You won the customer over!' : r === 'lost' ? 'The customer hung up. Trust ran out.' : 'The customer ended the call.', r); } }, 700);
  };
  const hear = async (text) => {
    s.busy = true;
    s.history.push({ role: 'agent', text }); onLine({ who: 'agent', text });
    const [raw, coach] = await Promise.all([customerTurn(s), coachFor(s, text)]);
    if (!s.alive) return;
    const turns = s.history.filter((m) => m.role === 'agent').length;
    s.trust = clamp(s.trust + coach.delta);
    onMeter?.({ trust: s.trust, delta: coach.delta, whisper: coach.whisper });
    // Language may have switched this turn: listen in the new language too.
    const nl = REC_LANG[effLang(s)] || 'en-IN';
    if (s.rec && s.rec.lang !== nl) { s.rec.lang = nl; try { s.rec.stop(); } catch { /* ignore */ } }
    if (s.trust <= 0 && turns >= 2) { s.result = 'lost'; await say(LOSE[effLang(s)] || LOSE.en); }
    else if (s.trust >= 100 && turns >= 3) { s.result = 'won'; await say(WIN[effLang(s)] || WIN.en); }
    else await say(raw);
  };

  const rec = new SR();
  rec.lang = REC_LANG[effLang(s)] || 'en-IN'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  // Whole sentences, not fragments: collect what the agent says and send it after a short pause (1.4 s of silence), so a mid-sentence breath does not cut the turn.
  let buf = ''; let timer = null; let lastAct = 0;
  const flush = () => {
    timer = null;
    if (!s.alive || s.busy || s.muted) { buf = ''; return; }
    if (Date.now() - lastAct < 1300) { timer = setTimeout(flush, 400); return; }
    const t = buf.replace(/\s+/g, ' ').trim(); buf = '';
    if (t.length > 1) hear(t);
  };
  rec.onresult = (e) => {
    if (!s.alive || s.busy || s.muted || Date.now() - s.spokeAt < 400) { buf = ''; return; } // the customer is talking (or thinking): ignore the speaker's echo
    lastAct = Date.now();
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      if (e.results[i].isFinal) buf += ` ${e.results[i][0].transcript}`;
    }
    if (!timer) timer = setTimeout(flush, 600);
  };
  rec.onend = () => { if (s.alive) setTimeout(() => { try { rec.start(); } catch { /* already running */ } }, 120); };
  rec.onerror = (e) => { if (e?.error && !['no-speech', 'aborted'].includes(e.error)) onError?.(e.error === 'not-allowed' ? 'Allow the microphone for this site to practise.' : `Speech input problem (${e.error}).`); };
  s.rec = rec;
  try { rec.start(); } catch { /* ignore */ }
  onMeter?.({ trust: s.trust, delta: 0, whisper: 'Pick up, greet warmly and say who you are.' });
  setTimeout(() => { if (s.alive) say(LANG_OPEN[lang] || moodOpener(mood, persona)); }, 900);
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
