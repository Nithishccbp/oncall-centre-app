// Practise a call: an AI "customer" rings the agent, the agent talks (browser speech recognition), the AI answers out loud.
// Nothing is recorded or saved except the on-screen transcript. Needs Chrome or Edge and a microphone.
let S = null;
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

const speak = (text, persona) => new Promise((resolve) => {
  const synth = window.speechSynthesis;
  if (!synth) { resolve(); return; }
  const done = () => resolve();
  try { // a failure to speak must never freeze the call
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.pitch = persona?.pitch || 1; u.rate = 1;
    const v = synth.getVoices().find((x) => /en[-_]IN/i.test(x.lang)) || synth.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    synth.cancel(); synth.speak(u);
  } catch { done(); return; }
  setTimeout(done, 5000 + text.length * 90);
});

/** Offline customer, used when the AI service is not reachable: walks through the persona's concerns. */
function localCustomer(history, persona) {
  const turns = history.filter((m) => m.role === 'agent').length;
  const last = (history.filter((m) => m.role === 'agent').pop()?.text || '').toLowerCase();
  if (/bye|goodbye|thank you for your time/.test(last)) return 'Okay, thank you. Bye. [END]';
  const c = persona.concerns || [];
  if (turns <= c.length) return turns === 1 ? `I am looking at ${persona.product}, my budget is around ${persona.budget}. I am worried about ${c[0]}.` : `Okay. Another thing, ${c[turns - 1]}. What can you tell me?`;
  if (turns === c.length + 1) return 'That makes sense. Can you send me the details on WhatsApp, and a cost sheet?';
  return 'Alright, I will go through it and get back to you. Thank you. Bye. [END]';
}

async function customerTurn(s) {
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'customer', messages: s.history, persona: s.persona }) });
    const d = await r.json();
    if (d?.reply) return d.reply;
  } catch { /* offline */ }
  return localCustomer(s.history, s.persona);
}

export function startPractice({ persona, onLine, onEnd, onError }) {
  stopPractice();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError?.('Practise a call needs Chrome or Edge with a microphone.'); return false; }
  const s = { persona, history: [], busy: true, muted: false, alive: true, endAfter: false, rec: null, spokeAt: 0 };
  S = s;

  const say = async (raw) => {
    const end = /\[END\]/i.test(raw);
    const text = raw.replace(/\[END\]/gi, '').trim();
    s.history.push({ role: 'cust', text }); onLine({ who: 'cust', text });
    await speak(text, persona);
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
  setTimeout(() => { if (s.alive) say(persona.opener); }, 900);
  return true;
}

export const practiceMute = (m) => { if (S) S.muted = !!m; };

export function stopPractice() {
  stopRing();
  const s = S; if (!s) return;
  s.alive = false; S = null;
  try { s.rec?.stop(); } catch { /* ignore */ }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
